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
  /** Signature dessinée (data URI image) — uploadée dans Profil → Ma signature */
  signature_base64?: string | null
  /** Tampon scanné (data URI image) — uploadé dans Profil → Ma signature */
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
  /** Type de créneau : 'journee' | 'matin' | 'apres_midi' | 'creneau' */
  creneau?: string | null
  heure_debut?: string | null
  heure_fin?: string | null
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

/** Note datée attachée à une intervention (V2) — visible dans le PDF section "À noter pour vous" */
interface InterventionNoteForPdf {
  id: string
  intervention_id: string
  type: 'note_client' | 'presence_requise' | 'presence_obligatoire' | 'preparation' | 'note_artisan'
  texte: string
  /** Date de l'intervention liée (pour le tri chronologique dans le PDF) */
  date_intervention?: string | null
}

export interface ChantierPdfData {
  entreprise: Entreprise
  chantier: Chantier
  client: Client | null
  interventions: PlanningIntervention[]
  intervenants: Intervenant[]
  devis?: DevisForPdf[]
  notes: ChantierNote[]
  /** Notes datées par intervention (V2). Filtrer côté API : exclure 'note_artisan' qui est privé. */
  interventionNotes?: InterventionNoteForPdf[]
  /** Si fourni, ajoute une page de garde "Pacte de chantier" en page 1 (avant le planning). */
  pacteTexte?: string | null
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
  fallbackTitre?: string | null,
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
    // Fallback de titre : objet devis > description devis > numéro devis > titre
    // intervention (pi.titre, mais SEULEMENT si != "Intervention" générique) >
    // titre du chantier > "Intervention" en dernier recours.
    const ivTitre = ivs[0]?.titre as string | undefined
    const ivTitreClean = ivTitre && ivTitre.toLowerCase() !== 'intervention' ? ivTitre : null
    const titre = devisRow?.objet
      || devisRow?.description
      || (devisRow?.numero ? `Devis ${devisRow.numero}` : null)
      || ivTitreClean
      || fallbackTitre
      || 'Phase de chantier'
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

  // ============ PACTE DE CHANTIER (V2 optionnel) ============
  // Le Pacte est désormais ajouté en DERNIÈRE PAGE (cf. retour Jerem).
  // Le client veut d'abord voir le planning concret, le pacte engageant
  // est un bonus à la fin. Le code est déclaré ici (sanitize + variable),
  // mais l'appel à drawPacteCoverPage est fait à la fin, juste avant le return.
  //
  // SANITIZE : on enlève les caractères Unicode étendus que helvetica jsPDF
  // ne peut pas rendre (═, ✓, ✗, etc — ils apparaissent en %P%P ou en ').
  // Ça permet de récupérer proprement les anciens textes sauvegardés en BDD
  // qui contenaient ces caractères avant le fix.
  const sanitizePacteText = (txt: string): string => {
    return txt
      .replace(/[═━─┄┈]/g, '')   // séparateurs horizontaux Unicode → rien
      .replace(/[╔╗╚╝╠╣╦╩╬]/g, '') // coins/jonctions box-drawing → rien
      .replace(/[║┃]/g, '|')        // séparateurs verticaux → |
      .replace(/[✓✔]/g, '+')        // checkmarks → +
      .replace(/[✗✘]/g, '-')        // crosses → -
      .replace(/le la date de réception/g, 'à la date de réception convenue') // anciens templates
      .replace(/le la date de livraison/g, 'à la date de livraison convenue')
      .replace(/\n{3,}/g, '\n\n')   // collapser les sauts de lignes successifs
      .trim()
  }
  const pacteTexte = sanitizePacteText(data.pacteTexte || '')

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

