// -------------------------------------------------------------------
// Server-side PDF generation for devis & factures
// jsPDF — no browser required
// -------------------------------------------------------------------

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n).replace(/\u202F/g, ' ').replace(/\u00A0/g, ' ') + ' €'
}

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

const BLUE: [number, number, number] = [37, 99, 235]
const GREEN: [number, number, number] = [16, 185, 129]

// -------------------------------------------------------------------
// Interfaces
// -------------------------------------------------------------------

interface Entreprise {
  nom?: string
  adresse?: string
  code_postal?: string
  ville?: string
  siret?: string
  telephone?: string
  email?: string
  forme_juridique?: string
  capital_social?: string
  rcs_rm?: string
  tva_intracommunautaire?: string
  assurance_nom?: string
  decennale_numero?: string
  assurance_zone?: string
  couleur_principale?: string
  logo_url?: string
  signature_base64?: string
  tampon_base64?: string
  mediateur?: string
  iban?: string
  bic?: string
}

interface Ligne {
  designation: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  taux_tva?: number
}

interface Dechets {
  nature?: string
  quantite?: string
  responsable?: string
  tri?: string
  collecte_nom?: string
  collecte_adresse?: string
  collecte_type?: string
  cout?: number
  inclure_cout?: boolean
}

export interface DevisData {
  numero: string
  date_emission?: string
  date_validite?: string
  date_debut_travaux?: string
  duree_travaux?: string
  objet?: string
  conditions_paiement?: string
  acompte_pourcent?: number
  clientNom: string
  clientAdresse?: string
  clientType?: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  lignes: Ligne[]
  entreprise: Entreprise
  dechets?: Dechets
  /** Statut du devis (signe / facture / envoye / brouillon...) — utilisé pour
   *  afficher "Bon pour accord" + date dans le cadre client si accepté */
  statut?: string
  /** Date de signature/acceptation (ISO) — affichée si statut signé */
  date_signature?: string
  /** Signature client en base64 (si dessinée par le client) — affichée à la place du texte si présente */
  client_signature_base64?: string
}

export interface FactureData {
  numero: string
  date_emission?: string
  date_echeance?: string
  date_prestation?: string
  objet?: string
  clientNom: string
  clientAdresse?: string
  clientType?: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  lignes: Ligne[]
  entreprise: Entreprise
  notes?: string
}

// -------------------------------------------------------------------
// TVA mentions automatiques
// -------------------------------------------------------------------

const TVA_MENTION_10 =
  'Je certifie, en qualité de preneur de la prestation, que les travaux réalisés concernent des locaux à usage d\'habitation achevés depuis plus de deux ans, qu\'ils n\'ont pas eu pour effet, sur une période de deux ans au plus, de concourir à la production d\'un immeuble neuf au sens du 2° du 2 du I de l\'article 257 du CGI, ni d\'entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10 %, et, le cas échéant, qu\'ils ont la nature de travaux de rénovation.'

const TVA_MENTION_5_5 =
  'Je certifie que les travaux réalisés concernent des locaux à usage d\'habitation achevés depuis plus de deux ans et constituent des travaux de rénovation ou d\'amélioration de la qualité énergétique au sens de l\'article 18 bis de l\'annexe IV du CGI (isolation thermique, systèmes de chauffage performants, énergies renouvelables).'

const TVA_MENTION_AE = 'TVA non applicable, article 293 B du Code Général des Impôts.'

function getTvaMentions(lignes: Ligne[]): string[] {
  const taux = new Set(lignes.map((l) => l.taux_tva ?? 20))
  const mentions: string[] = []
  // Auto-entrepreneur: all lines at 0%
  const allZero = lignes.length > 0 && lignes.every((l) => (l.taux_tva ?? 20) === 0)
  if (allZero) { mentions.push(TVA_MENTION_AE); return mentions }
  if (taux.has(10)) mentions.push(TVA_MENTION_10)
  if (taux.has(5.5)) mentions.push(TVA_MENTION_5_5)
  return mentions
}

