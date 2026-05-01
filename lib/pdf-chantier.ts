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
  /** Modalités d'intervention par défaut (horaires, jours, week-ends) */
  modalites_intervention_default?: string | null
  /** Engagements qualité par défaut (photos, nettoyage, réponse 24h, etc.) */
  engagements_default?: string | null
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
  /** Liste des choses que le client doit préparer avant le démarrage */
  preparation_client?: string | null
  /** Ce qui n'est PAS inclus dans le forfait (anti-litige) */
  non_inclus?: string | null
  /** Modalités personnalisées qui écrasent les modalités du profil */
  modalites_personnalisees?: string | null
  /** Texte personnalisé du Pacte de chantier (si l'option est cochée à l'export) */
  pacte_chantier_texte?: string | null
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
  devis_id?: string | null
}

interface Intervenant {
  id: string
  prenom?: string | null
  nom?: string | null
  metier?: string | null
  type_contrat?: string | null
}

interface DevisForPdf {
  id: string
  numero?: string | null
  objet?: string | null
  description?: string | null
  montant_ttc?: number | null
  /** Montant de l'acompte demandé sur le devis (en €) */
  montant_acompte?: number | null
  /** True si l'acompte a été payé par le client */
  acompte_verse?: boolean | null
  /** Modalités de paiement libres (texte) */
  modalites_paiement?: string | null
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
  devis?: DevisForPdf[]
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

// ============ HELPERS NOUVELLES SECTIONS PDF V2 ============

/**
 * Dessine un titre de section : "TITRE EN MAJUSCULES" + ligne séparatrice.
 * Retourne le nouveau y après le titre.
 */
function drawSectionTitle(doc: jsPDF, x: number, y: number, w: number, label: string): number {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42) // NAVY
  doc.text(label.toUpperCase(), x, y)
  doc.setDrawColor(226, 232, 240) // GREY_BORDER
  doc.line(x, y + 2, x + w, y + 2)
  return y + 6
}

/**
 * Dessine un bloc d'info simple : fond gris + barre verticale colorée + texte multi-lignes.
 * Retourne le nouveau y après le bloc.
 */
function drawInfoBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  texte: string,
  accentColor: [number, number, number],
  bgColor: [number, number, number] = [248, 250, 252],
): number {
  const lines = doc.splitTextToSize(texte, w - 8)
  const h = Math.max(10, lines.length * 4 + 6)
  // Fond
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
  doc.roundedRect(x, y, w, h, 1.2, 1.2, 'F')
  // Barre verticale gauche
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(x, y, 1.2, h, 'F')
  // Texte
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text(lines, x + 5, y + 4.5)
  return y + h + 4
}

/** Calcule la hauteur estimée d'un drawInfoBlock (utile pour ensureSpace avant). */
function estimateInfoBlockHeight(doc: jsPDF, w: number, texte: string): number {
  const lines = doc.splitTextToSize(texte, w - 8)
  return Math.max(10, lines.length * 4 + 6) + 4
}

// ============ PHASES = GROUPEMENT PAR DEVIS ============
// Une "phase" = toutes les interventions planifiées d'un même devis.
// Ce regroupement correspond à la vue CLIENT du planning :
// "Phase Plomberie = 5 jours", "Phase Électricité = 7 jours", etc.
interface Phase {
  id: string                    // soit devis.id, soit "orphan" si aucun devis
  titre: string
  interventions: PlanningIntervention[]
  intervenantIds: Set<string>   // union des intervenants
  days: Set<string>             // jours ISO (YYYY-MM-DD) où la phase est présente
  firstDay: string | null
  lastDay: string | null
  color: [number, number, number]
}