  // ============ CLIENT (+ LIEU si adresse différente) ============
  // Cas standard : chantier chez le client → un seul bloc CLIENT pleine largeur.
  // Cas spécial : adresse de chantier différente de celle du client → 2 blocs.
  const clientName = client
    ? `${client.civilite || ''} ${client.prenom || ''} ${client.nom || ''}`.replace(/\s+/g, ' ').trim()
    : 'Client non renseigné'
  const clientAdresse = client ? [client.adresse, client.code_postal, client.ville].filter(Boolean).join(', ') : ''
  const chantierAdresse = [chantier.adresse_chantier, chantier.code_postal_chantier, chantier.ville_chantier]
    .filter(Boolean).join(', ')
  const lieuDifferent = Boolean(chantierAdresse) && chantierAdresse.toLowerCase() !== clientAdresse.toLowerCase()

  if (lieuDifferent) {
    // ── 2 blocs côte-à-côte (Client + Lieu) ──
    const boxW = (contentW - 4) / 2
    const boxH = 24
    const boxStartY = y

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
    doc.setFont('helvetica', 'bold')
    doc.text(clientName, M + 3, y + 9)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    setText(SLATE)
    let cy = y + 13
    if (clientAdresse) {
      const lines = doc.splitTextToSize(clientAdresse, boxW - 6)
      doc.text(lines, M + 3, cy)
      cy += lines.length * 3.5
    }
    if (client?.telephone) { doc.text(client.telephone, M + 3, cy); cy += 3.5 }
    if (client?.email) { doc.text(client.email, M + 3, cy); cy += 3.5 }

    // Lieu (uniquement si différent du client)
    const lx = M + boxW + 4
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    setText(MUTED)
    doc.text('LIEU DU CHANTIER', lx + 3, y + 4)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    setText(NAVY)
    const adresseLines = doc.splitTextToSize(chantierAdresse, boxW - 6)
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
  } else {
    // ── Bloc CLIENT pleine largeur (cas standard : chantier chez le client) ──
    const boxH = 22
    setFill(GREY_LIGHT)
    doc.roundedRect(M, y, contentW, boxH, 1.5, 1.5, 'F')

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    setText(MUTED)
    doc.text('CLIENT (lieu du chantier)', M + 3, y + 4)
    doc.setFontSize(9.5)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.text(clientName, M + 3, y + 9.5)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    setText(SLATE)
    // Adresse + tel + email sur 1 ou 2 lignes selon la place
    let cy = y + 14
    if (clientAdresse) {
      doc.text(clientAdresse, M + 3, cy)
      cy += 3.5
    }
    const contactInfo = [client?.telephone, client?.email].filter(Boolean).join(' · ')
    if (contactInfo) {
      doc.text(contactInfo, M + 3, cy)
    }
    if (chantier.acces_info) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      setText(MUTED)
      doc.text(`Accès : ${chantier.acces_info}`, M + 3, y + boxH - 2)
    }

