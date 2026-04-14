// -------------------------------------------------------------------
// Server-side PDF generation for Chantier Planning
// jsPDF — no browser required
// -------------------------------------------------------------------

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============ COLORS ============
const NAVY: [number, number, number] = [15, 23, 42]       // #0f172a
const SLATE: [number, number, number] = [71, 85, 105]     // #475569
const MUTED: [number, number, number] = [100, 116, 139]   // #64748b
const GREY_LIGHT: [number, number, number] = [248, 250, 252] // #f8fafc
const GREY_BORDER: [number, number, number] = [226, 232, 240] // #e2e8f0

// Phase colors (for calendar bars)
const PHASE_COLORS: [number, number, number][] = [
  [37, 99, 235],    // blue
  [13, 148, 136],   // teal
  [67, 56, 202],    // indigo
  [217, 119, 6],    // amber
  [124, 58, 237],   // purple
  [190, 18, 60],    // rose
]

// Summary accent colors
const ACCENT_BLUE: [number, number, number] = [37, 99, 235]
const ACCENT_GREEN: [number, number, number] = [5, 150, 105]
const ACCENT_AMBER: [number, number, number] = [217, 119, 6]

// ============ TYPES ============

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
  acces_info?: string | null
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
  titre?: string | null
  description_travaux?: string | null
  date_debut: string
  date_fin?: string | null
  intervenant_id?: string | null
}

interface Intervenant {
  id: string
  prenom?: string | null
  nom?: string | null
  metier?: string | null
  type_contrat?: string | null
}

interface ChantierNote {
  id: string
  texte: string
  categorie?: string | null
  visible_in_pdf?: boolean | null
}

export interface ChantierPdfData {
  entreprise: Entreprise
  chantier: Chantier
  client: Client | null
  interventions: PlanningIntervention[]
  intervenants: Intervenant[]
  notes: ChantierNote[]
}