function computeTvaGroups(lignes: Ligne[]): Record<number, number> {
  const groups: Record<number, number> = {}
  for (const l of lignes) {
    const rate = l.taux_tva ?? 20
    const ht = l.quantite * l.prix_unitaire_ht
    groups[rate] = (groups[rate] || 0) + ht * (rate / 100)
  }
  return groups
}

// -------------------------------------------------------------------
// Page-break helper
// -------------------------------------------------------------------

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 280) { doc.addPage(); return 20 }
  return y
}

// -------------------------------------------------------------------
// Footer légal (shared)
// -------------------------------------------------------------------

function addFooterLegal(doc: jsPDF, ent: Entreprise, y: number): number {
  y = ensureSpace(doc, y, 25)

  // Separator
  doc.setDrawColor(200)
  doc.line(14, y, 196, y)
  y += 4

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130)

  // Line 1: company identity
  const id = [
    ent.nom,
    ent.adresse ? `${ent.adresse}, ${ent.code_postal || ''} ${ent.ville || ''}`.trim() : '',
    ent.siret ? `SIRET : ${ent.siret}` : '',
    ent.rcs_rm || '',
    ent.tva_intracommunautaire ? `TVA : ${ent.tva_intracommunautaire}` : '',
  ].filter(Boolean).join(' — ')
  if (id) { doc.text(id, 105, y, { align: 'center', maxWidth: 180 }); y += 3.5 }

  // Line 2: insurance
  if (ent.assurance_nom) {
    const ins = `Assurance décennale : ${ent.assurance_nom}${ent.decennale_numero ? `, police n° ${ent.decennale_numero}` : ''}${ent.assurance_zone ? `, couverture : ${ent.assurance_zone}` : ''}`
    doc.text(ins, 105, y, { align: 'center', maxWidth: 180 })
    y += 3.5
  }

  // Line 3: contact
  const contact = [ent.telephone ? `Tél : ${ent.telephone}` : '', ent.email ? `Email : ${ent.email}` : ''].filter(Boolean).join(' — ')
  if (contact) { doc.text(contact, 105, y, { align: 'center' }); y += 3.5 }

  // Nexartis mention
  doc.setFontSize(5.5)
  doc.setTextColor(170)
  doc.text('Généré via Nexartis — nexartis.fr', 105, y + 1, { align: 'center' })

  return y + 4
}

// ===================================================================
// DEVIS PDF
// ===================================================================

