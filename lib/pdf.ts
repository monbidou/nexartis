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
}

interface Ligne {
  designation: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  taux_tva?: number
}

interface Dechets {
  type_dechets?: string
  point_collecte?: string
  volume_m3?: number
  cout_ttc_m3?: number
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
}

export interface FactureData {
  numero: string
  date_emission?: string
  date_echeance?: string
  date_prestation?: string
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
  let y = 14

  // ── HEADER ──────────────────────────────────────────────────────
  // Left: logo placeholder / company name
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 26, 58)
  doc.text(ent.nom || 'Mon Entreprise', 14, y + 6)

  // Right: DEVIS title
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('DEVIS', 196, y + 4, { align: 'right' })
  doc.setFontSize(11)
  doc.setTextColor(60)
  doc.text(`N° ${data.numero}`, 196, y + 11, { align: 'right' })
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(fmtDate(data.date_emission), 196, y + 16, { align: 'right' })

  y += 20

  // ── GRADIENT LINE ──────────────────────────────────────────────
  // Simulate gradient with 2 rects
  const gradW = 182
  doc.setFillColor(37, 99, 235)
  doc.rect(14, y, gradW / 2, 1.2, 'F')
  doc.setFillColor(147, 197, 253)
  doc.rect(14 + gradW / 2, y, gradW / 2, 1.2, 'F')
  y += 5

  // ── 2 CADRES: ARTISAN + CLIENT ─────────────────────────────────
  const boxH = 38
  const boxW = 86
  const lx = 14
  const rx = 14 + boxW + 10

  // Artisan box
  doc.setDrawColor(37, 99, 235)
  doc.setLineWidth(0.8)
  doc.line(lx, y, lx + boxW, y) // top border blue
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  doc.rect(lx, y, boxW, boxH)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(37, 99, 235)
  doc.text('ARTISAN', lx + 4, y + 5)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 26, 46)
  doc.text(ent.nom || '', lx + 4, y + 10)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  let ay = y + 14
  if (ent.adresse) { doc.text(ent.adresse, lx + 4, ay); ay += 3.2 }
  if (ent.code_postal || ent.ville) { doc.text(`${ent.code_postal || ''} ${ent.ville || ''}`.trim(), lx + 4, ay); ay += 3.2 }
  if (ent.forme_juridique) { doc.text(ent.forme_juridique, lx + 4, ay); ay += 3.2 }
  if (ent.siret) { doc.text(`SIRET : ${ent.siret}`, lx + 4, ay); ay += 3.2 }
  if (ent.tva_intracommunautaire) { doc.text(`TVA : ${ent.tva_intracommunautaire}`, lx + 4, ay); ay += 3.2 }
  if (ent.telephone) { doc.text(`Tél : ${ent.telephone}`, lx + 4, ay); ay += 3.2 }
  if (ent.email) { doc.text(ent.email, lx + 4, ay) }

  // Client box
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(0.8)
  doc.line(rx, y, rx + boxW, y)
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  doc.rect(rx, y, boxW, boxH)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(16, 185, 129)
  doc.text('CLIENT', rx + 4, y + 5)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 26, 46)
  doc.text(data.clientNom, rx + 4, y + 10)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  let cy = y + 14
  if (data.clientAdresse) { doc.text(data.clientAdresse, rx + 4, cy, { maxWidth: boxW - 8 }); cy += 6 }
  const typeLabel = data.clientType === 'professionnel' ? 'Professionnel' : 'Particulier'
  doc.setFontSize(7)
  doc.setTextColor(120)
  doc.text(typeLabel, rx + 4, y + boxH - 3)

  y += boxH + 5

  // ── 4 META CASES ───────────────────────────────────────────────
  const metaItems: [string, string][] = [
    ['Date du devis', fmtDate(data.date_emission)],
    ['Date de validité', fmtDate(data.date_validite)],
    ['Début travaux', fmtDate(data.date_debut_travaux) || '—'],
    ['Durée estimée', data.duree_travaux || '—'],
  ]
  const caseW = (182 - 9) / 4
  metaItems.forEach(([label, value], i) => {
    const cx = 14 + i * (caseW + 3)
    doc.setFillColor(248, 250, 255)
    doc.setDrawColor(219, 234, 254)
    doc.roundedRect(cx, y, caseW, 14, 1, 1, 'FD')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(130)
    doc.text(label, cx + 3, y + 5)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text(value || '—', cx + 3, y + 11)
  })
  y += 19

  // ── OBJET ──────────────────────────────────────────────────────
  if (data.objet) {
    doc.setFillColor(239, 246, 255)
    doc.rect(14, y, 182, 10, 'F')
    doc.setFillColor(37, 99, 235)
    doc.rect(14, y, 1.2, 10, 'F') // left accent
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text('Objet :', 19, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40)
    doc.text(data.objet, 34, y + 4, { maxWidth: 158 })
    y += 14
  }

  // ── TABLE ──────────────────────────────────────────────────────
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
    headStyles: { fillColor: BLUE, fontSize: 7.5, font: 'helvetica', halign: 'center', textColor: [255, 255, 255] },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // ── BAS DE PAGE: 2 colonnes ────────────────────────────────────
  const leftX = 14
  const rightX = 110
  let leftY = y
  let rightY = y

  // --- COLONNE GAUCHE ---

  // Déchets
  if (data.dechets && (data.dechets.type_dechets || data.dechets.volume_m3)) {
    leftY = ensureSpace(doc, leftY, 25)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text('Gestion des déchets', leftX, leftY)
    leftY += 4
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    if (data.dechets.type_dechets) { doc.text(`Type : ${data.dechets.type_dechets}`, leftX, leftY); leftY += 3.2 }
    if (data.dechets.point_collecte) { doc.text(`Point de collecte : ${data.dechets.point_collecte}`, leftX, leftY); leftY += 3.2 }
    if (data.dechets.volume_m3) { doc.text(`Volume estimé : ${data.dechets.volume_m3} m³`, leftX, leftY); leftY += 3.2 }
    if (data.dechets.cout_ttc_m3 !== undefined) { doc.text(`Coût : ${fmt(data.dechets.cout_ttc_m3)} TTC/m³`, leftX, leftY); leftY += 3.2 }
    leftY += 3
  }

  // Conditions de paiement
  if (data.conditions_paiement) {
    leftY = ensureSpace(doc, leftY, 15)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text('Conditions de paiement', leftX, leftY)
    leftY += 4
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    const splitCond = doc.splitTextToSize(data.conditions_paiement, 88)
    doc.text(splitCond, leftX, leftY)
    leftY += splitCond.length * 3.2
    leftY += 2
  }

  // Acompte (left column)
  if (data.acompte_pourcent && data.acompte_pourcent > 0) {
    const acompteTTC = data.montant_ttc * (data.acompte_pourcent / 100)
    const resteTTC = data.montant_ttc - acompteTTC
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(37, 99, 235)
    doc.text(`Acompte (${data.acompte_pourcent}%) : ${fmt(acompteTTC)}`, leftX, leftY)
    leftY += 3.5
    doc.text(`Reste à facturer : ${fmt(resteTTC)}`, leftX, leftY)
    leftY += 5
  }

  // Pénalités (pro only)
  if (data.clientType === 'professionnel') {
    leftY = ensureSpace(doc, leftY, 12)
    doc.setFontSize(6.5)
    doc.setTextColor(120)
    doc.setFont('helvetica', 'normal')
    doc.text('Pénalités de retard : 3x le taux d\'intérêt légal (7,86% en 2026)', leftX, leftY)
    leftY += 3
    doc.text('Indemnité forfaitaire pour frais de recouvrement : 40 €', leftX, leftY)
    leftY += 4
  }

  // TVA mentions
  const tvaMentions = getTvaMentions(data.lignes)
  if (tvaMentions.length > 0) {
    leftY = ensureSpace(doc, leftY, 15)
    doc.setDrawColor(200)
    doc.line(leftX, leftY, leftX + 88, leftY)
    leftY += 3
    doc.setFontSize(6)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(107, 114, 128)
    for (const mention of tvaMentions) {
      const lines = doc.splitTextToSize(mention, 88)
      leftY = ensureSpace(doc, leftY, lines.length * 2.5 + 2)
      doc.text(lines, leftX, leftY)
      leftY += lines.length * 2.5 + 2
    }
  }

  // --- COLONNE DROITE: TOTAUX ---
  rightY = ensureSpace(doc, rightY, 50)

  // TVA detail per rate
  const tvaGroups = computeTvaGroups(data.lignes)
  doc.setFontSize(8)

  doc.setTextColor(100)
  doc.setFont('helvetica', 'normal')
  doc.text('Total HT', rightX, rightY)
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.montant_ht), 196, rightY, { align: 'right' })
  rightY += 5

  // Each TVA rate
  const sortedRates = Object.keys(tvaGroups).map(Number).sort((a, b) => a - b)
  for (const rate of sortedRates) {
    doc.setTextColor(100)
    doc.setFont('helvetica', 'normal')
    doc.text(`TVA ${rate}%`, rightX, rightY)
    doc.setTextColor(26, 26, 46)
    doc.text(fmt(tvaGroups[rate]), 196, rightY, { align: 'right' })
    rightY += 4.5
  }

  doc.setTextColor(100)
  doc.setFont('helvetica', 'normal')
  doc.text('Total TTC', rightX, rightY)
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.montant_ttc), 196, rightY, { align: 'right' })
  rightY += 7

  // NET À PAYER banner
  doc.setFillColor(...BLUE)
  doc.roundedRect(rightX, rightY - 4, 86, 11, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('NET À PAYER', rightX + 4, rightY + 3)
  doc.text(fmt(data.montant_ttc), 192, rightY + 3, { align: 'right' })
  rightY += 14

  // Acompte lines (right)
  if (data.acompte_pourcent && data.acompte_pourcent > 0) {
    const acompteTTC = data.montant_ttc * (data.acompte_pourcent / 100)
    const resteTTC = data.montant_ttc - acompteTTC
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text(`Acompte (${data.acompte_pourcent}%) :`, rightX, rightY)
    doc.text(fmt(acompteTTC), 196, rightY, { align: 'right' })
    rightY += 4.5
    doc.setTextColor(80)
    doc.setFont('helvetica', 'normal')
    doc.text('Reste à facturer :', rightX, rightY)
    doc.text(fmt(resteTTC), 196, rightY, { align: 'right' })
    rightY += 6
  }

  y = Math.max(leftY, rightY) + 6

  // ── SIGNATURES ─────────────────────────────────────────────────
  y = ensureSpace(doc, y, 30)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60)
  doc.text('Signature artisan', 14, y)
  doc.text('Bon pour accord — Signature client', 110, y)
  y += 3
  // Signature zones
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  doc.rect(14, y, 86, 22)
  doc.rect(110, y, 86, 22)
  // Date line in client zone
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150)
  doc.text('Date : ....../....../..........', 114, y + 18)
  y += 26

  // ── MENTION LÉGALE : devis reçu avant exécution ────────────────
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(107, 114, 128)
  doc.text('Devis reçu avant l\'exécution des travaux. Le client reconnaît avoir pris connaissance des conditions ci-dessus.', 14, y, { maxWidth: 182 })
  y += 5

  // ── MENTION LÉGALE : droit de rétractation 14 jours ────────────
  y = ensureSpace(doc, y, 12)
  doc.text('En cas de démarchage à domicile ou hors établissement, le client dispose d\'un droit de rétractation de 14 jours', 14, y, { maxWidth: 182 })
  y += 3
  doc.text('à compter de la signature du présent devis (articles L221-18 et suivants du Code de la consommation).', 14, y, { maxWidth: 182 })
  y += 6

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
  let y = 14

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 26, 58)
  doc.text(ent.nom || 'Mon Entreprise', 14, y + 6)

  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('FACTURE', 196, y + 4, { align: 'right' })
  doc.setFontSize(11)
  doc.setTextColor(60)
  doc.text(`N° ${data.numero}`, 196, y + 11, { align: 'right' })
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(fmtDate(data.date_emission), 196, y + 16, { align: 'right' })
  y += 20

  // Gradient line
  doc.setFillColor(37, 99, 235)
  doc.rect(14, y, 91, 1.2, 'F')
  doc.setFillColor(147, 197, 253)
  doc.rect(105, y, 91, 1.2, 'F')
  y += 5

  // 2 boxes
  const boxH = 34
  const boxW = 86
  const lx = 14
  const rx = 14 + boxW + 10

  doc.setDrawColor(37, 99, 235)
  doc.setLineWidth(0.8)
  doc.line(lx, y, lx + boxW, y)
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  doc.rect(lx, y, boxW, boxH)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('ÉMETTEUR', lx + 4, y + 5)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 26, 46)
  doc.text(ent.nom || '', lx + 4, y + 10)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  let ey = y + 14
  if (ent.forme_juridique) { doc.text(ent.forme_juridique, lx + 4, ey); ey += 3.2 }
  if (ent.adresse) { doc.text(ent.adresse, lx + 4, ey); ey += 3.2 }
  if (ent.code_postal || ent.ville) { doc.text(`${ent.code_postal || ''} ${ent.ville || ''}`.trim(), lx + 4, ey); ey += 3.2 }
  if (ent.siret) { doc.text(`SIRET : ${ent.siret}`, lx + 4, ey); ey += 3.2 }
  if (ent.telephone) { doc.text(`Tél : ${ent.telephone}`, lx + 4, ey) }

  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.8)
  doc.line(rx, y, rx + boxW, y)
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  doc.rect(rx, y, boxW, boxH)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GREEN)
  doc.text('FACTURÉ À', rx + 4, y + 5)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 26, 46)
  doc.text(data.clientNom, rx + 4, y + 10)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  if (data.clientAdresse) { doc.text(data.clientAdresse, rx + 4, y + 14, { maxWidth: boxW - 8 }) }

  y += boxH + 4

  // Meta: Date + Échéance + Date prestation
  {
    const metaItems: [string, string][] = [
      ['Date de facture', fmtDate(data.date_emission)],
      ['Échéance', fmtDate(data.date_echeance) || '\u2014'],
    ]
    if (data.date_prestation) metaItems.push(['Date prestation', fmtDate(data.date_prestation)])
    const caseW = metaItems.length === 3 ? 56 : 86
    const gap = metaItems.length === 3 ? 7 : 10
    metaItems.forEach(([label, value], i) => {
      const cx = 14 + i * (caseW + gap)
      doc.setFillColor(248, 250, 255)
      doc.setDrawColor(219, 234, 254)
      doc.roundedRect(cx, y, caseW, 12, 1, 1, 'FD')
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(130)
      doc.text(label, cx + 3, y + 4.5)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text(value || '—', cx + 3, y + 10)
    })
    y += 16
  }

  // Table
  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Qté', 'Unité', 'Prix U. HT', 'Total HT']],
    body: data.lignes.map((l) => [
      l.designation,
      String(l.quantite),
      l.unite,
      fmt(l.prix_unitaire_ht),
      fmt(l.quantite * l.prix_unitaire_ht),
    ]),
    theme: 'grid',
    headStyles: { fillColor: BLUE, fontSize: 7.5, font: 'helvetica', textColor: [255, 255, 255] },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    margin: { left: 14, right: 14 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  // Totals (right-aligned)
  const tvaGroups = computeTvaGroups(data.lignes)
  const tx = 130
  doc.setFontSize(8)

  doc.setTextColor(100)
  doc.setFont('helvetica', 'normal')
  doc.text('Total HT', tx, y)
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.montant_ht), 196, y, { align: 'right' })
  y += 5

  for (const rate of Object.keys(tvaGroups).map(Number).sort((a, b) => a - b)) {
    doc.setTextColor(100)
    doc.setFont('helvetica', 'normal')
    doc.text(`TVA ${rate}%`, tx, y)
    doc.setTextColor(26, 26, 46)
    doc.text(fmt(tvaGroups[rate]), 196, y, { align: 'right' })
    y += 4.5
  }

  doc.setTextColor(100)
  doc.setFont('helvetica', 'normal')
  doc.text('Total TTC', tx, y)
  doc.setTextColor(26, 26, 46)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(data.montant_ttc), 196, y, { align: 'right' })
  y += 7

  // NET À PAYER
  doc.setFillColor(...BLUE)
  doc.roundedRect(tx, y - 4, 66, 11, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('NET À PAYER', tx + 4, y + 3)
  doc.text(fmt(data.montant_ttc), 192, y + 3, { align: 'right' })
  y += 16

  // Conditions + penalties
  if (data.notes) {
    y = ensureSpace(doc, y, 15)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    const splitNotes = doc.splitTextToSize(data.notes, 180)
    doc.text(splitNotes, 14, y)
    y += splitNotes.length * 3.2 + 3
  }

  // Pénalités de retard — obligatoire sur toute facture
  y = ensureSpace(doc, y, 14)
  doc.setFontSize(6.5)
  doc.setTextColor(120)
  doc.setFont('helvetica', 'normal')
  doc.text('En cas de retard de paiement, pénalités exigibles : 3x le taux d\'intérêt légal en vigueur.', 14, y)
  y += 3
  if (data.clientType === 'professionnel') {
    doc.text('Indemnité forfaitaire pour frais de recouvrement due par le débiteur professionnel : 40 €.', 14, y)
    y += 3
  }
  doc.text('Escompte pour paiement anticipé : néant.', 14, y)
  y += 5

  // TVA mentions
  const tvaMentions = getTvaMentions(data.lignes)
  if (tvaMentions.length > 0) {
    y = ensureSpace(doc, y, 15)
    doc.setDrawColor(200)
    doc.line(14, y, 196, y)
    y += 3
    doc.setFontSize(6)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(107, 114, 128)
    for (const mention of tvaMentions) {
      const lines = doc.splitTextToSize(mention, 180)
      y = ensureSpace(doc, y, lines.length * 2.5 + 2)
      doc.text(lines, 14, y)
      y += lines.length * 2.5 + 2
    }
  }

  // Footer
  addFooterLegal(doc, ent, y + 4)

  return doc.output('datauristring').split(',')[1]
}