    y += boxH + 8
  }

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
  const phasesForInclus = buildPhases(interventions, devis, chantier.titre)
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
      doc.text('INCLUS DANS LE FORFAIT', M + 4, y + 4.5)
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
      doc.text('NON INCLUS (sur devis séparé)', colX + 4, y + 4.5)
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
  const phases = buildPhases(interventions, devis, chantier.titre)
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
      // Plage de dates : firstDay au lastDay
      const dateRange = phase.firstDay && phase.lastDay && phase.firstDay !== phase.lastDay
        ? `${fmtDateShort(phase.firstDay)} au ${fmtDateShort(phase.lastDay)}`
        : phase.firstDay ? fmtDateShort(phase.firstDay) : '—'
      const dureeJours = phase.days.size

      // Calcul du créneau horaire à partir des interventions de la phase.
      // Si toutes les interventions ont le même créneau on l'affiche, sinon on
      // prend les heures min/max ou on indique "Variable".
      const horaires = phase.interventions
        .map(pi => {
          const c = pi.creneau as string | null | undefined
          if (c === 'journee') return '8h - 17h env.'
          if (c === 'matin') return '8h - 12h env.'
          if (c === 'apres_midi') return '13h - 17h env.'
          if (c === 'creneau' && pi.heure_debut && pi.heure_fin) {
            const fmtH = (h: string) => h.replace(':', 'h').replace(/h00$/, 'h')
            return `${fmtH(pi.heure_debut)} - ${fmtH(pi.heure_fin)} env.`
          }
          return null
        })
        .filter(Boolean) as string[]
      const uniqueHoraires = Array.from(new Set(horaires))
      const horaireCol = uniqueHoraires.length === 0
        ? 'Selon avancement'
        : uniqueHoraires.length === 1
          ? uniqueHoraires[0]
          : 'Variable'

      // Colonnes : Phase | Date(s) | Jours | Horaire
      // (Équipe retirée — déjà visible dans la section "Équipe assignée à votre chantier")
      return [
        phase.titre,
        dateRange,
        `${dureeJours} jour${dureeJours > 1 ? 's' : ''}`,
        horaireCol,
      ]
    })

    autoTable(doc, {
      startY: y,
      head: [['Objet des travaux', 'Date(s)', 'Jours', 'Horaire']],
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
        0: { cellWidth: contentW * 0.45 },
        1: { cellWidth: contentW * 0.22 },
        2: { cellWidth: contentW * 0.13 },
        3: { cellWidth: contentW * 0.20 },
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
    y += 4
  }

  // ============ À NOTER POUR VOUS (NEW V2 — notes datées par intervention) ============
  // On affiche uniquement les notes type CLIENT (pas note_artisan qui est privé).
  // Triées par date d'intervention ascendante.
  const notesClient = (data.interventionNotes || [])
    .filter(n => n.type !== 'note_artisan')
    .slice()
    .sort((a, b) => {
      const da = a.date_intervention || '9999-12-31'
      const db = b.date_intervention || '9999-12-31'
      return da.localeCompare(db)
    })

  if (notesClient.length > 0) {
    y = ensureSpace(doc, y, 30)
    y = drawSectionTitle(doc, M, y, contentW, 'À noter pour vous')

    // Couleurs par type (cohérent avec le composant NotesIntervention)
    const typeMeta: Record<string, { bg: [number, number, number]; border: [number, number, number]; label: string; symbol: string }> = {
      note_client:           { bg: [241, 245, 249], border: [148, 163, 184], label: 'Note',                  symbol: '•' },
      presence_requise:      { bg: [254, 243, 199], border: [217, 119, 6],   label: 'Présence souhaitée',    symbol: '⚠' },
      presence_obligatoire:  { bg: [254, 226, 226], border: [220, 38, 38],   label: 'Présence obligatoire',  symbol: '!' },
      preparation:           { bg: [219, 234, 254], border: [37, 99, 235],   label: 'À préparer',            symbol: '▸' },
    }

    notesClient.forEach(note => {
      const meta = typeMeta[note.type] || typeMeta.note_client
      // Format date courte : "lun. 4 mai"
      const dateLabel = note.date_intervention
        ? new Date(note.date_intervention).toLocaleDateString('fr-FR', {
            weekday: 'short', day: 'numeric', month: 'short',
          })
        : ''
      const fullText = `${dateLabel ? dateLabel + ' — ' : ''}${note.texte}`
      const lines = doc.splitTextToSize(fullText, contentW - 22)
      const noteH = Math.max(11, lines.length * 4 + 4)
      y = ensureSpace(doc, y, noteH + 2)

      // Fond
      setFill(meta.bg)
      doc.roundedRect(M, y, contentW, noteH, 1.5, 1.5, 'F')
      // Barre verticale gauche
      setFill(meta.border)
      doc.rect(M, y, 1.5, noteH, 'F')

      // Symbole + label type (mini-pill à gauche)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      setText(meta.border)
      doc.text(meta.symbol, M + 5, y + 5)
      // Petit label type
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text(meta.label.toUpperCase(), M + 11, y + 5)

      // Texte (date + contenu)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      setText([15, 23, 42])
      doc.text(lines, M + 11, y + 9.5)

      y += noteH + 2
    })
    y += 4
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
        doc.text('OK', stepX, stepY + 1.2, { align: 'center' })
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
  // Réécriture en TEXTE PLAT (sans bold/normal mixé via getTextWidth qui calcule
  // mal avec les accents et provoque des chevauchements type "achèvement1 an").
  // On affiche label + valeur en une seule chaîne, en font normal.
  doc.setFont('helvetica', 'normal')
  setText(SLATE)
  if (entreprise.decennale_numero) {
    doc.text(`Assurance décennale : ${entreprise.decennale_numero}`, garX, gy)
    gy += 3.8
  }
  doc.text('Garantie biennale : 2 ans sur équipements installés.', garX, gy)
  gy += 3.8
  doc.text('Garantie de parfait achèvement : 1 an sur les travaux.', garX, gy)
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
  // Bloc "L'ARTISAN" : Date + Signature (image si l'artisan a uploadé une
  // signature/tampon dans son profil, sinon ligne vide à signer à la main).
  y = ensureSpace(doc, y, 32)
  const stampW = 80
  const stampH = 28
  setFill(GREY_LIGHT)
  doc.roundedRect(M, y, stampW, stampH, 1.5, 1.5, 'F')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text("L'ARTISAN", M + 3, y + 4)

  // Date (formattée)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('Date :', M + 3, y + 9)
  doc.setFont('helvetica', 'normal')
  setText(NAVY)
  doc.text(today, M + 14, y + 9)

  // Signature : image si profil l'a, sinon ligne à signer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setText(MUTED)
  doc.text('Signature :', M + 3, y + 15)

  const signatureSrc = entreprise.signature_base64 || entreprise.tampon_base64
  if (signatureSrc && signatureSrc.startsWith('data:image')) {
    try {
      const fmt = signatureSrc.includes('image/png') ? 'PNG' : 'JPEG'
      const ip = doc.getImageProperties(signatureSrc)
      const ratio = ip.width / ip.height
      let sigW = 36
      let sigH = sigW / ratio
      if (sigH > 12) { sigH = 12; sigW = sigH * ratio }
      doc.addImage(signatureSrc, fmt, M + 18, y + 15.5, sigW, sigH)
    } catch { /* ignore — fallback ligne vide */ }
  } else {
    // Ligne pointillée pour signature manuscrite
    setDraw([180, 190, 210])
    doc.setLineDashPattern([0.6, 0.6], 0)
    doc.line(M + 18, y + 22, M + stampW - 4, y + 22)
    doc.setLineDashPattern([], 0)
  }

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

  // ============ PACTE DE CHANTIER (DERNIÈRE PAGE, optionnel) ============
  // Si l'artisan a coché "Inclure le Pacte" lors de l'export, on l'ajoute en
  // toute fin de document. Le client voit d'abord le planning concret (dates,
  // équipe, engagements) puis découvre le pacte à la fin comme un bonus engageant.
  if (pacteTexte) {
    doc.addPage()
    drawPacteCoverPage(doc, {
      pageW,
      M,
      contentW,
      pacteTexte,
      artisanNom: entreprise.nom || 'Artisan',
      artisanLogo: entreprise.logo_url || null,
      clientNom: client
        ? `${client.civilite || ''} ${client.prenom || ''} ${client.nom || ''}`.replace(/\s+/g, ' ').trim()
        : 'Client',
      chantierTitre: chantier.titre || 'Chantier',
    })
  }

  return doc.output('datauristring')
}

// ============ CALENDRIER PAR PHASES — V3 (vue client) ============
// Une ligne = une phase (= un devis/corps de métier).
//
// VISUEL OPTION B :
//   • Background week-end gris clair (jours non travaillés par défaut)
//   • Barre PÂLE de la couleur de la phase, du firstDay au lastDay
//     → indique "phase active sur cette plage" (durée totale visible d'un coup d'œil)
//   • Cases PLEINES couleur vive sur les jours de présence effective
//     → indique "intervention prévue ce jour précis"
//   • Légende explicative sous le calendrier pour le client
//
// Cette représentation combine le meilleur des deux mondes :
//   - lecture rapide de la durée totale (barre pâle continue)
//   - précision sur les jours réels d'intervention (cases pleines)
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

  // Helper : couleur RVB → version pâle (mélange avec blanc à 80%)
  const lighten = (c: [number, number, number], pct: number = 0.8): [number, number, number] => [
    Math.round(c[0] + (255 - c[0]) * pct),
    Math.round(c[1] + (255 - c[1]) * pct),
    Math.round(c[2] + (255 - c[2]) * pct),
  ]

  // Helper : dessine des hachures diagonales dans un rectangle (clipping manuel à 45°)
  // Utilisé pour signaler les jours "hors chantier" (avant date début / après date fin).
  const drawDiagonalStripes = (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    color: [number, number, number] = [148, 163, 184], // slate-400
    spacing: number = 1.4,
  ): void => {
    setDraw(color)
    doc.setLineWidth(0.15)
    // On parcourt l'offset diagonal de -rh à rw + rh, et pour chaque trait on
    // calcule manuellement le clipping aux bords du rectangle (les diagonales
    // sont à 45°, donc dx = dy quand on rogne).
    for (let off = -rh; off < rw + rh; off += spacing) {
      let x1 = rx + off
      let y1 = ry
      let x2 = rx + off + rh
      let y2 = ry + rh
      // Clip bord gauche
      if (x1 < rx) {
        const dx = rx - x1
        x1 = rx
        y1 = ry + dx
      }
      // Clip bord droit
      if (x2 > rx + rw) {
        const dx = x2 - (rx + rw)
        x2 = rx + rw
        y2 -= dx
      }
      // Garde-fou : ne dessine que si le segment est valide et reste dans la box
      if (x1 < x2 && y1 < y2 && x1 < rx + rw && x2 > rx) {
        doc.line(x1, y1, x2, y2)
      }
    }
  }

  const labelColW = 50
  const headerH = 10
  const phaseRowH = 13
  const start = new Date(dateDebut); start.setHours(0, 0, 0, 0)
  const end = new Date(dateFin); end.setHours(0, 0, 0, 0)

  // Ramener au lundi de la semaine de start
  const firstMonday = new Date(start)
  const dow = firstMonday.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  firstMonday.setDate(firstMonday.getDate() + diffToMonday)

  // Construire les semaines (max 8 pour tenir sur la page A4)
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

  // ── HEADER (label PHASE + semaines + jours) ──
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

  // ── LIGNES DE PHASES ──
  phases.forEach((phase, pi) => {
    const rowY = curY

    // Alternance de fond de ligne (zébrage très léger pour lisibilité)
    if (pi % 2 === 1) {
      setFill([250, 251, 253])
      doc.rect(x, rowY, width, phaseRowH, 'F')
    }
    // Trait séparateur très fin entre lignes
    setDraw([241, 245, 249])
    doc.setLineWidth(0.1)
    doc.line(x, rowY, x + width, rowY)

    // ── Background week-ends (sur toutes les lignes) ──
    weeks.forEach((week, wi) => {
      week.forEach((day, di) => {
        if (di >= 5) {
          const dx = x + labelColW + (wi * 7 + di) * dayW
          setFill([241, 245, 249])
          doc.rect(dx, rowY + 0.5, dayW, phaseRowH - 1, 'F')
        }
      })
    })

    // ── Background "hors chantier" (rayures diagonales) ──
    // Hachure les jours qui sont AVANT date_debut OU APRÈS date_fin du chantier.
    // Indique visuellement au client : "ces jours ne font pas partie du chantier"
    // (sans pour autant masquer le contexte de la semaine).
    const startMs = start.getTime()
    const endMs = end.getTime()
    weeks.forEach((week, wi) => {
      week.forEach((day, di) => {
        const dMs = day.getTime()
        if (dMs < startMs || dMs > endMs) {
          const dx = x + labelColW + (wi * 7 + di) * dayW
          drawDiagonalStripes(dx, rowY + 0.5, dayW, phaseRowH - 1)
        }
      })
    })

    // ── Label phase (pastille couleur + nom) ──
    setFill(phase.color)
    doc.roundedRect(x + 2, rowY + 4.5, 3, 4, 0.5, 0.5, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    const titreFit = doc.splitTextToSize(phase.titre, labelColW - 8)[0] || phase.titre
    doc.text(titreFit, x + 7, rowY + 7.5)

    // ── BARRE PÂLE DE LA PHASE (firstDay → lastDay) ──
    // Indique la PLAGE DE LA PHASE même les jours sans intervention.
    if (phase.firstDay && phase.lastDay) {
      const phaseStart = new Date(phase.firstDay)
      const phaseEnd = new Date(phase.lastDay)
      phaseStart.setHours(0, 0, 0, 0)
      phaseEnd.setHours(0, 0, 0, 0)

      // Trouver les positions X de phaseStart et phaseEnd
      let startX: number | null = null
      let endX: number | null = null
      weeks.forEach((week, wi) => {
        week.forEach((day, di) => {
          const d = new Date(day); d.setHours(0, 0, 0, 0)
          if (d.getTime() === phaseStart.getTime()) {
            startX = x + labelColW + (wi * 7 + di) * dayW
          }
          if (d.getTime() === phaseEnd.getTime()) {
            endX = x + labelColW + (wi * 7 + di) * dayW + dayW
          }
        })
      })

      if (startX !== null && endX !== null && endX > startX) {
        const palePhaseColor = lighten(phase.color, 0.78)
        setFill(palePhaseColor)
        doc.roundedRect(startX + 0.5, rowY + 3, endX - startX - 1, phaseRowH - 6, 1, 1, 'F')
      }
    }

    // ── CASES PLEINES (jours de présence effective) ──
    // Au-dessus de la barre pâle, en couleur vive.
    weeks.forEach((week, wi) => {
      week.forEach((day, di) => {
        const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
        const isPresent = phase.days.has(dayKey)
        if (isPresent) {
          const dx = x + labelColW + (wi * 7 + di) * dayW
          setFill(phase.color)
          doc.roundedRect(dx + 1, rowY + 2.5, dayW - 2, phaseRowH - 5, 1, 1, 'F')
        }
      })
    })

    curY += phaseRowH
  })

  // ── Cadre extérieur du calendrier ──
  setDraw([226, 232, 240])
  doc.setLineWidth(0.3)
  doc.roundedRect(x, calStartY, width, curY - calStartY, 1.5, 1.5, 'S')

  // ═══════════════════════════════════════════════════════════════
  // ── LÉGENDE (sous le calendrier) ──
  // ═══════════════════════════════════════════════════════════════
  curY += 4
  const legY = curY
  // Couleur de référence (la 1re phase, sinon bleu standard)
  const refColor: [number, number, number] = phases[0]?.color || [37, 99, 235]
  const refPale = lighten(refColor, 0.78)

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('LECTURE :', x, legY + 3)

  // Sample : couleur pleine (intervention prévue)
  let lx = x + 16
  setFill(refColor)
  doc.roundedRect(lx, legY, 6, 4, 0.5, 0.5, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text('Intervention prévue', lx + 8, legY + 3)

  // Sample : couleur pâle (phase active sans intervention)
  lx = x + 60
  setFill(refPale)
  doc.roundedRect(lx, legY, 6, 4, 0.5, 0.5, 'F')
  doc.text('Phase en cours', lx + 8, legY + 3)

  // Sample : week-end
  lx = x + 100
  setFill([241, 245, 249])
  doc.rect(lx, legY, 6, 4, 'F')
  doc.text('Week-end', lx + 8, legY + 3)

  // Sample : hors chantier (rayé)
  lx = x + 130
  // mini cadre + rayures pour bien voir le motif
  drawDiagonalStripes(lx, legY, 6, 4, [148, 163, 184], 1.0)
  setDraw([203, 213, 225])
  doc.setLineWidth(0.2)
  doc.rect(lx, legY, 6, 4, 'S')
  doc.text('Hors chantier', lx + 8, legY + 3)

  curY += 8

  return curY
}


// ============ PAGE DE GARDE — PACTE DE CHANTIER (rendu en dernière page) ============
// Dessine une page A4 complète : header artisan, badge PACTE DE CHANTIER,
// titre chantier, encart "Entre/Et", corps du pacte, bandeau d'info.
function drawPacteCoverPage(
  doc: jsPDF,
  ctx: {
    pageW: number
    M: number
    contentW: number
    pacteTexte: string
    artisanNom: string
    artisanLogo: string | null
    clientNom: string
    chantierTitre: string
  },
): void {
  const { pageW, M, contentW, pacteTexte, artisanNom, artisanLogo, clientNom, chantierTitre } = ctx
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])

  let y = 16

  // ── Logo + nom artisan en haut (compact) ──
  if (artisanLogo && artisanLogo.startsWith('data:image')) {
    try {
      const fmt = artisanLogo.includes('image/png') ? 'PNG' : 'JPEG'
      const ip = doc.getImageProperties(artisanLogo)
      const ratio = ip.width / ip.height
      let lw = 18
      let lh = lw / ratio
      if (lh > 18) { lh = 18; lw = lh * ratio }
      doc.addImage(artisanLogo, fmt, M, y, lw, lh)
    } catch { /* ignore */ }
  }
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  setText([15, 23, 42])
  doc.text(artisanNom, M + 22, y + 6)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  setText([100, 116, 139])
  doc.text(new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), pageW - M, y + 6, { align: 'right' })
  y += 22

  // ── Trait séparateur ──
  setDraw([90, 180, 224])
  doc.setLineWidth(0.5)
  doc.line(M, y, pageW - M, y)
  y += 14

  // ── Badge "PACTE DE CHANTIER" ──
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  setFill([90, 180, 224])
  const badge = 'PACTE DE CHANTIER'
  const badgeW = doc.getTextWidth(badge) + 6
  doc.roundedRect(M, y, badgeW, 6, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(badge, M + badgeW / 2, y + 4.2, { align: 'center' })
  y += 12

  // ── Gros titre = nom du chantier ──
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  setText([15, 23, 42])
  const titreLines = doc.splitTextToSize(chantierTitre, contentW)
  doc.text(titreLines, M, y + 7)
  y += titreLines.length * 8 + 4

  // ── Encart "Entre [Artisan] et [Client]" ──
  setFill([248, 250, 252])
  const entreH = 18
  doc.roundedRect(M, y, contentW, entreH, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setText([100, 116, 139])
  doc.text('ENTRE', M + 4, y + 5)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setText([15, 23, 42])
  doc.text(artisanNom, M + 4, y + 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setText([100, 116, 139])
  doc.text('ET', M + contentW / 2, y + 5)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setText([15, 23, 42])
  doc.text(clientNom, M + contentW / 2, y + 11)
  y += entreH + 8

  // ── Corps : texte du pacte ──
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  setText([30, 41, 59])
  const pacteLines = doc.splitTextToSize(pacteTexte, contentW - 4)
  doc.text(pacteLines, M + 2, y + 4)
  y += pacteLines.length * 4 + 8

  // ── Bandeau d'info "document informatif" (à la place des signatures retirées) ──
  const noticeY = Math.max(y + 4, 250)
  setFill([248, 250, 252])
  doc.roundedRect(M, noticeY, contentW, 18, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setText([100, 116, 139])
  doc.text('NOTE', M + 4, noticeY + 5.5)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  setText([30, 41, 59])
  const noticeText = "Ce document est INFORMATIF. Il poursuit l'objectif de clarifier nos engagements mutuels pour mener ce chantier sereinement. Le devis signé reste le seul document contractuel."
  const noticeLines = doc.splitTextToSize(noticeText, contentW - 8)
  doc.text(noticeLines, M + 4, noticeY + 10)

  // ── Brand footer ──
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  setText([148, 163, 184])
  doc.text('Document généré avec Nexartis · www.nexartis.fr', pageW / 2, 290, { align: 'center' })
}