export function generateDevisPdf(data: DevisData): string {
  const doc = new jsPDF()
  const ent = data.entreprise
  let y = 12
  const M = 14 // marge gauche
  const pageW = 210

  // ── HEADER : logo à gauche aligné, DEVIS centré au milieu absolu ──
  // "DEVIS" 22pt : baseline à +6, haut des majuscules ≈ +0.5
  // "N°" 9pt : baseline à +14, bas du texte ≈ +14.5
  // → Le logo occupe la zone de 0 à ~15mm (haut du D au bas du numéro)
  const titleBlockH = 18
  const titleTopY = y        // haut du bloc
  const centerX = pageW / 2  // 105mm = centre A4

  // DEVIS — gros titre centré
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('DEVIS', centerX, titleTopY + 6, { align: 'center' })

  // N° — en dessous avec un espacement confortable
  doc.setFontSize(9)
  doc.setTextColor(60)
  doc.text(`N° ${data.numero}`, centerX, titleTopY + 14, { align: 'center' })

  // Logo — à gauche, aligné du haut des lettres DEVIS au bas du numéro
  // Haut des majuscules "DEVIS" (22pt) ≈ titleTopY + 0.5
  // Bas du numéro (9pt) ≈ titleTopY + 14.5
  // → logoH ≈ 14mm, positionné à titleTopY + 0.5
  if (ent.logo_url && ent.logo_url.startsWith('data:image')) {
    try {
      const logoFormat = ent.logo_url.includes('image/png') ? 'PNG' : 'JPEG'
      const logoTopY = titleTopY + 0.5  // aligné au haut du "D" de DEVIS
      const logoH = 14                   // du haut de DEVIS au bas du numéro
      // Récupérer les dimensions réelles de l'image pour calculer le ratio
      const imgProps = doc.getImageProperties(ent.logo_url)
      const ratio = imgProps.width / imgProps.height
      let logoW = logoH * ratio
      // Limiter la largeur pour les logos très allongés (max 45mm)
      if (logoW > 45) logoW = 45
      doc.addImage(ent.logo_url, logoFormat, M, logoTopY, logoW, logoH)
    } catch { /* logo invalide, on continue sans */ }
  }

  y = titleTopY + titleBlockH + 2

  // ── TRAIT DÉGRADÉ ──
  doc.setFillColor(37, 99, 235)
  doc.rect(M, y, 91, 0.8, 'F')
  doc.setFillColor(147, 197, 253)
  doc.rect(M + 91, y, 91, 0.8, 'F')
  y += 3

  // ── DATES (1 ligne) ──
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  const dateParts: string[] = []
  dateParts.push(`Date : ${fmtDate(data.date_emission)}`)
  if (data.date_validite) dateParts.push(`Valide jusqu'au : ${fmtDate(data.date_validite)}`)
  // Pas de date de début des travaux : non pertinent côté client (peut devenir
  // obsolète si réponse tardive). Reste utile en interne pour le planning artisan.
  if (data.duree_travaux) dateParts.push(`Durée estimée : ${data.duree_travaux}`)
  doc.text(dateParts.join('    '), pageW / 2, y + 1, { align: 'center' })
  y += 5

  // ── 2 CADRES : ARTISAN + CLIENT (hauteur dynamique) ──
  const boxW = 88
  const lx = M
  const rx = M + boxW + 6
  const boxStartY = y

  // -- Contenu artisan --
  let ay = y + 4
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(37, 99, 235)
  doc.text('ARTISAN', lx + 3, ay); ay += 4
  doc.setFontSize(9)
  doc.setTextColor(26, 26, 46)
  doc.text(ent.nom || '', lx + 3, ay); ay += 3.5
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  if (ent.adresse) { doc.text(ent.adresse, lx + 3, ay); ay += 3 }
  if (ent.code_postal || ent.ville) { doc.text(`${ent.code_postal || ''} ${ent.ville || ''}`.trim(), lx + 3, ay); ay += 3 }
  if (ent.siret) { doc.text(`SIRET : ${ent.siret}`, lx + 3, ay); ay += 3 }
  if (ent.telephone) { doc.text(`Tél : ${ent.telephone}`, lx + 3, ay); ay += 3 }

  // -- Contenu client --
  let cy = y + 4
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(16, 185, 129)
  doc.text('CLIENT', rx + 3, cy); cy += 4
  doc.setFontSize(9)
  doc.setTextColor(26, 26, 46)
  doc.text(data.clientNom, rx + 3, cy); cy += 3.5
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  if (data.clientAdresse) {
    const parts = data.clientAdresse.split('|').map(s => s.trim()).filter(Boolean)
    for (const p of parts) { doc.text(p, rx + 3, cy, { maxWidth: boxW - 6 }); cy += 3 }
  }

  // Dessiner les cadres à la bonne hauteur
  const boxH = Math.max(ay - boxStartY + 2, cy - boxStartY + 2)
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.5); doc.rect(lx, boxStartY, boxW, boxH)
  doc.setDrawColor(16, 185, 129); doc.rect(rx, boxStartY, boxW, boxH)

  y = boxStartY + boxH + 3

  // ── OBJET ──
  if (data.objet) {
    doc.setFillColor(239, 246, 255)
    doc.rect(M, y, 182, 7, 'F')
    doc.setFillColor(37, 99, 235)
    doc.rect(M, y, 1, 7, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('Objet :', M + 3, y + 4.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40)
    doc.text(data.objet, M + 17, y + 4.5, { maxWidth: 162 })
    y += 10
  }

  // ── TABLE (compacte) ──
  autoTable(doc, {
    startY: y,
    head: [['N°', 'Désignation', 'Qté', 'Unité', 'Prix U. HT', 'Total HT']],
    body: data.lignes.map((l, i) => [
      String(i + 1),
      l.designation,
      String(l.quantite),
      l.unite,
      fmt(l.prix_unitaire_ht),
      fmt(l.quantite * l.prix_unitaire_ht),
    ]),
    theme: 'grid',
    headStyles: { fillColor: BLUE, fontSize: 7, font: 'helvetica', halign: 'center', textColor: [255, 255, 255], cellPadding: 1.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 },
    },
    margin: { left: M, right: M },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // ── BAS DE PAGE: 2 colonnes ────────────────────────────────────
  const leftX = 14
  const rightX = 110
  let leftY = y
  let rightY = y

  // --- COLONNE GAUCHE ---

  // ═══════════════════════════════════════════════════════════════════
  // BAS DE PAGE — Même layout que le dashboard :
  // Gauche : Conditions → Mentions légales → Déchets (petit, grisé)
  // Droite : Totaux → NET À PAYER → Signatures (2 cadres côte à côte)
  // ═══════════════════════════════════════════════════════════════════

  const FS_SMALL = 6.5   // police petite pour mentions/déchets
  const FS_BODY = 7       // police body
  const LH = 2.8          // line height compact
  const leftMaxW = 88     // largeur colonne gauche

  // --- COLONNE GAUCHE ---

  // Conditions de paiement (en premier — comme le dashboard)
  if (data.conditions_paiement) {
    doc.setFontSize(FS_BODY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 26, 46)
    doc.text('Conditions de paiement', leftX, leftY)
    leftY += 3.5
    doc.setFontSize(FS_BODY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    const splitCond = doc.splitTextToSize(data.conditions_paiement, leftMaxW)
    doc.text(splitCond, leftX, leftY)
    leftY += splitCond.length * LH + 2
  }

  // Mentions légales (petit, grisé — comme le dashboard)
  doc.setDrawColor(230)
  doc.line(leftX, leftY, leftX + leftMaxW, leftY)
  leftY += 2.5
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(160)
  doc.text('MENTIONS LÉGALES', leftX, leftY)
  leftY += 2.5
  doc.setFontSize(FS_SMALL)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150)
  if (ent.assurance_nom || ent.decennale_numero) {
    const assLine = `Assurance décennale : ${ent.assurance_nom || ''}${ent.decennale_numero ? ` — n° ${ent.decennale_numero}` : ''}${ent.assurance_zone ? ` — Zone : ${ent.assurance_zone}` : ''}`
    const assWrapped = doc.splitTextToSize(assLine, leftMaxW)
    doc.text(assWrapped, leftX, leftY); leftY += assWrapped.length * LH
  }
  doc.text('Rétractation 14 jours pour travaux hors établissement (art. L221-18 C. conso.).', leftX, leftY, { maxWidth: leftMaxW })
  leftY += 5

  // Déchets AGEC (discret, grisé, en bas — comme le dashboard)
  if (data.dechets && (data.dechets.nature || data.dechets.collecte_nom)) {
    doc.setDrawColor(230)
    doc.line(leftX, leftY, leftX + leftMaxW, leftY)
    leftY += 2.5
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(160)
    doc.text('GESTION DES DÉCHETS (AGEC)', leftX, leftY)
    leftY += 2.5
    doc.setFontSize(FS_SMALL)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150)
    // Tout sur une ligne continue avec des · comme le dashboard
    const dechParts: string[] = []
    if (data.dechets.nature) dechParts.push(`Nature : ${data.dechets.nature}`)
    if (data.dechets.responsable) dechParts.push(data.dechets.responsable)
    if (data.dechets.tri) dechParts.push(`Tri : ${data.dechets.tri}`)
    if (data.dechets.collecte_nom) dechParts.push(`Collecte : ${data.dechets.collecte_nom}${data.dechets.collecte_type ? ` (${data.dechets.collecte_type})` : ''}`)
    const dechLine = dechParts.join(' · ')
    const dechWrapped = doc.splitTextToSize(dechLine, leftMaxW)
    doc.text(dechWrapped, leftX, leftY)
    leftY += dechWrapped.length * LH + 1
  }

  // TVA mentions (attestation — petit, italique)
  const tvaMentions = getTvaMentions(data.lignes)
  if (tvaMentions.length > 0) {
    leftY += 1
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(140)
    for (const mention of tvaMentions) {
      const lines = doc.splitTextToSize(mention, leftMaxW)
      leftY = ensureSpace(doc, leftY, lines.length * 2.2 + 1)
      doc.text(lines, leftX, leftY)
      leftY += lines.length * 2.2 + 1
    }
  }

  // --- COLONNE DROITE : TOTAUX ---
  rightY = ensureSpace(doc, rightY, 50)
  const tvaGroups = computeTvaGroups(data.lignes)

  doc.setFontSize(FS_BODY)
  doc.setTextColor(100)
  doc.setFont('helvetica', 'normal')
  doc.text('Total HT', rightX, rightY)
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.montant_ht), 196, rightY, { align: 'right' })
  rightY += 4

  const sortedRates = Object.keys(tvaGroups).map(Number).sort((a, b) => a - b)
  for (const rate of sortedRates) {
    doc.setTextColor(100)
    doc.setFont('helvetica', 'normal')
    doc.text(`TVA ${rate}%`, rightX, rightY)
    doc.setTextColor(26, 26, 46)
    doc.text(fmt(tvaGroups[rate]), 196, rightY, { align: 'right' })
    rightY += 3.5
  }

  doc.setTextColor(100)
  doc.setFont('helvetica', 'normal')
  doc.text('Total TTC', rightX, rightY)
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.montant_ttc), 196, rightY, { align: 'right' })
  rightY += 5

  // NET À PAYER — bandeau bleu (comme le dashboard)
  doc.setFillColor(...BLUE)
  doc.roundedRect(rightX, rightY - 3, 86, 9, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('NET À PAYER', rightX + 3, rightY + 3)
  doc.text(fmt(data.montant_ttc), 193, rightY + 3, { align: 'right' })
  rightY += 10

  // Acompte (sous NET À PAYER)
  if (data.acompte_pourcent && data.acompte_pourcent > 0) {
    const acompteTTC = data.montant_ttc * (data.acompte_pourcent / 100)
    const resteTTC = data.montant_ttc - acompteTTC
    doc.setFontSize(FS_BODY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text(`Acompte (${data.acompte_pourcent}%) :`, rightX, rightY)
    doc.text(fmt(acompteTTC), 196, rightY, { align: 'right' })
    rightY += 3.5
    doc.setTextColor(80)
    doc.setFont('helvetica', 'normal')
    doc.text('Reste à facturer :', rightX, rightY)
    doc.text(fmt(resteTTC), 196, rightY, { align: 'right' })
    rightY += 4
  }

  // ── SIGNATURES — 2 cadres côte à côte SOUS "Net à payer" (colonne droite) ──
  // Comme le dashboard : artisan gauche, client droite, même taille
  const sigW = 42       // chaque cadre = moitié de 86 - gap
  const sigH = 18
  const sigY = rightY + 1
  const sigLeftX = rightX
  const sigRightX = rightX + sigW + 2

  // Cadre artisan
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  doc.rect(sigLeftX, sigY, sigW, sigH)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(160)
  doc.text('ARTISAN', sigLeftX + sigW / 2, sigY + 3, { align: 'center' })
  // Image signature/tampon
  const artisanVisual = ent.signature_base64 || ent.tampon_base64
  if (artisanVisual) {
    try { doc.addImage(artisanVisual, 'PNG', sigLeftX + 2, sigY + 4.5, 0, sigH - 6) } catch { /* ignore */ }
  }

  // Cadre client
  doc.rect(sigRightX, sigY, sigW, sigH)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(160)
  doc.text('CLIENT', sigRightX + sigW / 2, sigY + 3, { align: 'center' })

  // Si le devis est accepté/signé, afficher "Bon pour accord" + date,
  // ou la signature scannée si elle existe. Sinon "En attente".
  const isAccepte = data.statut === 'signe' || data.statut === 'facture'
  if (isAccepte) {
    if (data.client_signature_base64) {
      try {
        doc.addImage(data.client_signature_base64, 'PNG', sigRightX + 2, sigY + 4.5, 0, sigH - 8)
      } catch { /* ignore */ }
    } else {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 101, 52) // vert foncé (#166534)
      doc.text('Bon pour accord', sigRightX + sigW / 2, sigY + sigH / 2, { align: 'center' })
    }
    if (data.date_signature) {
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text(fmtDate(data.date_signature), sigRightX + sigW / 2, sigY + sigH - 2, { align: 'center' })
    }
  } else {
    doc.setFontSize(6)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(180)
    doc.text('En attente', sigRightX + sigW / 2, sigY + sigH / 2 + 2, { align: 'center' })
  }

  rightY = sigY + sigH + 2

  y = Math.max(leftY, rightY) + 3

  // ── FOOTER LÉGAL ───────────────────────────────────────────────
  addFooterLegal(doc, ent, y)

  return doc.output('datauristring').split(',')[1]
}

