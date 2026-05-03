// -------------------------------------------------------------------
// Server-side PDF generation — RÉCAPITULATIF DE CHANTIER (côté client)
//
// Document de SUIVI et de RÉCAP destiné au client à la fin (ou en cours)
// d'un chantier. À la différence du PDF de planification :
//   • pas de calendrier prévisionnel ; on se concentre sur ce qui A ÉTÉ fait
//   • on inclut un récap financier (devis, acomptes, solde)
//   • on inclut une timeline des échanges (notes datées par intervention)
//   • on inclut les garanties + le contact SAV
//
// Format MVP : 2 pages A4 max (compact, lisible, professionnel).
// Pas de signature obligatoire — c'est un document de suivi, pas un bon
// juridique. Une zone "Acceptation client" optionnelle figure en pied de
// page 2 si l'artisan veut la faire viser.
// -------------------------------------------------------------------

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============ COLORS ============
const NAVY: [number, number, number] = [15, 23, 42]
const SLATE: [number, number, number] = [71, 85, 105]
const MUTED: [number, number, number] = [100, 116, 139]
const GREY_LIGHT: [number, number, number] = [248, 250, 252]
const GREY_BORDER: [number, number, number] = [226, 232, 240]
const ACCENT_BLUE: [number, number, number] = [37, 99, 235]
const ACCENT_GREEN: [number, number, number] = [5, 150, 105]
const ACCENT_AMBER: [number, number, number] = [217, 119, 6]

// ============ TYPES ============
// On RÉUTILISE volontairement les mêmes shapes que pdf-chantier.ts pour
// que l'API endpoint puisse passer le même payload aux deux générateurs.
// (Les champs non utilisés ici sont simplement ignorés.)

interface Entreprise {
  nom?: string | null
  siret?: string | null
  code_naf?: string | null
  adresse?: string | null
  code_postal?: string | null
  ville?: string | null
  telephone?: string | null
  email?: string | null
  logo_url?: string | null
  decennale_numero?: string | null
  /** Compagnie d'assurance décennale (ex: AXA, Allianz). Optionnel. */
  decennale_compagnie?: string | null
  signature_base64?: string | null
  tampon_base64?: string | null
}

interface Chantier {
  id: string
  titre?: string | null
  description?: string | null
  description_client?: string | null
  adresse_chantier?: string | null
  code_postal_chantier?: string | null
  ville_chantier?: string | null
  date_debut?: string | null
  date_fin_prevue?: string | null
}

interface Client {
  civilite?: string | null
  nom?: string | null
  prenom?: string | null
  adresse?: string | null
  code_postal?: string | null
  ville?: string | null
  telephone?: string | null
  email?: string | null
}

interface PlanningIntervention {
  id: string
  date_debut: string
  date_fin?: string | null
  intervenant_id?: string | null
  devis_id?: string | null
}

interface Intervenant {
  id: string
  prenom?: string | null
  nom?: string | null
  metier?: string | null
}

interface DevisForRecap {
  id: string
  numero?: string | null
  objet?: string | null
  description?: string | null
  montant_ttc?: number | null
  montant_acompte?: number | null
  acompte_verse?: boolean | null
  /** Statut côté facturation : 'facture' / 'envoye' / 'signe' / etc. */
  statut?: string | null
}

interface InterventionNoteForRecap {
  id: string
  intervention_id: string
  type: 'note_client' | 'presence_requise' | 'presence_obligatoire' | 'preparation' | 'note_artisan'
  texte: string
  date_intervention?: string | null
}

export interface RecapChantierPdfData {
  entreprise: Entreprise
  chantier: Chantier
  client: Client | null
  interventions: PlanningIntervention[]
  intervenants: Intervenant[]
  devis: DevisForRecap[]
  interventionNotes?: InterventionNoteForRecap[]
}

// ============ HELPERS ============

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  // toLocaleString utilise des espaces insécables (  ou  ) que helvetica
  // dans jsPDF ne sait pas rendre (on voit "/" à la place). On les remplace par
  // un espace standard pour un rendu propre dans le PDF.
  const formatted = v
    .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[  ]/g, ' ')
  return `${formatted} €`
}