function buildPhases(
  interventions: PlanningIntervention[],
  devis: DevisForPdf[] | undefined,
): Phase[] {
  const devisMap = new Map<string, DevisForPdf>()
  if (devis) devis.forEach(d => devisMap.set(d.id, d))

  // Créer un groupe par devis_id (ou "orphan" si l'intervention n'est liée à aucun devis)
  const groups = new Map<string, PlanningIntervention[]>()
  interventions.forEach(i => {
    const key = i.devis_id || '__orphan__'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(i)
  })

  // Construire les phases (Array.from + forEach pour compat downlevelIteration)
  const phases: Phase[] = []
  let colorIdx = 0
  const entries = Array.from(groups.entries())
  entries.forEach((entry) => {
    const key = entry[0]
    const ivs = entry[1]
    const devisRow = key === '__orphan__' ? null : devisMap.get(key)
    const titre = devisRow?.objet
      || devisRow?.description
      || (devisRow?.numero ? `Devis ${devisRow.numero}` : 'Intervention')
    const intervenantIds = new Set<string>()
    const days = new Set<string>()
    const allDates: string[] = []
    ivs.forEach(iv => {
      if (iv.intervenant_id) intervenantIds.add(iv.intervenant_id)
      const startRaw = iv.date_debut.split('T')[0]
      const endRaw = (iv.date_fin || iv.date_debut).split('T')[0]
      const startD = new Date(startRaw + 'T00:00:00')
      const endD = new Date(endRaw + 'T00:00:00')
      const last = endD < startD ? startD : endD
      const cur = new Date(startD)
      let safety = 0
      while (cur <= last && safety < 120) {
        const dayKey = cur.toISOString().split('T')[0]
        days.add(dayKey)
        allDates.push(dayKey)
        cur.setDate(cur.getDate() + 1)
        safety++
      }
    })
    allDates.sort()
    phases.push({
      id: key,
      titre,
      interventions: ivs,
      intervenantIds,
      days,
      firstDay: allDates[0] || null,
      lastDay: allDates[allDates.length - 1] || null,
      color: PHASE_COLORS[colorIdx % PHASE_COLORS.length],
    })
    colorIdx++
  })

  // Trier les phases par firstDay croissant
  phases.sort((a, b) => {
    if (!a.firstDay) return 1
    if (!b.firstDay) return -1
    return a.firstDay.localeCompare(b.firstDay)
  })

  return phases
}

// ============ MAIN PDF GENERATOR ============