// ===================================================================
// FACTURE PDF
// ===================================================================

export function generateFacturePdf(data: FactureData): string {
  const doc = new jsPDF()
  const ent = data.entreprise
  let y = 12
  const M = 14
  const pageW = 210

  // ── HEADER : logo à gauche, FACTURE centré au milieu absolu ──
  const titleBlockH = 18
  const titleTopY = y
  const centerX = pageW / 2

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('FACTURE', centerX, titleTopY + 6, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(60)
  doc.text(`N° ${data.numero}`, centerX, titleTopY + 14, { align: 'center' })

  // Logo — aligné du haut des lettres FACTURE au bas du numéro
  if (ent.logo_url && ent.logo_url.startsWith('data:image')) {
    try {
      const logoFormat = ent.logo_url.includes('image/png') ? 'PNG' : 'JPEG'
      const logoTopY = titleTopY + 0.5
      const logoH = 14
      const imgProps = doc.getImageProperties(ent.logo_url)
      const ratio = imgProps.width / imgProps.height
      let logoW = logoH * ratio
      if (logoW > 45) logoW = 45
      doc.addImage(ent.logo_url, logoFormat, M, logoTopY, logoW, logoH)
    } catch { /* logo invalide */ }
  }

  y = titleTopY + titleBlockH + 2

  // ── TRAIT DÉGRADÉ ──
  doc.setFillColor(37, 99, 235)
  doc.rect(M, y, 91, 0.8, 'F')
  doc.setFillColor(147, 197, 253)
  doc.rect(M + 91, y, 91, 0.8, 'F')
  y += 3

  // ── DATES (1 ligne) ──
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  const dateParts: string[] = []
  dateParts.push(`Date : ${fmtDate(data.date_emission)}`)
  if (data.date_echeance) dateParts.push(`Échéance : ${fmtDate(data.date_echeance)}`)
  if (data.date_prestation) dateParts.push(`Prestation : ${fmtDate(data.date_prestation)}`)
  doc.text(dateParts.join('    '), pageW / 2, y + 1, { align: 'center' })
  y += 5

  // ── 2 CADRES : ARTISAN + CLIENT (hauteur dynamique) ──
  const boxW = 88
  const lx = M
  const rx = M + boxW + 6
  const boxStartY = y

  let ay = y + 4
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235)
  doc.text('ARTISAN', lx + 3, ay); ay += 4
  doc.setFontSize(9); doc.setTextColor(26, 26, 46)
  doc.text(ent.nom || '', lx + 3, ay); ay += 3.5
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80)
  if (ent.adresse) { doc.text(ent.adresse, lx + 3, ay); ay += 3 }
  if (ent.code_postal || ent.ville) { doc.text(`${ent.code_postal || ''} ${ent.ville || ''}`.trim(), lx + 3, ay); ay += 3 }
  if (ent.siret) { doc.text(`SIRET : ${ent.siret}`, lx + 3, ay); ay += 3 }
  if (ent.telephone) { doc.text(`Tél : ${ent.telephone}`, lx + 3, ay); ay += 3 }

  let cy = y + 4
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129)
  doc.text('CLIENT', rx + 3, cy); cy += 4
  doc.setFontSize(9); doc.setTextColor(26, 26, 46)
  doc.text(data.clientNom, rx + 3, cy); cy += 3.5
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80)
  if (data.clientAdresse) {
    const parts = data.clientAdresse.split('|').map(s => s.trim()).filter(Boolean)
    for (const p of parts) { doc.text(p, rx + 3, cy, { maxWidth: boxW - 6 }); cy += 3 }
  }

  const boxH = Math.max(ay - boxStartY + 2, cy - boxStartY + 2)
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.5); doc.rect(lx, boxStartY, boxW, boxH)
  doc.setDrawColor(16, 185, 129); doc.rect(rx, boxStartY, boxW, boxH)

  y = boxStartY + boxH + 3

  // ── OBJET ──
  if (data.objet) {
    doc.setFillColor(239, 246, 255)
    doc.rect(M, y, 182, 7, 'F')
    doc.setFillColor(37, 99, 235)
    doc.rect(M, y, 1, 7, 'F')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235)
    doc.text('Objet :', M + 3, y + 4.5)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40)
    doc.text(data.objet, M + 17, y + 4.5, { maxWidth: 162 })
    y += 10
  }

  // ── TABLE (compacte) ──
  autoTable(doc, {
    startY: y,
    head: [['N°', 'Désignation', 'Qté', 'Unité', 'Prix U. HT', 'Total HT']],
    body: data.lignes.map((l, i) => [
      String(i + 1),
      l.designation,
      String(l.quantite),
      l.unite,
      fmt(l.prix_unitaire_ht),
      fmt(l.quantite * l.prix_unitaire_ht),
    ]),
    theme: 'grid',
    headStyles: { fillColor: BLUE, fontSize: 7, font: 'helvetica', halign: 'center', textColor: [255, 255, 255], cellPadding: 1.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 },
    },
    margin: { left: M, right: M },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // ── BAS DE PAGE: 2 colonnes (identique au devis) ──────────────
  const leftX = 14
  const rightX = 110
  let leftY = y
  let rightY = y

  // --- COLONNE GAUCHE (compact, même style que devis) ---
  const FS_SMALL = 6.5
  const FS_BODY = 7
  const LH = 2.8
  const leftMaxW = 88

  if (data.notes) {
    doc.setFontSize(FS_BODY); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 46)
    doc.text('Conditions de paiement', leftX, leftY); leftY += 3.5
    doc.setFontSize(FS_BODY); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
    const splitCond = doc.splitTextToSize(data.notes, leftMaxW)
    doc.text(splitCond, leftX, leftY); leftY += splitCond.length * LH + 2
  }

  // Pénalités de retard (petit, grisé)
  doc.setDrawColor(230); doc.line(leftX, leftY, leftX + leftMaxW, leftY); leftY += 2.5
  doc.setFontSize(FS_SMALL); doc.setTextColor(150); doc.setFont('helvetica', 'normal')
  doc.text('Pénalités de retard : 3x le taux d\'intérêt légal en vigueur.', leftX, leftY); leftY += LH
  if (data.clientType === 'professionnel') {
    doc.text('Indemnité forfaitaire recouvrement : 40 €.', leftX, leftY); leftY += LH
  }
  doc.text('Escompte pour paiement anticipé : néant.', leftX, leftY); leftY += LH + 1

  // TVA mentions
  const tvaMentions = getTvaMentions(data.lignes)
  if (tvaMentions.length > 0) {
    doc.setFontSize(5.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(140)
    for (const mention of tvaMentions) {
      const lines = doc.splitTextToSize(mention, leftMaxW)
      leftY = ensureSpace(doc, leftY, lines.length * 2.2 + 1)
      doc.text(lines, leftX, leftY); leftY += lines.length * 2.2 + 1
    }
  }

  // --- COLONNE DROITE: TOTAUX (compact) ---
  rightY = ensureSpace(doc, rightY, 40)
  const tvaGroups = computeTvaGroups(data.lignes)

  doc.setFontSize(FS_BODY)
  doc.setTextColor(100); doc.setFont('helvetica', 'normal')
  doc.text('Total HT', rightX, rightY)
  doc.setTextColor(26, 26, 46); doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.montant_ht), 196, rightY, { align: 'right' }); rightY += 4

  const sortedRates = Object.keys(tvaGroups).map(Number).sort((a, b) => a - b)
  for (const rate of sortedRates) {
    doc.setTextColor(100); doc.setFont('helvetica', 'normal')
    doc.text(`TVA ${rate}%`, rightX, rightY)
    doc.setTextColor(26, 26, 46)
    doc.text(fmt(tvaGroups[rate]), 196, rightY, { align: 'right' }); rightY += 3.5
  }

  doc.setTextColor(100); doc.setFont('helvetica', 'normal')
  doc.text('Total TTC', rightX, rightY)
  doc.setTextColor(26, 26, 46); doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.montant_ttc), 196, rightY, { align: 'right' }); rightY += 5

  // NET À PAYER banner
  doc.setFillColor(...BLUE)
  doc.roundedRect(rightX, rightY - 3, 86, 9, 1.5, 1.5, 'F')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
  doc.text('NET À PAYER', rightX + 3, rightY + 3)
  doc.text(fmt(data.montant_ttc), 193, rightY + 3, { align: 'right' }); rightY += 12

  y = Math.max(leftY, rightY) + 3

  // ── PAS DE SIGNATURES SUR FACTURE (différence avec devis) ─────

  // ── COORDONNÉES BANCAIRES (encart "Pour régler par virement") ─
  // Affiché UNIQUEMENT si l'IBAN est renseigné dans le profil entreprise.
  // Position : bas-gauche, encadré gris clair, format IBAN avec espaces tous les 4 car.
  if (ent.iban && ent.iban.trim()) {
    y = ensureSpace(doc, y, 22)
    const ribX = 14
    const ribW = 100
    const ribH = 18
    // Cadre gris clair
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(248, 250, 252)
    doc.setLineWidth(0.3)
    doc.roundedRect(ribX, y, ribW, ribH, 1.5, 1.5, 'FD')
    // Label
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('POUR RÉGLER PAR VIREMENT', ribX + 3, y + 4)
    // IBAN formaté avec espaces tous les 4 caractères (lisibilité)
    const ibanClean = ent.iban.replace(/\s+/g, '').toUpperCase()
    const ibanFormatted = ibanClean.match(/.{1,4}/g)?.join(' ') || ibanClean
    doc.setFontSize(8.5)
    doc.setFont('courier', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`IBAN : ${ibanFormatted}`, ribX + 3, y + 9)
    // BIC en dessous (si renseigné)
    if (ent.bic && ent.bic.trim()) {
      doc.setFontSize(7.5)
      doc.text(`BIC : ${ent.bic.trim().toUpperCase()}`, ribX + 3, y + 13)
    }
    // Bénéficiaire (nom de l'entreprise)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(107, 114, 128)
    doc.text(`Bénéficiaire : ${ent.nom || ''}`, ribX + 3, y + 16.5)
    y += ribH + 4
  }

  // ── MENTION LÉGALE FACTURE ────────────────────────────────────
  y = ensureSpace(doc, y, 8)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(107, 114, 128)
  doc.text('Facture émise conformément aux articles L441-3 et suivants du Code de commerce.', 14, y, { maxWidth: 182 })
  y += 6

  // ── FOOTER LÉGAL ──────────────────────────────────────────────
  addFooterLegal(doc, ent, y)

  return doc.output('datauristring').split(',')[1]
}