function generateRecapRef(chantierId: string): string {
  const year = new Date().getFullYear()
  const short = chantierId.replace(/-/g, '').substring(0, 6).toUpperCase()
  return `RC-${year}-${short}`
}

/** Calcule la période réelle d'intervention à partir des interventions planifiées. */
function computePeriodeReelle(interventions: PlanningIntervention[]): { debut: string | null; fin: string | null; jours: number } {
  if (interventions.length === 0) return { debut: null, fin: null, jours: 0 }
  const sorted = [...interventions].sort((a, b) => a.date_debut.localeCompare(b.date_debut))
  const debut = sorted[0].date_debut.split('T')[0]
  const lastIv = sorted[sorted.length - 1]
  const fin = (lastIv.date_fin || lastIv.date_debut).split('T')[0]
  // Compter les jours uniques d'intervention
  const daySet = new Set<string>()
  interventions.forEach(iv => {
    const start = new Date(iv.date_debut.split('T')[0])
    const end = new Date((iv.date_fin || iv.date_debut).split('T')[0])
    const cur = new Date(start)
    while (cur <= end) {
      daySet.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`)
      cur.setDate(cur.getDate() + 1)
    }
  })
  return { debut, fin, jours: daySet.size }
}

/** Dessine un titre de section : "TITRE EN MAJUSCULES" + ligne séparatrice. */
function drawSectionTitle(doc: jsPDF, x: number, y: number, w: number, label: string): number {
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2])
  doc.text(label.toUpperCase(), x, y)
  doc.setDrawColor(GREY_BORDER[0], GREY_BORDER[1], GREY_BORDER[2])
  doc.line(x, y + 2, x + w, y + 2)
  return y + 7
}

/** Page-break helper. Retourne le nouveau y (15 si page suivante). */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 285) { doc.addPage(); return 15 }
  return y
}

// ============ MAIN ============

export function generateRecapChantierPdf(data: RecapChantierPdfData): string {
  const { entreprise, chantier, client, interventions, intervenants, devis, interventionNotes } = data
  const doc = new jsPDF()
  const M = 14
  const pageW = 210
  const pageH = 297
  const contentW = pageW - 2 * M
  let y = 12

  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])

  // ============================================================
  // HEADER (compact, identique au PDF planning pour cohérence)
  // ============================================================
  const headerH = 26

  // Logo
  if (entreprise.logo_url && entreprise.logo_url.startsWith('data:image')) {
    try {
      const fmt = entreprise.logo_url.includes('image/png') ? 'PNG' : 'JPEG'
      const ip = doc.getImageProperties(entreprise.logo_url)
      const ratio = ip.width / ip.height
      let lw = 20
      let lh = lw / ratio
      if (lh > 22) { lh = 22; lw = lh * ratio }
      if (lw > 40) lw = 40
      doc.addImage(entreprise.logo_url, fmt, M, y + 1, lw, lh)
    } catch { /* ignore */ }
  }

  const infoX = entreprise.logo_url ? M + 24 : M
  let infoY = y + 4
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text(entreprise.nom || 'Entreprise', infoX, infoY)
  infoY += 4.5

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  const adresseLine = [entreprise.adresse, entreprise.code_postal, entreprise.ville].filter(Boolean).join(', ')
  if (adresseLine) { doc.text(adresseLine, infoX, infoY); infoY += 3 }
  const siretLine = [
    entreprise.siret ? `SIRET ${entreprise.siret}` : null,
    entreprise.code_naf ? `APE ${entreprise.code_naf}` : null,
  ].filter(Boolean).join(' · ')
  if (siretLine) { doc.text(siretLine, infoX, infoY); infoY += 3 }
  const contactLine = [entreprise.telephone, entreprise.email].filter(Boolean).join(' · ')
  if (contactLine) { doc.text(contactLine, infoX, infoY); infoY += 3 }

  // Bloc REF + date à droite (badge "RÉCAP CHANTIER")
  const refX = pageW - M - 60
  const refY = y + 1
  setFill(ACCENT_GREEN)
  doc.roundedRect(refX, refY, 60, 7, 1.2, 1.2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('RÉCAPITULATIF DE CHANTIER', refX + 30, refY + 4.8, { align: 'center' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setText(MUTED)
  doc.text('Référence', refX, refY + 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text(generateRecapRef(chantier.id), refX, refY + 16)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setText(MUTED)
  doc.text('Édité le', refX, refY + 21)
  doc.setFontSize(8)
  setText(SLATE)
  doc.text(fmtDate(new Date().toISOString()), refX, refY + 24.5)

  y += headerH

  // Trait fin sous header
  setDraw(GREY_BORDER)
  doc.setLineWidth(0.3)
  doc.line(M, y, pageW - M, y)
  y += 6

  // ============================================================
  // TITRE CHANTIER
  // ============================================================
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text(chantier.titre || 'Chantier', M, y + 5)
  y += 9

  if (chantier.description_client) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    setText(SLATE)
    const lines = doc.splitTextToSize(chantier.description_client, contentW)
    doc.text(lines, M, y + 3)
    y += lines.length * 4 + 3
  }
  y += 3

  // ============================================================
  // BLOCS CLIENT + LIEU CHANTIER (côte à côte)
  // ============================================================
  const colW = (contentW - 4) / 2
  const blocH = 28
  const clientName = client
    ? `${client.civilite ?? ''} ${client.prenom ?? ''} ${client.nom ?? ''}`.replace(/\s+/g, ' ').trim()
    : 'Client non renseigné'

  // Bloc CLIENT
  setFill(GREY_LIGHT)
  doc.roundedRect(M, y, colW, blocH, 1.5, 1.5, 'F')
  setFill(ACCENT_BLUE)
  doc.rect(M, y, 1.2, blocH, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('CLIENT', M + 4, y + 4.5)
  doc.setFontSize(10)
  setText(NAVY)
  doc.text(clientName, M + 4, y + 9)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  let cy = y + 13
  if (client?.adresse) {
    doc.text(client.adresse, M + 4, cy); cy += 3
    const cl = [client.code_postal, client.ville].filter(Boolean).join(' ')
    if (cl) { doc.text(cl, M + 4, cy); cy += 3 }
  }
  if (client?.telephone || client?.email) {
    doc.text([client.telephone, client.email].filter(Boolean).join(' · '), M + 4, cy)
  }

  // Bloc LIEU CHANTIER
  const lx = M + colW + 4
  setFill(GREY_LIGHT)
  doc.roundedRect(lx, y, colW, blocH, 1.5, 1.5, 'F')
  setFill(ACCENT_AMBER)
  doc.rect(lx, y, 1.2, blocH, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('LIEU DU CHANTIER', lx + 4, y + 4.5)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  setText(NAVY)
  let ly = y + 9
  if (chantier.adresse_chantier) {
    doc.text(chantier.adresse_chantier, lx + 4, ly); ly += 4
  }
  const lieu = [chantier.code_postal_chantier, chantier.ville_chantier].filter(Boolean).join(' ')
  if (lieu) {
    doc.text(lieu, lx + 4, ly); ly += 4
  }
  // Période réelle
  const periode = computePeriodeReelle(interventions)
  doc.setFontSize(7.5)
  setText(SLATE)
  if (periode.debut && periode.fin) {
    doc.text(`Du ${fmtDate(periode.debut)} au ${fmtDate(periode.fin)}`, lx + 4, ly + 1)
    ly += 3.5
    doc.setFontSize(7)
    setText(MUTED)
    doc.text(`${periode.jours} jour${periode.jours > 1 ? 's' : ''} d'intervention`, lx + 4, ly + 1)
  } else {
    doc.text('Période d\'intervention à venir', lx + 4, ly + 1)
  }

  y += blocH + 6

  // ============================================================
  // SECTION : VOS TRAVAUX RÉALISÉS
  // ============================================================
  y = drawSectionTitle(doc, M, y, contentW, 'Vos travaux réalisés')

  if (devis.length === 0) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    setText(MUTED)
    doc.text('Aucun devis enregistré pour ce chantier.', M, y + 3)
    y += 8
  } else {
    devis.forEach((d, idx) => {
      // Hauteur estimée : 12mm + 4mm par ligne de description
      const description = d.description || d.objet || ''
      const descLines = description ? doc.splitTextToSize(description, contentW - 8) : []
      const blockH = 11 + Math.min(descLines.length, 3) * 3.5

      y = ensureSpace(doc, y, blockH + 3)

      // Cadre
      setFill(GREY_LIGHT)
      doc.roundedRect(M, y, contentW, blockH, 1.2, 1.2, 'F')
      // Pastille de statut
      const isFacture = d.statut === 'facture'
      const isSigne = d.statut === 'signe' || d.statut === 'envoye'
      const statusColor: [number, number, number] = isFacture ? ACCENT_GREEN : isSigne ? ACCENT_AMBER : MUTED
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
      doc.rect(M, y, 1.5, blockH, 'F')

      // Numéro + objet
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      setText(NAVY)
      const numero = d.numero ? `Devis ${d.numero}` : `Phase ${idx + 1}`
      doc.text(numero, M + 4, y + 4.5)

      // Statut texte à droite
      const statusLabel = isFacture ? 'Facturé' : isSigne ? 'Réalisé' : 'En cours'
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
      doc.text(statusLabel.toUpperCase(), M + contentW - 4, y + 4.5, { align: 'right' })

      // Objet
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      setText(SLATE)
      const objet = d.objet || ''
      if (objet) {
        const objLine = doc.splitTextToSize(objet, contentW - 8)[0] || objet
        doc.text(objLine, M + 4, y + 8.5)
      }

      // Description (max 3 lignes)
      if (descLines.length > 0 && descLines[0] !== objet) {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        setText(MUTED)
        const visibleLines = descLines.slice(0, 3)
        doc.text(visibleLines, M + 4, y + 12)
      }

      y += blockH + 2
    })
    y += 2
  }

  // ============================================================
  // SECTION : RÉCAPITULATIF FINANCIER
  // ============================================================
  y = ensureSpace(doc, y, 50)
  y = drawSectionTitle(doc, M, y, contentW, 'Récapitulatif financier')

  const tableRows = devis.map(d => {
    const ttc = Number(d.montant_ttc ?? 0)
    const acompteVerse = d.acompte_verse ? Number(d.montant_acompte ?? 0) : 0
    const isFacture = d.statut === 'facture'
    const dejaPaye = isFacture ? ttc : acompteVerse
    const reste = Math.max(0, ttc - dejaPaye)
    return [
      d.numero || '—',
      d.objet || '—',
      fmtMoney(ttc),
      fmtMoney(dejaPaye),
      fmtMoney(reste),
    ]
  })

  const totalTTC = devis.reduce((acc, d) => acc + Number(d.montant_ttc ?? 0), 0)
  const totalPaye = devis.reduce((acc, d) => {
    const ttc = Number(d.montant_ttc ?? 0)
    if (d.statut === 'facture') return acc + ttc
    return acc + (d.acompte_verse ? Number(d.montant_acompte ?? 0) : 0)
  }, 0)
  const totalReste = Math.max(0, totalTTC - totalPaye)

  if (tableRows.length > 0) {
    autoTable(doc, {
      head: [['Devis', 'Désignation', 'Montant TTC', 'Déjà payé', 'Solde']],
      body: tableRows,
      foot: [['', 'TOTAL', fmtMoney(totalTTC), fmtMoney(totalPaye), fmtMoney(totalReste)]],
      startY: y,
      theme: 'grid',
      margin: { left: M, right: M },
      styles: { fontSize: 8, cellPadding: 2, lineColor: GREY_BORDER, textColor: NAVY },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: GREY_LIGHT, textColor: NAVY, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right', textColor: totalReste > 0 ? ACCENT_AMBER : ACCENT_GREEN, fontStyle: 'bold' },
      },
    })
    // @ts-expect-error - lastAutoTable est ajouté par autoTable au runtime
    y = (doc.lastAutoTable?.finalY ?? y) + 4
  } else {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    setText(MUTED)
    doc.text('Aucun devis financier à récapituler.', M, y + 3)
    y += 8
  }

  // Bandeau résumé visuel sous le tableau
  if (totalTTC > 0) {
    const bandH = 12
    y = ensureSpace(doc, y, bandH + 4)
    setFill(totalReste > 0 ? [254, 243, 199] : [220, 252, 231]) // amber-50 / green-50
    doc.roundedRect(M, y, contentW, bandH, 1.5, 1.5, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setText(totalReste > 0 ? ACCENT_AMBER : ACCENT_GREEN)
    const msg = totalReste > 0
      ? `Solde restant à régler : ${fmtMoney(totalReste)}`
      : `Chantier intégralement réglé. Merci de votre confiance.`
    doc.text(msg, M + contentW / 2, y + 7.5, { align: 'center' })
    y += bandH + 6
  }

  // ============================================================
  // PAGE 2 — TIMELINE + GARANTIES + SAV
  // ============================================================
  doc.addPage()
  y = 15

  // Mini header page 2
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text((entreprise.nom || 'Entreprise').toUpperCase(), M, y)
  doc.text(generateRecapRef(chantier.id), pageW - M, y, { align: 'right' })
  setDraw(GREY_BORDER)
  doc.setLineWidth(0.2)
  doc.line(M, y + 2, pageW - M, y + 2)
  y += 8

  // ============================================================
  // SECTION : ÉCHANGES & INFORMATIONS (timeline notes datées)
  // ============================================================
  y = drawSectionTitle(doc, M, y, contentW, 'Échanges & informations sur le chantier')

  // On exclut les notes_artisan (privées). On trie chronologiquement par
  // date d'intervention, puis on affiche en mode timeline.
  const visibleNotes = (interventionNotes || [])
    .filter(n => n.type !== 'note_artisan')
    .sort((a, b) => (a.date_intervention || '').localeCompare(b.date_intervention || ''))

  if (visibleNotes.length === 0) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    setText(MUTED)
    doc.text('Aucune note d\'intervention enregistrée pour ce chantier.', M, y + 3)
    y += 8
  } else {
    // Labels VOLONTAIREMENT courts pour tenir dans le badge 28mm.
    // (Le détail explicite est dans le texte de la note juste à côté.)
    const TYPE_META: Record<string, { label: string; color: [number, number, number] }> = {
      note_client: { label: 'Info client', color: ACCENT_BLUE },
      presence_requise: { label: 'Présence', color: ACCENT_AMBER },
      presence_obligatoire: { label: 'Obligatoire', color: [220, 38, 38] },
      preparation: { label: 'Préparation', color: [124, 58, 237] },
    }

    visibleNotes.forEach(note => {
      const meta = TYPE_META[note.type] || { label: note.type, color: MUTED }
      const txtLines = doc.splitTextToSize(note.texte, contentW - 36)
      const lineH = 3.5
      const blockH = Math.max(11, txtLines.length * lineH + 4)

      y = ensureSpace(doc, y, blockH + 2)

      // Pastille date à gauche (en colonne)
      setFill(GREY_LIGHT)
      doc.roundedRect(M, y, 22, blockH, 1, 1, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      setText(NAVY)
      const dateLabel = note.date_intervention ? fmtDateShort(note.date_intervention) : '—'
      doc.text(dateLabel, M + 11, y + 4, { align: 'center' })
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      setText(MUTED)
      const dateObj = note.date_intervention ? new Date(note.date_intervention) : null
      const dayLabel = dateObj
        ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][dateObj.getDay()]
        : ''
      if (dayLabel) doc.text(dayLabel, M + 11, y + 7.5, { align: 'center' })

      // Badge type
      const badgeY = y + 1
      const badgeX = M + 24
      const badgeW = 28
      doc.setFillColor(meta.color[0], meta.color[1], meta.color[2])
      doc.roundedRect(badgeX, badgeY, badgeW, 4.5, 0.8, 0.8, 'F')
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(meta.label.toUpperCase(), badgeX + badgeW / 2, badgeY + 3.2, { align: 'center' })

      // Texte de la note
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      setText(NAVY)
      doc.text(txtLines, badgeX, y + 8)

      y += blockH + 1.5
    })
    y += 3
  }

  // ============================================================
  // SECTION : GARANTIES
  // ============================================================
  y = ensureSpace(doc, y, 40)
  y = drawSectionTitle(doc, M, y, contentW, 'Vos garanties')

  const garanties: { titre: string; duree: string; description: string }[] = [
    {
      titre: 'Garantie de parfait achèvement',
      duree: '1 an',
      description: 'Tous désordres signalés dans l\'année qui suit la réception sont réparés sans frais.',
    },
    {
      titre: 'Garantie biennale (bon fonctionnement)',
      duree: '2 ans',
      description: 'Couvre les équipements dissociables (luminaires, prises, interrupteurs, robinetterie...).',
    },
    {
      titre: 'Garantie décennale',
      duree: '10 ans',
      description: entreprise.decennale_numero
        ? `Couverture des dommages affectant la solidité de l'ouvrage. Contrat n° ${entreprise.decennale_numero}${entreprise.decennale_compagnie ? ` (${entreprise.decennale_compagnie})` : ''}.`
        : 'Couverture des dommages affectant la solidité de l\'ouvrage ou le rendant impropre à sa destination.',
    },
  ]

  garanties.forEach(g => {
    y = ensureSpace(doc, y, 13)
    setFill(GREY_LIGHT)
    doc.roundedRect(M, y, contentW, 11, 1.2, 1.2, 'F')
    // Pastille durée
    setFill(ACCENT_GREEN)
    doc.roundedRect(M + 2, y + 2, 14, 7, 1, 1, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(g.duree, M + 9, y + 6.7, { align: 'center' })
    // Titre
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text(g.titre, M + 19, y + 4.5)
    // Description
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    setText(SLATE)
    const dl = doc.splitTextToSize(g.description, contentW - 22)[0] || g.description
    doc.text(dl, M + 19, y + 8)
    y += 12
  })
  y += 3

  // ============================================================
  // SECTION : SAV / CONTACT
  // ============================================================
  y = ensureSpace(doc, y, 22)
  y = drawSectionTitle(doc, M, y, contentW, 'Service après-vente')

  setFill(GREY_LIGHT)
  doc.roundedRect(M, y, contentW, 14, 1.5, 1.5, 'F')
  setFill(ACCENT_BLUE)
  doc.rect(M, y, 1.2, 14, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text(`Pour toute question ou demande de SAV, contactez-nous :`, M + 4, y + 5)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  const contactRaw = [
    entreprise.telephone ? `Tél. ${entreprise.telephone}` : null,
    entreprise.email,
  ].filter(Boolean).join('   ·   ')
  doc.text(contactRaw, M + 4, y + 11)
  y += 18

  // ============================================================
  // BAS DE PAGE — Mention "Document de récap"
  // ============================================================
  const footY = pageH - 18
  doc.setDrawColor(GREY_BORDER[0], GREY_BORDER[1], GREY_BORDER[2])
  doc.setLineWidth(0.2)
  doc.line(M, footY, pageW - M, footY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  setText(MUTED)
  const footMsg = 'Document récapitulatif de chantier — Vos devis et factures vous ont été remis séparément. Conservez ce récap avec vos documents importants.'
  const footLines = doc.splitTextToSize(footMsg, contentW)
  doc.text(footLines, pageW / 2, footY + 4, { align: 'center' })
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  setText([148, 163, 184])
  doc.text(`Document généré avec Nexartis · www.nexartis.fr`, pageW / 2, pageH - 6, { align: 'center' })
  return doc.output('datauristring')
}