// ============ HELPERS ============

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function daysBetween(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0
  const s = new Date(start); s.setHours(0, 0, 0, 0)
  const e = new Date(end); e.setHours(0, 0, 0, 0)
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

function workingDays(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0
  const s = new Date(start); s.setHours(0, 0, 0, 0)
  const e = new Date(end); e.setHours(0, 0, 0, 0)
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function initials(prenom?: string | null, nom?: string | null): string {
  const p = (prenom || '').charAt(0).toUpperCase()
  const n = (nom || '').charAt(0).toUpperCase()
  return (p + n) || '?'
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

function generateRef(chantierId: string): string {
  const year = new Date().getFullYear()
  const short = chantierId.replace(/-/g, '').substring(0, 6).toUpperCase()
  return `PL-${year}-${short}`
}

// Page-break helper
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 285) { doc.addPage(); return 15 }
  return y
}

// ============ MAIN PDF GENERATOR ============

export function generateChantierPlanningPdf(data: ChantierPdfData): string {
  const { entreprise, chantier, client, interventions, intervenants, notes } = data
  const doc = new jsPDF()
  const M = 14 // marge gauche/droite
  const pageW = 210
  const contentW = pageW - 2 * M
  let y = 12

  // Palette helpers
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])

  // ============ HEADER ============
  const headerTopY = y
  const headerH = 26

  // Logo artisan (gauche)
  let logoBottomY = y
  if (entreprise.logo_url && entreprise.logo_url.startsWith('data:image')) {
    try {
      const logoFormat = entreprise.logo_url.includes('image/png') ? 'PNG' : 'JPEG'
      const imgProps = doc.getImageProperties(entreprise.logo_url)
      const ratio = imgProps.width / imgProps.height
      let logoW = 20
      let logoH = logoW / ratio
      if (logoH > 22) { logoH = 22; logoW = logoH * ratio }
      if (logoW > 40) logoW = 40
      doc.addImage(entreprise.logo_url, logoFormat, M, y + 1, logoW, logoH)
      logoBottomY = y + 1 + logoH
    } catch { /* ignore */ }
  }

  // Nom artisan + infos (à droite du logo ou prend toute la largeur gauche si pas de logo)
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
  if (entreprise.decennale_numero) {
    setText(MUTED)
    doc.text(`Décennale ${entreprise.decennale_numero}`, infoX, infoY)
    infoY += 3
  }

  // Méta-données à droite : badge + ref + date
  const metaX = pageW - M
  // Badge "PLANNING CHANTIER"
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setFill(NAVY)
  const badgeText = 'PLANNING CHANTIER'
  const badgeW = doc.getTextWidth(badgeText) + 4
  doc.roundedRect(metaX - badgeW, y + 1, badgeW, 4.5, 0.8, 0.8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(badgeText, metaX - badgeW / 2, y + 4.2, { align: 'center' })

  // Référence
  const ref = generateRef(chantier.id)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setText(MUTED)
  doc.text('Référence', metaX, y + 9, { align: 'right' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text(ref, metaX, y + 13, { align: 'right' })

  // Date émission
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setText(MUTED)
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(`Émis le ${today}`, metaX, y + 17, { align: 'right' })

  y = Math.max(logoBottomY, infoY, headerTopY + headerH)

  // Trait séparateur
  setDraw(GREY_BORDER)
  doc.setLineWidth(0.2)
  doc.line(M, y, pageW - M, y)
  y += 7

  // ============ TITRE CHANTIER ============
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('PLANIFICATION DE CHANTIER', M, y)
  y += 5

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  const titreLines = doc.splitTextToSize(chantier.titre || 'Chantier', contentW)
  doc.text(titreLines, M, y)
  y += titreLines.length * 7

  const desc = chantier.description_client || chantier.description
  if (desc) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    setText(SLATE)
    const descLines = doc.splitTextToSize(desc, contentW)
    doc.text(descLines, M, y)
    y += descLines.length * 4
  }
  y += 6

  // ============ CLIENT + LIEU (2 colonnes) ============
  const boxW = (contentW - 4) / 2
  const boxH = 24
  const boxStartY = y

  // Fond gris clair
  setFill(GREY_LIGHT)
  doc.roundedRect(M, y, boxW, boxH, 1.5, 1.5, 'F')
  doc.roundedRect(M + boxW + 4, y, boxW, boxH, 1.5, 1.5, 'F')

  // Client
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('CLIENT', M + 3, y + 4)

  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  const clientName = client
    ? `${client.civilite || ''} ${client.prenom || ''} ${client.nom || ''}`.replace(/\s+/g, ' ').trim()
    : 'Client non renseigné'
  doc.setFont('helvetica', 'bold')
  doc.text(clientName, M + 3, y + 9)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  let cy = y + 13
  const clientAdresse = client ? [client.adresse, client.code_postal, client.ville].filter(Boolean).join(', ') : ''
  if (clientAdresse) {
    const lines = doc.splitTextToSize(clientAdresse, boxW - 6)
    doc.text(lines, M + 3, cy)
    cy += lines.length * 3.5
  }
  if (client?.telephone) { doc.text(client.telephone, M + 3, cy); cy += 3.5 }
  if (client?.email) { doc.text(client.email, M + 3, cy); cy += 3.5 }

  // Lieu
  const lx = M + boxW + 4
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('LIEU DU CHANTIER', lx + 3, y + 4)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  const chantierAdresse = [chantier.adresse_chantier, chantier.code_postal_chantier, chantier.ville_chantier]
    .filter(Boolean).join(', ')
  const adresseLines = doc.splitTextToSize(chantierAdresse || 'Adresse non renseignée', boxW - 6)
  doc.text(adresseLines, lx + 3, y + 9)
  let ly = y + 9 + adresseLines.length * 4

  if (chantier.acces_info) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    setText(MUTED)
    const accesLines = doc.splitTextToSize(chantier.acces_info, boxW - 6)
    doc.text(accesLines, lx + 3, ly + 1)
  }

  y = boxStartY + boxH + 8

  // ============ RÉSUMÉ 3 BLOCS ============
  const sumW = (contentW - 8) / 3
  const sumH = 17
  const dateDebut = chantier.date_debut
  const dateFin = chantier.date_fin_prevue
  const nbOuvres = workingDays(dateDebut, dateFin)
  const nbCal = daysBetween(dateDebut, dateFin)

  const drawSummaryBox = (x: number, label: string, value: string, sub: string, color: [number, number, number]) => {
    // Cadre
    setDraw(GREY_BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, sumW, sumH, 1.5, 1.5, 'S')
    // Barre de couleur en haut
    setFill(color)
    doc.rect(x + 1, y + 0.5, sumW - 2, 1.2, 'F')
    // Label
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    setText(MUTED)
    doc.text(label.toUpperCase(), x + 3, y + 5)
    // Value
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    setText(color)
    doc.text(value, x + 3, y + 11)
    // Sub
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    setText(MUTED)
    doc.text(sub, x + 3, y + 14.5)
  }

  drawSummaryBox(M, 'Durée totale', `${nbOuvres} jour${nbOuvres > 1 ? 's' : ''}`, `ouvrés (${nbCal}j calendaires)`, ACCENT_BLUE)
  drawSummaryBox(M + sumW + 4, 'Démarrage', fmtDate(dateDebut), dateDebut ? new Date(dateDebut).toLocaleDateString('fr-FR', { weekday: 'long' }) : '', ACCENT_GREEN)
  drawSummaryBox(M + 2 * (sumW + 4), 'Fin prévue', fmtDate(dateFin), dateFin ? new Date(dateFin).toLocaleDateString('fr-FR', { weekday: 'long' }) : '', ACCENT_AMBER)

  y += sumH + 10

  // ============ CALENDRIER ============
  const phasesWithColor = [...interventions]
    .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime())
    .map((p, i) => ({ ...p, color: PHASE_COLORS[i % PHASE_COLORS.length] }))

  if (phasesWithColor.length > 0 && dateDebut && dateFin) {
    y = ensureSpace(doc, y, 50)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text('CALENDRIER DU CHANTIER', M, y)
    setDraw(GREY_BORDER)
    doc.line(M, y + 2, pageW - M, y + 2)
    y += 8

    y = drawCalendar(doc, M, y, contentW, phasesWithColor, dateDebut, dateFin)
    y += 8
  }

  // ============ TABLEAU DÉTAIL PHASES ============
  const ivMap = new Map(intervenants.map(iv => [iv.id, iv]))
  if (phasesWithColor.length > 0) {
    y = ensureSpace(doc, y, 30)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text('DÉTAIL DES PHASES', M, y)
    setDraw(GREY_BORDER)
    doc.line(M, y + 2, pageW - M, y + 2)
    y += 6

    const tableBody = phasesWithColor.map((p) => {
      const iv = p.intervenant_id ? ivMap.get(p.intervenant_id) : null
      const ivName = iv ? `${iv.prenom || ''} ${iv.nom || ''}`.trim() : '—'
      const ivRole = iv?.metier || iv?.type_contrat || ''
      const dateRange = p.date_fin && p.date_fin !== p.date_debut
        ? `${fmtDateShort(p.date_debut)} → ${fmtDateShort(p.date_fin)}`
        : fmtDateShort(p.date_debut)
      const duree = daysBetween(p.date_debut, p.date_fin || p.date_debut)
      return [
        p.titre || 'Phase',
        `${dateRange}\n${duree}j`,
        ivRole ? `${ivName}\n${ivRole}` : ivName,
        'À confirmer',
      ]
    })

    autoTable(doc, {
      startY: y,
      head: [['Phase', 'Dates', 'Équipe', 'Présence client']],
      body: tableBody,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 3, textColor: [15, 23, 42] },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: MUTED,
        fontSize: 7,
        fontStyle: 'bold',
        lineWidth: { bottom: 0.5 },
        lineColor: NAVY,
      },
      columnStyles: {
        0: { cellWidth: contentW * 0.38 },
        1: { cellWidth: contentW * 0.18 },
        2: { cellWidth: contentW * 0.24 },
        3: { cellWidth: contentW * 0.2 },
      },
      bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [241, 245, 249] },
      margin: { left: M, right: M },
      didDrawCell: (data) => {
        // Dessiner le petit carré de couleur pour la phase
        if (data.column.index === 0 && data.section === 'body') {
          const idx = data.row.index
          if (idx < phasesWithColor.length) {
            const c = phasesWithColor[idx].color
            setFill(c)
            doc.roundedRect(data.cell.x + 2, data.cell.y + 3, 2.5, 2.5, 0.3, 0.3, 'F')
          }
        }
      },
      didParseCell: (data) => {
        if (data.column.index === 0 && data.section === 'body') {
          data.cell.styles.cellPadding = { top: 3, right: 3, bottom: 3, left: 7 }
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    y += 8
  }

  // ============ ÉQUIPE ASSIGNÉE ============
  const uniqueIvIds = Array.from(new Set(phasesWithColor.map(p => p.intervenant_id).filter(Boolean))) as string[]
  if (uniqueIvIds.length > 0) {
    y = ensureSpace(doc, y, 30)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text('ÉQUIPE ASSIGNÉE À VOTRE CHANTIER', M, y)
    setDraw(GREY_BORDER)
    doc.line(M, y + 2, pageW - M, y + 2)
    y += 6

    const memW = (contentW - 8) / 3
    const memH = 16
    uniqueIvIds.forEach((ivId, idx) => {
      const iv = ivMap.get(ivId)
      if (!iv) return
      const col = idx % 3
      const row = Math.floor(idx / 3)
      const mx = M + col * (memW + 4)
      const my = y + row * (memH + 4)

      // Fond
      setFill(GREY_LIGHT)
      doc.roundedRect(mx, my, memW, memH, 1.5, 1.5, 'F')

      // Avatar
      const isSt = iv.type_contrat === 'sous-traitant'
      setFill(isSt ? [100, 116, 139] : NAVY)
      doc.circle(mx + 7, my + 8, 4, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(initials(iv.prenom, iv.nom), mx + 7, my + 9.3, { align: 'center' })

      // Nom
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      setText(NAVY)
      const name = `${iv.prenom || ''} ${iv.nom || ''}`.trim()
      doc.text(name, mx + 13, my + 6)

      // Role
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      setText(MUTED)
      doc.text(iv.metier || '', mx + 13, my + 9.5)

      // Tag
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'bold')
      const tagText = isSt ? 'SOUS-TRAITANT' : 'SALARIÉ'
      const tagW = doc.getTextWidth(tagText) + 2
      setFill(isSt ? NAVY : [226, 232, 240])
      doc.roundedRect(mx + 13, my + 11, tagW, 2.8, 0.4, 0.4, 'F')
      doc.setTextColor(isSt ? 255 : 15, isSt ? 255 : 23, isSt ? 255 : 42)
      doc.text(tagText, mx + 14, my + 13)
    })
    const nbRows = Math.ceil(uniqueIvIds.length / 3)
    y += nbRows * (memH + 4) + 4
  }

  // ============ NOTES VISIBLES ============
  const visibleNotes = notes.filter(n => n.visible_in_pdf === true)
  if (visibleNotes.length > 0) {
    y = ensureSpace(doc, y, 30)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text('INFORMATIONS IMPORTANTES', M, y)
    setDraw(GREY_BORDER)
    doc.line(M, y + 2, pageW - M, y + 2)
    y += 6

    const urgentNotes = visibleNotes.filter(n => n.categorie === 'urgent')
    const importantNotes = visibleNotes.filter(n => n.categorie === 'rappel' || n.categorie === 'demain')
    const infoNotes = visibleNotes.filter(n => !n.categorie || n.categorie === 'info')

    const drawNote = (n: ChantierNote, isUrgent: boolean, isImportant: boolean) => {
      const borderColor: [number, number, number] = isUrgent ? [220, 38, 38] : isImportant ? [245, 158, 11] : [71, 85, 105]
      const bgColor: [number, number, number] = isUrgent ? [254, 242, 242] : isImportant ? [255, 251, 235] : [248, 250, 252]
      const badgeText = isUrgent ? 'URGENT' : isImportant ? 'IMPORTANT' : 'INFO'

      const textLines = doc.splitTextToSize(n.texte, contentW - 24)
      const noteH = Math.max(8, textLines.length * 3.5 + 4)
      y = ensureSpace(doc, y, noteH + 3)

      // Fond
      setFill(bgColor)
      doc.rect(M, y, contentW, noteH, 'F')
      // Bordure gauche colorée
      setFill(borderColor)
      doc.rect(M, y, 1.2, noteH, 'F')

      // Badge
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'bold')
      const badgeW = doc.getTextWidth(badgeText) + 2
      setFill(borderColor)
      doc.roundedRect(M + 3, y + 2, badgeW, 2.8, 0.4, 0.4, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text(badgeText, M + 4, y + 4)

      // Texte
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      setText([51, 65, 85])
      doc.text(textLines, M + 3 + badgeW + 3, y + 4)

      y += noteH + 1.5
    }

    if (urgentNotes.length + importantNotes.length > 0) {
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      setText(MUTED)
      doc.text('À PRÉPARER AVANT NOTRE ARRIVÉE', M, y)
      y += 4
      urgentNotes.forEach(n => drawNote(n, true, false))
      importantNotes.forEach(n => drawNote(n, false, true))
      y += 3
    }
    if (infoNotes.length > 0) {
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      setText(MUTED)
      doc.text('BON À SAVOIR', M, y)
      y += 4
      infoNotes.forEach(n => drawNote(n, false, false))
    }
    y += 4
  }

  // ============ FOOTER : GARANTIES + CONTACT ============
  y = ensureSpace(doc, y, 40)
  setDraw(GREY_BORDER)
  doc.line(M, y, pageW - M, y)
  y += 6

  const garX = M
  const garW = contentW - 60
  const contactX = pageW - M - 55
  const contactW = 55

  // Garanties
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text('GARANTIES', garX, y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  let gy = y + 4
  if (entreprise.decennale_numero) {
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text('Assurance décennale', garX, gy)
    doc.setFont('helvetica', 'normal')
    setText(SLATE)
    doc.text(` : ${entreprise.decennale_numero}`, garX + doc.getTextWidth('Assurance décennale'), gy)
    gy += 3.5
  }
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text('Garantie biennale', garX, gy)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  doc.text(' : 2 ans sur équipements installés.', garX + doc.getTextWidth('Garantie biennale'), gy)
  gy += 3.5
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text('Garantie de parfait achèvement', garX, gy)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  doc.text(' : 1 an.', garX + doc.getTextWidth('Garantie de parfait achèvement'), gy)
  gy += 5

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(garX, gy, garW, 10, 1, 1, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  setText(MUTED)
  const disclaimer = 'Cette planification est indicative. Les dates peuvent être ajustées selon les livraisons matériel ou aléas. Tout changement sera communiqué au minimum 48h à l\'avance.'
  const discLines = doc.splitTextToSize(disclaimer, garW - 4)
  doc.text(discLines, garX + 2, gy + 3.5)

  // Carte contact (droite)
  const contactCardH = 28
  setFill(NAVY)
  doc.roundedRect(contactX, y - 2, contactW, contactCardH, 1.5, 1.5, 'F')

  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(148, 163, 184)
  doc.text('VOTRE CONTACT CHANTIER', contactX + 3, y + 2)

  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(entreprise.nom || 'Artisan', contactX + 3, y + 7)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(203, 213, 225)
  let cy2 = y + 11
  if (entreprise.telephone) { doc.text(entreprise.telephone, contactX + 3, cy2); cy2 += 3.5 }
  if (entreprise.email) {
    const emailLines = doc.splitTextToSize(entreprise.email, contactW - 6)
    doc.text(emailLines, contactX + 3, cy2)
    cy2 += emailLines.length * 3
  }

  y = Math.max(gy + 14, y + contactCardH + 2)

  // ============ SIGNATURES ============
  y = ensureSpace(doc, y, 35)
  const sigW = (contentW - 4) / 2
  const sigH = 28

  // Artisan
  setDraw(GREY_BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, sigW, sigH, 1.5, 1.5, 'S')
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('L\'ARTISAN', M + 3, y + 4)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  doc.text(entreprise.nom || 'Artisan', M + 3, y + 8)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text(today, M + 3, y + 12)

  // Client
  const sigCX = M + sigW + 4
  setFill(GREY_LIGHT)
  doc.roundedRect(sigCX, y, sigW, sigH, 1.5, 1.5, 'F')
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('BON POUR ACCORD — LE CLIENT', sigCX + 3, y + 4)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  doc.text(clientName, sigCX + 3, y + 8)
  setText(MUTED)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('Date :', sigCX + 3, y + 14)
  setDraw([203, 213, 225])
  doc.line(sigCX + 3, y + 18, sigCX + sigW - 3, y + 18)
  doc.text('Signature :', sigCX + 3, y + 22)
  doc.line(sigCX + 3, y + 26, sigCX + sigW - 3, y + 26)

  y += sigH + 6

  // ============ BRAND FOOTER ============
  y = ensureSpace(doc, y, 8)
  setDraw([241, 245, 249])
  doc.line(M, y, pageW - M, y)
  y += 3
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  setText([148, 163, 184])
  doc.text('Document généré avec Nexartis · www.nexartis.fr', pageW / 2, y, { align: 'center' })

  return doc.output('datauristring')
}

// ============ CALENDRIER (rendu manuel avec rect()) ============

function drawCalendar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  phases: Array<{ date_debut: string; date_fin?: string | null; titre?: string | null; color: [number, number, number] }>,
  dateDebut: string,
  dateFin: string
): number {
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])

  // Configuration
  const weekColW = 12 // largeur colonne "Semaine"
  const dayW = (width - weekColW) / 7
  const headerH = 10
  const rowH = 14

  const start = new Date(dateDebut); start.setHours(0, 0, 0, 0)
  const end = new Date(dateFin); end.setHours(0, 0, 0, 0)

  // Lundi de la semaine de début
  const firstMonday = new Date(start)
  const dow = firstMonday.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  firstMonday.setDate(firstMonday.getDate() + diffToMonday)

  // Construire les semaines (max 6 pour tenir sur la page)
  const weeks: Date[][] = []
  const cur = new Date(firstMonday)
  while (cur <= end && weeks.length < 6) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  // Map date -> phase
  const phaseMap = new Map<string, typeof phases[0]>()
  phases.forEach(p => {
    const pStart = new Date(p.date_debut); pStart.setHours(0, 0, 0, 0)
    const pEnd = p.date_fin ? new Date(p.date_fin) : pStart
    pEnd.setHours(0, 0, 0, 0)
    const c = new Date(pStart)
    while (c <= pEnd) {
      const key = c.toISOString().split('T')[0]
      if (!phaseMap.has(key)) phaseMap.set(key, p)
      c.setDate(c.getDate() + 1)
    }
  })

  const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  let curY = y

  // Cadre extérieur global (dessiné à la fin pour être au-dessus)
  const calStartY = y

  weeks.forEach((week, wIdx) => {
    // ==== HEADER de semaine ====
    const weekNum = getWeekNumber(week[0])

    // Cellule "S17"
    setFill([15, 23, 42])
    doc.rect(x, curY, weekColW, headerH, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`S${weekNum}`, x + weekColW / 2, curY + 6, { align: 'center' })

    // Jours
    week.forEach((day, dIdx) => {
      const dx = x + weekColW + dIdx * dayW
      const isWE = dIdx >= 5
      if (isWE) {
        setFill([241, 245, 249])
        doc.rect(dx, curY, dayW, headerH, 'F')
      } else {
        setFill([248, 250, 252])
        doc.rect(dx, curY, dayW, headerH, 'F')
      }
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(isWE ? 148 : 100, isWE ? 163 : 116, isWE ? 184 : 139)
      doc.text(DAYS_SHORT[dIdx], dx + dayW / 2, curY + 3.5, { align: 'center' })
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text(String(day.getDate()).padStart(2, '0'), dx + dayW / 2, curY + 8, { align: 'center' })
    })

    curY += headerH

    // ==== ROW de jours avec phases ====
    // Fond des week-ends
    week.forEach((day, dIdx) => {
      const dx = x + weekColW + dIdx * dayW
      if (dIdx >= 5) {
        setFill([248, 250, 252])
        doc.rect(dx, curY, dayW, rowH, 'F')
      }
    })

    // Parcourir les jours et dessiner les barres de phases par runs contigus
    let i = 0
    while (i < 7) {
      const day = week[i]
      day.setHours(0, 0, 0, 0)
      const key = day.toISOString().split('T')[0]
      const phase = phaseMap.get(key)
      const inChantier = day >= start && day <= end

      if (phase && inChantier) {
        let j = i
        while (j < 7) {
          const kk = week[j].toISOString().split('T')[0]
          const pp = phaseMap.get(kk)
          const inCh = week[j] >= start && week[j] <= end
          if (pp !== phase || !inCh) break
          j++
        }
        const span = j - i
        const bx = x + weekColW + i * dayW + 1
        const bw = span * dayW - 2
        const by = curY + 2
        const bh = rowH - 4

        // Dessiner la barre avec couleur
        setFill(phase.color)
        doc.roundedRect(bx, by, bw, bh, 1.2, 1.2, 'F')

        // Texte sur la barre
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        const titre = phase.titre || 'Phase'
        const maxTextW = bw - 3
        const titreFit = doc.splitTextToSize(titre, maxTextW)[0] || titre
        doc.text(titreFit, bx + 2, by + 5)

        // Sous-texte dates
        doc.setFontSize(5.5)
        doc.setFont('helvetica', 'normal')
        const pStart = new Date(phase.date_debut)
        const pEnd = phase.date_fin ? new Date(phase.date_fin) : pStart
        const dureeP = daysBetween(phase.date_debut, phase.date_fin || phase.date_debut)
        const sub = phase.date_fin && phase.date_fin !== phase.date_debut
          ? `${pStart.getDate()}–${pEnd.getDate()} · ${dureeP}j`
          : `${pStart.getDate()} · 1j`
        const subFit = doc.splitTextToSize(sub, maxTextW)[0] || sub
        doc.text(subFit, bx + 2, by + 8.5)

        i = j
      } else {
        i++
      }
    }

    curY += rowH

    // Trait séparateur de semaine
    if (wIdx < weeks.length - 1) {
      setDraw([226, 232, 240])
      doc.setLineWidth(0.1)
      doc.line(x, curY, x + width, curY)
    }
  })

  // Cadre global
  setDraw([226, 232, 240])
  doc.setLineWidth(0.3)
  doc.roundedRect(x, calStartY, width, curY - calStartY, 1.5, 1.5, 'S')

  return curY
}