export function generateChantierPlanningPdf(data: ChantierPdfData): string {
  const { entreprise, chantier, client, interventions, intervenants, devis, notes } = data
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
  // Petit espace de respiration entre le header artisan et le titre,
  // + barre verticale bleue à gauche pour donner de l'identité visuelle.
  y += 4
  const titreBlockY = y

  // Barre verticale bleue (couleur Nexartis)
  setFill([90, 180, 224]) // #5ab4e0
  doc.rect(M, y - 1, 1.2, 16, 'F')

  // Label "PLANIFICATION DE CHANTIER"
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('PLANIFICATION DE CHANTIER', M + 4, y + 2)
  y += 6

  // Nom du chantier (gros titre)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  const titreLines = doc.splitTextToSize(chantier.titre || 'Chantier', contentW - 4)
  doc.text(titreLines, M + 4, y + 4)
  y += titreLines.length * 7 + 1

  // Description optionnelle
  const desc = chantier.description_client || chantier.description
  if (desc) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    setText(SLATE)
    const descLines = doc.splitTextToSize(desc, contentW - 4)
    doc.text(descLines, M + 4, y + 1)
    y += descLines.length * 4 + 1
  }

  // Etendre la barre verticale jusqu'a la fin du titre si elle est plus longue
  const titreBlockH = y - titreBlockY
  if (titreBlockH > 16) {
    setFill([90, 180, 224])
    doc.rect(M, titreBlockY - 1, 1.2, titreBlockH + 1, 'F')
  }
  y += 8

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
  // Fallback intelligent : si le chantier n'a pas de date_debut/date_fin_prevue
  // renseignées, on les calcule automatiquement à partir des phases/interventions
  // planifiées (date la plus tôt / la plus tardive). Cela permet au calendrier et
  // aux blocs résumés d'être corrects même si l'artisan n'a pas rempli les dates.
  const phaseStarts = interventions
    .map(p => p.date_debut)
    .filter(Boolean)
    .sort()
  const phaseEnds = interventions
    .map(p => p.date_fin || p.date_debut)
    .filter(Boolean)
    .sort()
  const dateDebut = chantier.date_debut || (phaseStarts[0] ?? null)
  const dateFin = chantier.date_fin_prevue
    || (phaseEnds.length > 0 ? phaseEnds[phaseEnds.length - 1] : null)

  const sumW = (contentW - 8) / 3
  const sumH = 17
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

  // ============ PÉRIMÈTRE DE LA PRESTATION (NEW V2) ============
  // Liste auto des phases (= "Inclus") + champ libre côté chantier (= "Non inclus")
  // Source n°1 des litiges : éviter "je pensais que c'était compris".
  const phasesForInclus = buildPhases(interventions, devis)
  const inclusItems = phasesForInclus.map(p => p.titre).filter(Boolean)
  const nonInclusTexte = (chantier.non_inclus || '').trim()

  if (inclusItems.length > 0 || nonInclusTexte) {
    y = ensureSpace(doc, y, 50)
    y = drawSectionTitle(doc, M, y, contentW, 'Périmètre de la prestation')

    const colW = (contentW - 4) / 2
    const colStartY = y

    // Bloc INCLUS (gauche, vert)
    if (inclusItems.length > 0) {
      const lineH = 3.7
      const inclusH = Math.max(18, 8 + inclusItems.length * lineH + 3)
      // Fond vert pâle
      setFill([240, 253, 244])
      doc.roundedRect(M, y, colW, inclusH, 1.2, 1.2, 'F')
      // Barre verticale verte
      setFill([16, 185, 129])
      doc.rect(M, y, 1.2, inclusH, 'F')
      // Titre
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      setText([6, 78, 59])
      doc.text('✓ INCLUS DANS LE FORFAIT', M + 4, y + 4.5)
      // Items
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      setText([15, 23, 42])
      let iy = y + 9
      inclusItems.forEach(item => {
        doc.setFillColor(16, 185, 129)
        doc.circle(M + 5, iy - 1, 0.6, 'F')
        const itemLines = doc.splitTextToSize(item, colW - 10)
        doc.text(itemLines, M + 8, iy)
        iy += itemLines.length * lineH
      })
    }

    // Bloc NON INCLUS (droite, orange)
    if (nonInclusTexte) {
      const colX = M + colW + 4
      const niLines = doc.splitTextToSize(nonInclusTexte, colW - 8)
      const niH = Math.max(18, 8 + niLines.length * 3.7 + 3)
      // Fond orange pâle
      setFill([255, 247, 237])
      doc.roundedRect(colX, y, colW, niH, 1.2, 1.2, 'F')
      // Barre verticale orange
      setFill([249, 115, 22])
      doc.rect(colX, y, 1.2, niH, 'F')
      // Titre
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      setText([124, 45, 18])
      doc.text('✗ NON INCLUS (sur devis séparé)', colX + 4, y + 4.5)
      // Texte
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      setText([15, 23, 42])
      doc.text(niLines, colX + 4, y + 9)
    }

    // Hauteur max des deux blocs
    const inclusH = inclusItems.length > 0
      ? Math.max(18, 8 + inclusItems.length * 3.7 + 3) : 0
    const niLines2 = nonInclusTexte ? doc.splitTextToSize(nonInclusTexte, (contentW / 2 - 4) - 8) : []
    const niH = nonInclusTexte ? Math.max(18, 8 + niLines2.length * 3.7 + 3) : 0
    y = colStartY + Math.max(inclusH, niH) + 8
  }

  // ============ CALENDRIER ============
  // PHASES = REGROUPEMENT PAR DEVIS (= corps de métier)
  // Ex : "Plomberie" = toutes les interventions du devis plomberie sur plusieurs jours
  const phases = buildPhases(interventions, devis)
  const ivMap = new Map(intervenants.map(iv => [iv.id, iv]))

  if (phases.length > 0 && dateDebut && dateFin) {
    y = ensureSpace(doc, y, 50)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text('CALENDRIER DU CHANTIER', M, y)
    setDraw(GREY_BORDER)
    doc.line(M, y + 2, pageW - M, y + 2)
    y += 8

    y = drawCalendarByPhases(doc, M, y, contentW, phases, dateDebut, dateFin)
    y += 8
  }

  // ============ TABLEAU DÉTAIL PHASES ============
  if (phases.length > 0) {
    y = ensureSpace(doc, y, 30)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text('DÉTAIL DES PHASES', M, y)
    setDraw(GREY_BORDER)
    doc.line(M, y + 2, pageW - M, y + 2)
    y += 6

    const tableBody = phases.map((phase) => {
      // Liste des intervenants assignés à cette phase
      const intervenantsListe = Array.from(phase.intervenantIds)
        .map(id => ivMap.get(id))
        .filter(Boolean)
        .map(iv => {
          const name = `${iv!.prenom || ''} ${iv!.nom || ''}`.trim()
          const role = iv!.metier || iv!.type_contrat || ''
          return role ? `${name} (${role})` : name
        })
        .join('\n') || '—'

      // Plage de dates : firstDay au lastDay
      const dateRange = phase.firstDay && phase.lastDay && phase.firstDay !== phase.lastDay
        ? `${fmtDateShort(phase.firstDay)} au ${fmtDateShort(phase.lastDay)}`
        : phase.firstDay ? fmtDateShort(phase.firstDay) : '—'
      const dureeJours = phase.days.size
      // Colonne "Présence client" supprimée — remplacée par la section
      // dédiée "À noter pour vous" plus bas (alimentée par les notes datées en V2).
      return [
        phase.titre,
        `${dateRange}\n${dureeJours}j de présence`,
        intervenantsListe,
      ]
    })

    autoTable(doc, {
      startY: y,
      head: [['Phase', 'Dates', 'Équipe']],
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
        0: { cellWidth: contentW * 0.5 },
        1: { cellWidth: contentW * 0.22 },
        2: { cellWidth: contentW * 0.28 },
      },
      bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [241, 245, 249] },
      margin: { left: M, right: M },
      didDrawCell: (data) => {
        if (data.column.index === 0 && data.section === 'body') {
          const idx = data.row.index
          if (idx < phases.length) {
            const c = phases[idx].color
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

  // ============ PRÉPARATION À VOTRE CHARGE (NEW V2) ============
  const preparationTexte = (chantier.preparation_client || '').trim()
  if (preparationTexte) {
    y = ensureSpace(doc, y, estimateInfoBlockHeight(doc, contentW, preparationTexte) + 8)
    y = drawSectionTitle(doc, M, y, contentW, 'Préparation à votre charge avant le démarrage')
    y = drawInfoBlock(doc, M, y, contentW, preparationTexte, [148, 163, 184])
    y += 4
  }

  // ============ NOS ENGAGEMENTS (NEW V2 — paramètre profil) ============
  const engagementsTexte = (entreprise.engagements_default || '').trim()
  if (engagementsTexte) {
    y = ensureSpace(doc, y, estimateInfoBlockHeight(doc, contentW, engagementsTexte) + 8)
    y = drawSectionTitle(doc, M, y, contentW, 'Nos engagements sur ce chantier')
    // Bleu Nexartis pour les engagements (positif, qualité)
    y = drawInfoBlock(doc, M, y, contentW, engagementsTexte, [59, 130, 246], [239, 246, 255])
    y += 4
  }

  // ============ MODALITÉS D'INTERVENTION (NEW V2 — chantier > profil par défaut) ============
  const modalitesTexte = ((chantier.modalites_personnalisees || '').trim()
    || (entreprise.modalites_intervention_default || '').trim())
  if (modalitesTexte) {
    y = ensureSpace(doc, y, estimateInfoBlockHeight(doc, contentW, modalitesTexte) + 8)
    y = drawSectionTitle(doc, M, y, contentW, 'Modalités d\'intervention')
    // Jaune ambré (info pratique)
    y = drawInfoBlock(doc, M, y, contentW, modalitesTexte, [234, 179, 8], [254, 252, 232])
    y += 4
  }

  // ============ ÉQUIPE ASSIGNÉE ============
  // Union de tous les intervenants présents sur les phases
  // Union de tous les intervenant_id sans flatMap (compat) ni iterator de Set
  const allIvIds: string[] = []
  phases.forEach(p => {
    Array.from(p.intervenantIds).forEach(id => allIvIds.push(id))
  })
  const uniqueIvIds = Array.from(new Set(allIvIds))
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

  // ============ ÉCHÉANCIER DE PAIEMENT (NEW V2) ============
  // Recap visuel acompte / solde basé sur les devis liés au chantier.
  const totalDevisTtc = (devis || []).reduce((sum, d) => sum + (Number(d.montant_ttc) || 0), 0)
  const totalAcompte = (devis || []).reduce((sum, d) => sum + (Number(d.montant_acompte) || 0), 0)
  const acompteVerse = (devis || []).some(d => d.acompte_verse)

  if (totalDevisTtc > 0) {
    y = ensureSpace(doc, y, 50)
    y = drawSectionTitle(doc, M, y, contentW, 'Échéancier de paiement')

    const eFmt = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
    const rowH = 12
    const echeancierStartY = y

    // Cadre principal
    setDraw(GREY_BORDER)
    doc.setLineWidth(0.3)
    let rowY = y

    // Ligne ACOMPTE (si présent)
    if (totalAcompte > 0) {
      setFill([255, 255, 255])
      doc.rect(M, rowY, contentW, rowH, 'F')
      // Pastille step
      const stepX = M + 5
      const stepY = rowY + rowH / 2
      if (acompteVerse) {
        setFill([209, 250, 229])
        doc.circle(stepX, stepY, 3, 'F')
        setText([6, 95, 70])
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('✓', stepX, stepY + 1.2, { align: 'center' })
      } else {
        setFill([241, 245, 249])
        doc.circle(stepX, stepY, 3, 'F')
        setText([71, 85, 105])
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('1', stepX, stepY + 1, { align: 'center' })
      }
      // Label
      const pct = Math.round((totalAcompte / totalDevisTtc) * 100)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      setText(NAVY)
      doc.text(`Acompte ${pct}%`, M + 12, rowY + 5)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      setText(MUTED)
      doc.text(acompteVerse ? 'Versé à la signature du devis' : 'À verser à la signature du devis', M + 12, rowY + 9)
      // Montant à droite
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      setText(NAVY)
      doc.text(eFmt(totalAcompte), M + contentW - 4, rowY + 7, { align: 'right' })
      // Ligne séparatrice
      setDraw([241, 245, 249])
      doc.line(M, rowY + rowH, M + contentW, rowY + rowH)
      rowY += rowH
    }

    // Ligne SOLDE
    setFill([255, 255, 255])
    doc.rect(M, rowY, contentW, rowH, 'F')
    const stepX2 = M + 5
    const stepY2 = rowY + rowH / 2
    setFill([241, 245, 249])
    doc.circle(stepX2, stepY2, 3, 'F')
    setText([71, 85, 105])
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(totalAcompte > 0 ? '2' : '1', stepX2, stepY2 + 1, { align: 'center' })
    // Label
    const soldePct = totalAcompte > 0 ? Math.round(((totalDevisTtc - totalAcompte) / totalDevisTtc) * 100) : 100
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text(`Solde${totalAcompte > 0 ? ` ${soldePct}%` : ''}`, M + 12, rowY + 5)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    setText(MUTED)
    doc.text('À régler à la réception (sous 8j par virement, chèque ou espèces)', M + 12, rowY + 9)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    doc.text(eFmt(totalDevisTtc - totalAcompte), M + contentW - 4, rowY + 7, { align: 'right' })
    rowY += rowH

    // Ligne TOTAL (bandeau navy)
    setFill(NAVY)
    doc.rect(M, rowY, contentW, 9, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(148, 163, 184)
    doc.text('TOTAL TTC', M + 4, rowY + 6)
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text(eFmt(totalDevisTtc), M + contentW - 4, rowY + 6.2, { align: 'right' })
    rowY += 9

    // Cadre extérieur (sur tout le bloc)
    setDraw(GREY_BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(M, echeancierStartY, contentW, rowY - echeancierStartY, 1.5, 1.5, 'S')

    y = rowY + 6
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

  // ============ TAMPON ARTISAN ============
  // Plus de bloc "Bon pour accord client" : ce document est INFORMATIF
  // (récap planning), pas un contrat à signer. Seul le tampon artisan reste.
  y = ensureSpace(doc, y, 22)
  const stampW = 70
  const stampH = 18
  setFill(GREY_LIGHT)
  doc.roundedRect(M, y, stampW, stampH, 1.5, 1.5, 'F')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text("L'ARTISAN", M + 3, y + 4)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  setText(NAVY)
  doc.text(entreprise.nom || 'Artisan', M + 3, y + 9)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  doc.text(today, M + 3, y + 13)

  y += stampH + 6

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

// ============ CALENDRIER PAR PHASES (vue client) ============
// Une ligne = une phase (= un devis/corps de métier)
// Une barre par jour de présence effective (pas continue : si pas de travail
// le mardi, pas de barre le mardi).
function drawCalendarByPhases(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  phases: Phase[],
  dateDebut: string,
  dateFin: string,
): number {
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])

  const labelColW = 50
  const headerH = 10
  const phaseRowH = 12
  const start = new Date(dateDebut); start.setHours(0, 0, 0, 0)
  const end = new Date(dateFin); end.setHours(0, 0, 0, 0)

  const firstMonday = new Date(start)
  const dow = firstMonday.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  firstMonday.setDate(firstMonday.getDate() + diffToMonday)

  const weeks: Date[][] = []
  const cur = new Date(firstMonday)
  while (cur <= end && weeks.length < 8) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  if (weeks.length === 0) return y

  const totalDayCols = 7 * weeks.length
  const dayW = (width - labelColW) / totalDayCols
  const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  let curY = y
  const calStartY = y

  setFill([15, 23, 42])
  doc.rect(x, curY, labelColW, headerH, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('PHASE', x + labelColW / 2, curY + 6, { align: 'center' })

  weeks.forEach((week, wi) => {
    const weekX = x + labelColW + wi * 7 * dayW
    const weekW = 7 * dayW
    setFill([248, 250, 252])
    doc.rect(weekX, curY, weekW, headerH, 'F')
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    const wn = getWeekNumber(week[0])
    doc.text(`S${wn} - ${week[0].getDate()}/${week[0].getMonth() + 1}`, weekX + weekW / 2, curY + 4, { align: 'center' })
    week.forEach((day, di) => {
      const dx = weekX + di * dayW
      const isWE = di >= 5
      doc.setFontSize(5)
      doc.setTextColor(isWE ? 148 : 100, isWE ? 163 : 116, isWE ? 184 : 139)
      doc.text(DAYS_SHORT[di], dx + dayW / 2, curY + 8, { align: 'center' })
    })
  })
  curY += headerH

  phases.forEach((phase, pi) => {
    const rowY = curY
    if (pi % 2 === 1) {
      setFill([248, 250, 252])
      doc.rect(x, rowY, width, phaseRowH, 'F')
    }
    setDraw([241, 245, 249])
    doc.setLineWidth(0.1)
    doc.line(x, rowY, x + width, rowY)

    setFill(phase.color)
    doc.roundedRect(x + 2, rowY + 4, 3, 4, 0.5, 0.5, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    const titreFit = doc.splitTextToSize(phase.titre, labelColW - 8)[0] || phase.titre
    doc.text(titreFit, x + 7, rowY + 7)

    weeks.forEach((week, wi) => {
      week.forEach((day, di) => {
        // ⚠️ Local format pour eviter le bug timezone (toISOString décale en UTC)
        const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
        const isPresent = phase.days.has(dayKey)
        if (isPresent) {
          const dx = x + labelColW + (wi * 7 + di) * dayW
          setFill(phase.color)
          doc.roundedRect(dx + 0.5, rowY + 2.5, dayW - 1, phaseRowH - 5, 0.5, 0.5, 'F')
        }
      })
    })

    curY += phaseRowH
  })

  setDraw([226, 232, 240])
  doc.setLineWidth(0.3)
  doc.roundedRect(x, calStartY, width, curY - calStartY, 1.5, 1.5, 'S')

  return curY
}
