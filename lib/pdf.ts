// -------------------------------------------------------------------
// Server-side PDF generation for devis & factures
// jsPDF + jspdf-autotable
// Refonte v2 : hiérarchie 3 niveaux (sections / sous-sections / prestations),
// nouvelle palette Nexartis, factures de situation, footer répété.
// -------------------------------------------------------------------

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CellHookData, Styles } from 'jspdf-autotable'

// -------------------------------------------------------------------
// Palette Nexartis (RGB)
// jsPDF ne supporte pas l'alpha sur setFillColor : on utilise les
// équivalents solides calculés sur fond blanc pour les zones « avec
// opacité » (cadres artisan/client, bandeau objet, etc.).
// -------------------------------------------------------------------

const C = {
  navy: [15, 26, 58] as [number, number, number],          // #0f1a3a
  navyText: [15, 26, 58] as [number, number, number],
  sky: [90, 180, 224] as [number, number, number],         // #5ab4e0
  skyPale: [220, 238, 250] as [number, number, number],    // #dceefa (sections)
  skyVeryPale: [232, 244, 251] as [number, number, number],// #e8f4fb (objet, fond artisan)
  skyBorder: [171, 214, 236] as [number, number, number],  // #abd6ec (bordure 40%)
  netBlue: [26, 111, 181] as [number, number, number],     // #1a6fb5 (NET A PAYER, accents)
  netBlueAccent: [45, 139, 201] as [number, number, number], // #2d8bc9
  green: [34, 197, 94] as [number, number, number],        // #22c55e
  greenDark: [21, 128, 61] as [number, number, number],    // #15803d
  greenPale: [220, 246, 227] as [number, number, number],  // #dcf6e3 (fond client)
  greenBorder: [168, 216, 185] as [number, number, number],// #a8d8b9
  orange: [232, 122, 42] as [number, number, number],      // #e87a2a
  muted: [95, 108, 128] as [number, number, number],       // #5f6c80
  border: [230, 236, 242] as [number, number, number],     // #e6ecf2
  white: [255, 255, 255] as [number, number, number],
  black: [40, 40, 40] as [number, number, number],
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n).replace(/ /g, ' ').replace(/ /g, ' ') + ' €'
}

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : ''

function setFill(doc: jsPDF, c: [number, number, number]) { doc.setFillColor(c[0], c[1], c[2]) }
function setDraw(doc: jsPDF, c: [number, number, number]) { doc.setDrawColor(c[0], c[1], c[2]) }
function setText(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(c[0], c[1], c[2]) }

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

export interface Ligne {
  id?: string
  type?: 'section' | 'sous_section' | 'prestation' | 'commentaire' | 'saut_page'
  niveau?: 1 | 2 | 3
  numero?: string
  parent_id?: string | null
  ordre?: number
  designation: string
  quantite?: number
  unite?: string
  prix_unitaire_ht?: number
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
  statut?: string
  date_signature?: string
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
  // Factures de situation
  type?: 'standard' | 'acompte' | 'situation' | 'avoir'
  numero_situation?: number
  pourcentage_situation?: number
  devis_ref?: string
  devis_date?: string
  montant_situation_precedent_ht?: number
  montant_situation_precedent_ttc?: number
  reste_a_facturer_ht?: number
  reste_a_facturer_ttc?: number
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
  const prest = lignes.filter(isPrestation)
  const taux = new Set(prest.map((l) => l.taux_tva ?? 20))
  const mentions: string[] = []
  const allZero = prest.length > 0 && prest.every((l) => (l.taux_tva ?? 20) === 0)
  if (allZero) { mentions.push(TVA_MENTION_AE); return mentions }
  if (taux.has(10)) mentions.push(TVA_MENTION_10)
  if (taux.has(5.5)) mentions.push(TVA_MENTION_5_5)
  return mentions
}

function computeTvaGroups(lignes: Ligne[]): Record<number, number> {
  const groups: Record<number, number> = {}
  for (const l of lignes.filter(isPrestation)) {
    const rate = l.taux_tva ?? 20
    const ht = (l.quantite ?? 0) * (l.prix_unitaire_ht ?? 0)
    groups[rate] = (groups[rate] || 0) + ht * (rate / 100)
  }
  return groups
}

function computeTvaBases(lignes: Ligne[]): Record<number, number> {
  const bases: Record<number, number> = {}
  for (const l of lignes.filter(isPrestation)) {
    const rate = l.taux_tva ?? 20
    const ht = (l.quantite ?? 0) * (l.prix_unitaire_ht ?? 0)
    bases[rate] = (bases[rate] || 0) + ht
  }
  return bases
}

// -------------------------------------------------------------------
// Hiérarchie : normalisation + sous-totaux
// -------------------------------------------------------------------

function isPrestation(l: Ligne): boolean {
  // backward compat : ligne sans type/niveau = prestation
  if (!l.type && !l.niveau) return true
  if (l.type === 'prestation') return true
  if (l.niveau === 3 && l.type !== 'commentaire' && l.type !== 'saut_page') return true
  return false
}

/**
 * Normalise les lignes : si aucune n'a de type/niveau (ancien format),
 * toutes deviennent des prestations niveau 3 avec numéro séquentiel.
 * Sinon, on remplit les niveau/type/numero manquants au mieux.
 */
function normalizeLignes(input: Ligne[]): Ligne[] {
  const hasHierarchy = input.some(l => l.type || l.niveau || l.numero || l.parent_id)

  if (!hasHierarchy) {
    return input.map((l, i) => ({
      ...l,
      type: 'prestation' as const,
      niveau: 3 as const,
      numero: String(i + 1),
    }))
  }

  // Format hiérarchique : on garde tel quel, en complétant les défauts
  return input.map((l, i) => {
    const niveau = (l.niveau ?? (l.type === 'section' ? 1 : l.type === 'sous_section' ? 2 : 3)) as 1 | 2 | 3
    const type = l.type ?? (niveau === 1 ? 'section' : niveau === 2 ? 'sous_section' : 'prestation')
    return {
      ...l,
      niveau,
      type,
      numero: l.numero ?? String(i + 1),
    }
  })
}

/**
 * Calcule les sous-totaux pour chaque section et sous-section.
 * Retourne un Map<id, total HT>.
 *
 * Règle :
 * - Sous-section = somme des prestations dont parent_id = id de la sous-section
 * - Section = somme des sous-totaux de ses sous-sections + somme directe des
 *   prestations dont parent_id = id de la section (cas où il n'y a pas de
 *   sous-section intermédiaire)
 */
export function computeSubtotals(lignes: Ligne[]): Map<string, number> {
  const map = new Map<string, number>()
  const byId = new Map<string, Ligne>()
  for (const l of lignes) if (l.id) byId.set(l.id, l)

  // 1) Sous-totaux des sous-sections (somme des prestations enfants)
  for (const ss of lignes.filter(l => l.type === 'sous_section' && l.id)) {
    const total = lignes
      .filter(l => l.parent_id === ss.id && isPrestation(l))
      .reduce((s, l) => s + (l.quantite ?? 0) * (l.prix_unitaire_ht ?? 0), 0)
    map.set(ss.id as string, total)
  }

  // 2) Sous-totaux des sections (sous-sections enfants + prestations
  //    rattachées directement à la section)
  for (const sec of lignes.filter(l => l.type === 'section' && l.id)) {
    const fromSubs = lignes
      .filter(l => l.parent_id === sec.id && l.type === 'sous_section')
      .reduce((s, ss) => s + (map.get(ss.id as string) ?? 0), 0)
    const fromDirect = lignes
      .filter(l => l.parent_id === sec.id && isPrestation(l))
      .reduce((s, l) => s + (l.quantite ?? 0) * (l.prix_unitaire_ht ?? 0), 0)
    map.set(sec.id as string, fromSubs + fromDirect)
  }

  return map
}

// -------------------------------------------------------------------
// Footer répété sur chaque page
// -------------------------------------------------------------------

function drawFooterAllPages(doc: jsPDF, ent: Entreprise, numero: string) {
  const total = doc.getNumberOfPages()
  const pageW = 210
  const pageH = 297
  const M = 14
  const footerTop = pageH - 14 // y du trait sky

  for (let i = 1; i <= total; i++) {
    doc.setPage(i)

    // Trait sky 0.4mm
    setDraw(doc, C.sky)
    doc.setLineWidth(0.4)
    doc.line(M, footerTop, pageW - M, footerTop)

    let y = footerTop + 3.2

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    setText(doc, C.muted)

    // Ligne 1 : entreprise + adresse + SIRET + email
    const id = [
      ent.nom,
      ent.adresse ? `${ent.adresse}${ent.code_postal || ent.ville ? `, ${ent.code_postal || ''} ${ent.ville || ''}`.replace(/  +/g, ' ').trim() : ''}` : '',
      ent.siret ? `SIRET : ${ent.siret}` : '',
      ent.email ? `Email : ${ent.email}` : '',
    ].filter(Boolean).join(' — ')
    if (id) doc.text(id, pageW / 2, y, { align: 'center', maxWidth: pageW - 2 * M })
    y += 3.2

    // Ligne 2 : tel + décennale
    const line2Parts: string[] = []
    if (ent.telephone) line2Parts.push(`Tél : ${ent.telephone}`)
    if (ent.assurance_nom) {
      line2Parts.push(`Garantie décennale ${ent.assurance_nom}${ent.decennale_numero ? ` (n° ${ent.decennale_numero})` : ''}`)
    }
    if (line2Parts.length) doc.text(line2Parts.join(' — '), pageW / 2, y, { align: 'center', maxWidth: pageW - 2 * M })

    // Coin bas-droit : Page X sur Y + N°
    doc.setFontSize(7)
    setText(doc, C.muted)
    doc.text(`Page ${i} sur ${total} — N° ${numero}`, pageW - M, pageH - 4, { align: 'right' })
  }
}

// -------------------------------------------------------------------
// Header (logo + titre + n° + dates) — partagé devis/facture
// -------------------------------------------------------------------

interface HeaderOpts {
  title: string          // "DEVIS" ou "FACTURE" ou "FACTURE DE SITUATION"
  numero: string
  subtitle?: string      // ex "Situation N° 2"
  refLine?: string       // ex "Sur devis N° D-2025-001 du 01/01/2025"
  dateLine: string       // ligne dates centrée
}

function drawHeader(doc: jsPDF, ent: Entreprise, opts: HeaderOpts, startY: number): number {
  const pageW = 210
  const M = 14
  const centerX = pageW / 2
  const titleTopY = startY

  // Titre centré
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  setText(doc, C.netBlue)
  doc.text(opts.title, centerX, titleTopY + 7, { align: 'center' })

  // N° doc
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  setText(doc, C.muted)
  doc.text(`N° ${opts.numero}`, centerX, titleTopY + 13, { align: 'center' })

  let y = titleTopY + 16

  // Sous-titre éventuel (situation)
  if (opts.subtitle) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    setText(doc, C.netBlueAccent)
    doc.text(opts.subtitle, centerX, y, { align: 'center' })
    y += 4
  }
  if (opts.refLine) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    setText(doc, C.muted)
    doc.text(opts.refLine, centerX, y, { align: 'center' })
    y += 4
  }

  // Logo à gauche, aligné en haut
  if (ent.logo_url && ent.logo_url.startsWith('data:image')) {
    try {
      const logoFormat = ent.logo_url.includes('image/png') ? 'PNG' : 'JPEG'
      const logoTopY = titleTopY + 1
      const logoH = 14
      const imgProps = doc.getImageProperties(ent.logo_url)
      const ratio = imgProps.width / imgProps.height
      let logoW = logoH * ratio
      if (logoW > 45) logoW = 45
      doc.addImage(ent.logo_url, logoFormat, M, logoTopY, logoW, logoH)
    } catch { /* logo invalide, ignoré */ }
  } else if (ent.nom) {
    // Pas de logo : "Nexartis" stylisé / nom entreprise
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    setText(doc, C.orange)
    doc.text(ent.nom, M, titleTopY + 9)
  }

  // Trait sky 0.7mm sous le header
  y += 1
  setFill(doc, C.sky)
  doc.rect(M, y, pageW - 2 * M, 0.7, 'F')
  y += 4

  // Ligne dates
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setText(doc, C.muted)
  doc.text(opts.dateLine, centerX, y, { align: 'center' })
  y += 5

  return y
}

// -------------------------------------------------------------------
// Cadres ARTISAN + CLIENT
// -------------------------------------------------------------------

function drawIdentityBoxes(
  doc: jsPDF,
  ent: Entreprise,
  data: { clientNom: string; clientAdresse?: string },
  y: number,
): number {
  const M = 14
  const boxW = 88
  const lx = M
  const rx = M + boxW + 6
  const padX = 5
  const padTop = 5
  const radius = 1.8

  // --- Mesure contenu ARTISAN ---
  const artisanLines: { text: string; size: number; bold?: boolean; color: [number, number, number] }[] = []
  artisanLines.push({ text: 'A R T I S A N', size: 8, bold: true, color: C.netBlue })
  artisanLines.push({ text: ent.nom || '', size: 11, bold: true, color: C.navyText })
  if (ent.adresse) artisanLines.push({ text: ent.adresse, size: 8.5, color: C.muted })
  if (ent.code_postal || ent.ville) artisanLines.push({ text: `${ent.code_postal || ''} ${ent.ville || ''}`.trim(), size: 8.5, color: C.muted })
  if (ent.siret) artisanLines.push({ text: `SIRET : ${ent.siret}`, size: 8.5, color: C.muted })
  if (ent.telephone) artisanLines.push({ text: `Tél : ${ent.telephone}`, size: 8.5, color: C.muted })

  // --- Mesure contenu CLIENT ---
  const clientLines: { text: string; size: number; bold?: boolean; color: [number, number, number] }[] = []
  clientLines.push({ text: 'C L I E N T', size: 8, bold: true, color: C.greenDark })
  clientLines.push({ text: data.clientNom, size: 11, bold: true, color: C.navyText })
  if (data.clientAdresse) {
    const parts = data.clientAdresse.split('|').map(s => s.trim()).filter(Boolean)
    for (const p of parts) clientLines.push({ text: p, size: 8.5, color: C.muted })
  }

  // Hauteur uniforme
  const lineHeight = (size: number) => size * 0.42 + 1.6
  const heightOf = (lines: { size: number }[]) => lines.reduce((s, l) => s + lineHeight(l.size), 0)
  const hA = heightOf(artisanLines)
  const hC = heightOf(clientLines)
  const boxH = Math.max(hA, hC) + padTop + 4

  // --- Dessin ARTISAN ---
  setFill(doc, C.skyVeryPale)
  doc.roundedRect(lx, y, boxW, boxH, radius, radius, 'F')
  setDraw(doc, C.skyBorder)
  doc.setLineWidth(0.3)
  doc.roundedRect(lx, y, boxW, boxH, radius, radius, 'S')
  // Bordure gauche épaisse 4px ≈ 1.4mm
  setFill(doc, C.sky)
  doc.rect(lx, y, 1.4, boxH, 'F')

  let ay = y + padTop
  for (const line of artisanLines) {
    doc.setFontSize(line.size)
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal')
    setText(doc, line.color)
    ay += line.size * 0.42
    doc.text(line.text, lx + padX, ay, { maxWidth: boxW - padX - 3 })
    ay += 1.6
  }

  // --- Dessin CLIENT ---
  setFill(doc, C.greenPale)
  doc.roundedRect(rx, y, boxW, boxH, radius, radius, 'F')
  setDraw(doc, C.greenBorder)
  doc.setLineWidth(0.3)
  doc.roundedRect(rx, y, boxW, boxH, radius, radius, 'S')
  setFill(doc, C.green)
  doc.rect(rx, y, 1.4, boxH, 'F')

  let cy = y + padTop
  for (const line of clientLines) {
    doc.setFontSize(line.size)
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal')
    setText(doc, line.color)
    cy += line.size * 0.42
    doc.text(line.text, rx + padX, cy, { maxWidth: boxW - padX - 3 })
    cy += 1.6
  }

  return y + boxH + 4
}

// -------------------------------------------------------------------
// Bandeau OBJET
// -------------------------------------------------------------------

function drawObjet(doc: jsPDF, objet: string, y: number): number {
  const M = 14
  const pageW = 210
  const w = pageW - 2 * M
  const h = 8
  setFill(doc, C.skyVeryPale)
  doc.roundedRect(M, y, w, h, 1.5, 1.5, 'F')
  // Trait gauche 4px (≈1.4mm) — on le rectangle plein qui recouvre la zone
  setFill(doc, C.sky)
  doc.rect(M, y, 1.4, h, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  setText(doc, C.netBlueAccent)
  doc.text('OBJET :', M + 4, y + 5.2)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  setText(doc, C.navyText)
  doc.text(objet, M + 22, y + 5.2, { maxWidth: w - 24 })

  return y + h + 3
}

// -------------------------------------------------------------------
// Tableau hiérarchique (sections / sous-sections / prestations)
// -------------------------------------------------------------------

interface RowMeta {
  kind: 'section' | 'sous_section' | 'prestation' | 'commentaire'
  ligneIdx: number
}

function drawHierTable(doc: jsPDF, lignes: Ligne[], startY: number): number {
  const M = 14
  const pageW = 210
  const tableW = pageW - 2 * M

  const subtotals = computeSubtotals(lignes)

  // Construction des lignes du tableau dans l'ordre des `lignes` reçues
  const body: (string | { content: string; styles?: Partial<Styles> })[][] = []
  const meta: RowMeta[] = []

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i]
    if (l.type === 'saut_page') continue

    if (l.type === 'section') {
      const sub = (l.id && subtotals.get(l.id)) || 0
      body.push([
        l.numero ?? '',
        l.designation,
        '', '', '',
        fmt(sub),
      ])
      meta.push({ kind: 'section', ligneIdx: i })
    } else if (l.type === 'sous_section') {
      const sub = (l.id && subtotals.get(l.id)) || 0
      body.push([
        l.numero ?? '',
        l.designation,
        '', '', '',
        fmt(sub),
      ])
      meta.push({ kind: 'sous_section', ligneIdx: i })
    } else if (l.type === 'commentaire') {
      body.push([
        l.numero ?? '',
        l.designation,
        '', '', '', '',
      ])
      meta.push({ kind: 'commentaire', ligneIdx: i })
    } else {
      // prestation (default)
      const q = l.quantite ?? 0
      const pu = l.prix_unitaire_ht ?? 0
      body.push([
        l.numero ?? '',
        l.designation,
        String(q),
        l.unite ?? '',
        fmt(pu),
        fmt(q * pu),
      ])
      meta.push({ kind: 'prestation', ligneIdx: i })
    }
  }

  autoTable(doc, {
    startY,
    head: [['N°', 'DÉSIGNATION', 'QTÉ', 'UNITÉ', 'PRIX U. HT', 'TOTAL HT']],
    body,
    theme: 'plain',
    margin: { left: M, right: M },
    tableWidth: tableW,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: C.border,
      lineWidth: 0.1,
      textColor: C.navyText,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2.8,
      lineWidth: 0,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 13 },
      3: { halign: 'center', cellWidth: 13 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 26 },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section !== 'body') return
      const m = meta[data.row.index]
      if (!m) return

      if (m.kind === 'section') {
        data.cell.styles.fillColor = C.skyPale
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.cellPadding = 2.8
        if (data.column.index === 0) {
          data.cell.styles.textColor = C.netBlue
        } else if (data.column.index === 5) {
          data.cell.styles.textColor = C.netBlue
          data.cell.styles.halign = 'right'
        } else {
          data.cell.styles.textColor = C.navy
        }
      } else if (m.kind === 'sous_section') {
        data.cell.styles.fillColor = C.white
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.cellPadding = 2.6
        if (data.column.index === 0) {
          data.cell.styles.textColor = C.muted
          data.cell.styles.fontStyle = 'normal'
        } else if (data.column.index === 5) {
          data.cell.styles.textColor = C.navy
          data.cell.styles.halign = 'right'
        } else {
          data.cell.styles.textColor = C.navy
        }
      } else if (m.kind === 'commentaire') {
        data.cell.styles.fillColor = C.white
        data.cell.styles.textColor = C.muted
        data.cell.styles.fontStyle = 'italic'
      } else {
        // prestation
        if (data.column.index === 0) {
          data.cell.styles.textColor = C.muted
        } else if (data.column.index === 3) {
          data.cell.styles.textColor = C.muted
        } else if (data.column.index === 5) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.textColor = C.navy
        }
      }
    },
    didDrawCell: (data: CellHookData) => {
      // Trait gauche d'accent pour les bandeaux SECTION (4px sky sur la première colonne)
      if (data.section === 'body' && data.column.index === 0) {
        const m = meta[data.row.index]
        if (m?.kind === 'section') {
          setFill(doc, C.netBlue)
          doc.rect(data.cell.x, data.cell.y, 1.2, data.cell.height, 'F')
        }
      }
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 4
}

// -------------------------------------------------------------------
// Bloc totaux + NET A PAYER (à droite)
// -------------------------------------------------------------------

interface TotalsOpts {
  ht: number
  ttc: number
  tvaGroups: Record<number, number>
  netLabel?: string
  netAmount?: number
}

function drawTotals(doc: jsPDF, opts: TotalsOpts, y: number): number {
  const pageW = 210
  const M = 14
  const rightX = pageW - M - 80   // bloc large 80mm
  const labelX = rightX
  const valueX = pageW - M

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Total HT
  setText(doc, C.muted); doc.text('Total HT', labelX, y)
  setText(doc, C.navy); doc.setFont('helvetica', 'bold'); doc.text(fmt(opts.ht), valueX, y, { align: 'right' })
  y += 5

  // TVA par taux
  doc.setFont('helvetica', 'normal')
  const sortedRates = Object.keys(opts.tvaGroups).map(Number).sort((a, b) => a - b)
  for (const rate of sortedRates) {
    setText(doc, C.muted); doc.text(`TVA ${rate}%`, labelX, y)
    setText(doc, C.navy); doc.text(fmt(opts.tvaGroups[rate]), valueX, y, { align: 'right' })
    y += 4.5
  }

  // Total TTC
  setText(doc, C.muted); doc.text('Total TTC', labelX, y)
  setText(doc, C.navy); doc.setFont('helvetica', 'bold'); doc.text(fmt(opts.ttc), valueX, y, { align: 'right' })
  y += 6

  // NET A PAYER bandeau
  const netH = 11
  const netW = 80
  setFill(doc, C.netBlue)
  doc.roundedRect(rightX, y, netW, netH, 2, 2, 'F')
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); setText(doc, C.white)
  doc.text(opts.netLabel ?? 'NET À PAYER', rightX + 4, y + netH / 2 + 1.5)
  doc.setFontSize(12)
  doc.text(fmt(opts.netAmount ?? opts.ttc), valueX - 1, y + netH / 2 + 2, { align: 'right' })
  y += netH + 3

  return y
}

// -------------------------------------------------------------------
// Ventilation TVA (tableau simple aligné à droite)
// -------------------------------------------------------------------

function drawTvaBreakdown(doc: jsPDF, lignes: Ligne[], y: number): number {
  const groups = computeTvaGroups(lignes)
  const bases = computeTvaBases(lignes)
  const rates = Object.keys(groups).map(Number).sort((a, b) => a - b)
  if (rates.length === 0) return y

  const pageW = 210
  const M = 14
  const rightX = pageW - M - 80
  const valueX = pageW - M

  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); setText(doc, C.muted)
  doc.text('VENTILATION TVA', rightX, y)
  y += 3

  setDraw(doc, C.border); doc.setLineWidth(0.2)
  doc.line(rightX, y, valueX, y); y += 3

  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  for (const r of rates) {
    setText(doc, C.muted); doc.text(`Taux ${r}%`, rightX, y)
    setText(doc, C.navy); doc.text(`Base : ${fmt(bases[r] ?? 0)}`, rightX + 26, y)
    doc.text(fmt(groups[r]), valueX, y, { align: 'right' })
    y += 4
  }

  return y + 1
}

// ===================================================================
// DEVIS PDF
// ===================================================================

export function generateDevisPdf(data: DevisData): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ent = data.entreprise
  const lignes = normalizeLignes(data.lignes)

  // ── HEADER ──
  const dateParts: string[] = []
  dateParts.push(`Date : ${fmtDate(data.date_emission)}`)
  if (data.date_validite) dateParts.push(`Valide jusqu'au : ${fmtDate(data.date_validite)}`)
  if (data.duree_travaux) dateParts.push(`Durée estimée : ${data.duree_travaux}`)

  let y = drawHeader(doc, ent, {
    title: 'DEVIS',
    numero: data.numero,
    dateLine: dateParts.join(' | '),
  }, 12)

  // ── CADRES ARTISAN + CLIENT ──
  y = drawIdentityBoxes(doc, ent, { clientNom: data.clientNom, clientAdresse: data.clientAdresse }, y)

  // ── OBJET ──
  if (data.objet) y = drawObjet(doc, data.objet, y)

  // ── TABLE HIÉRARCHIQUE ──
  y = drawHierTable(doc, lignes, y)

  // ── TOTAUX (à droite) ──
  // Vérifie qu'on a la place pour le bloc totaux + signatures
  const NEEDED_BOTTOM = 95
  if (y + NEEDED_BOTTOM > 270) { doc.addPage(); y = 20 }

  const tvaGroups = computeTvaGroups(lignes)
  const totalsStartY = y
  let rightY = drawTotals(doc, {
    ht: data.montant_ht,
    ttc: data.montant_ttc,
    tvaGroups,
  }, y)

  // ── ACOMPTE (devis uniquement) ──
  if (data.acompte_pourcent && data.acompte_pourcent > 0) {
    const M = 14, pageW = 210
    const rightX = pageW - M - 80
    const valueX = pageW - M
    const acompteTTC = data.montant_ttc * (data.acompte_pourcent / 100)
    const resteTTC = data.montant_ttc - acompteTTC

    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); setText(doc, C.greenDark)
    doc.text(`Acompte (${data.acompte_pourcent}%)`, rightX, rightY)
    doc.text(fmt(acompteTTC), valueX, rightY, { align: 'right' })
    rightY += 4
    doc.setFont('helvetica', 'normal'); setText(doc, C.muted)
    doc.text('Reste à facturer', rightX, rightY)
    doc.text(fmt(resteTTC), valueX, rightY, { align: 'right' })
    rightY += 5
  }

  // ── VENTILATION TVA (sous totaux à droite, si plusieurs taux) ──
  if (Object.keys(tvaGroups).length > 1) {
    rightY = drawTvaBreakdown(doc, lignes, rightY + 1)
  }

  // ── COLONNE GAUCHE : conditions + mentions ──
  let leftY = totalsStartY
  const M = 14
  const leftMaxW = 88

  if (data.conditions_paiement) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); setText(doc, C.navy)
    doc.text('Conditions de paiement', M, leftY); leftY += 4
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); setText(doc, C.muted)
    const split = doc.splitTextToSize(data.conditions_paiement, leftMaxW)
    doc.text(split, M, leftY); leftY += split.length * 3.2 + 3
  }

  // Mentions TVA (italique, petit)
  const tvaMentions = getTvaMentions(lignes)
  if (tvaMentions.length > 0) {
    doc.setFontSize(6.5); doc.setFont('helvetica', 'italic'); setText(doc, C.muted)
    for (const m of tvaMentions) {
      const split = doc.splitTextToSize(m, leftMaxW)
      doc.text(split, M, leftY); leftY += split.length * 2.6 + 1.5
    }
  }

  // Déchets AGEC
  if (data.dechets && (data.dechets.nature || data.dechets.collecte_nom)) {
    leftY += 1
    setDraw(doc, C.border); doc.setLineWidth(0.2)
    doc.line(M, leftY, M + leftMaxW, leftY); leftY += 2.5
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); setText(doc, C.muted)
    doc.text('GESTION DES DÉCHETS (AGEC)', M, leftY); leftY += 3
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); setText(doc, C.muted)
    const dechParts: string[] = []
    if (data.dechets.nature) dechParts.push(`Nature : ${data.dechets.nature}`)
    if (data.dechets.responsable) dechParts.push(data.dechets.responsable)
    if (data.dechets.tri) dechParts.push(`Tri : ${data.dechets.tri}`)
    if (data.dechets.collecte_nom) dechParts.push(`Collecte : ${data.dechets.collecte_nom}${data.dechets.collecte_type ? ` (${data.dechets.collecte_type})` : ''}`)
    const dechWrapped = doc.splitTextToSize(dechParts.join(' · '), leftMaxW)
    doc.text(dechWrapped, M, leftY); leftY += dechWrapped.length * 2.8
  }

  // ── SIGNATURES (bas de page, 2 cadres dashed) ──
  let sigY = Math.max(leftY, rightY) + 4
  // Hauteur minimale réservée
  if (sigY > 250) { doc.addPage(); sigY = 25 }

  const pageW = 210
  const sigBoxW = (pageW - 2 * M - 6) / 2  // 2 colonnes égales
  const sigH = 28
  const sigLeftX = M
  const sigRightX = M + sigBoxW + 6

  // Dashed approximation : on fait des petits segments
  const drawDashedRect = (x: number, yy: number, w: number, h: number, color: [number, number, number]) => {
    setDraw(doc, color); doc.setLineWidth(0.3)
    const dash = 1.6, gap = 1.2
    let cx = x
    while (cx < x + w) {
      const end = Math.min(cx + dash, x + w)
      doc.line(cx, yy, end, yy)
      doc.line(cx, yy + h, end, yy + h)
      cx += dash + gap
    }
    let cy = yy
    while (cy < yy + h) {
      const end = Math.min(cy + dash, yy + h)
      doc.line(x, cy, x, end)
      doc.line(x + w, cy, x + w, end)
      cy += dash + gap
    }
  }

  // Cadre ARTISAN
  drawDashedRect(sigLeftX, sigY, sigBoxW, sigH, C.sky)
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); setText(doc, C.netBlue)
  doc.text('A R T I S A N', sigLeftX + 3, sigY + 5)
  const artisanVisual = ent.signature_base64 || ent.tampon_base64
  if (artisanVisual) {
    try { doc.addImage(artisanVisual, 'PNG', sigLeftX + 4, sigY + 7, 0, sigH - 12) } catch { /* ignore */ }
  }

  // Cadre CLIENT
  drawDashedRect(sigRightX, sigY, sigBoxW, sigH, C.green)
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); setText(doc, C.greenDark)
  doc.text('C L I E N T', sigRightX + 3, sigY + 5)

  const isAccepte = data.statut === 'signe' || data.statut === 'facture'
  if (isAccepte) {
    if (data.client_signature_base64) {
      try { doc.addImage(data.client_signature_base64, 'PNG', sigRightX + 4, sigY + 7, 0, sigH - 14) } catch { /* ignore */ }
    } else {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); setText(doc, C.greenDark)
      doc.text('Bon pour accord', sigRightX + sigBoxW / 2, sigY + sigH / 2 + 1, { align: 'center' })
    }
    if (data.date_signature) {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); setText(doc, C.muted)
      doc.text(`Le ${fmtDate(data.date_signature)}`, sigRightX + sigBoxW / 2, sigY + sigH - 3, { align: 'center' })
    }
  } else {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); setText(doc, C.muted)
    doc.text('Date et signature précédées de "Bon pour accord"', sigRightX + sigBoxW / 2, sigY + sigH - 3, { align: 'center' })
  }

  drawFooterAllPages(doc, ent, data.numero)
  return doc.output('datauristring').split(',')[1]
}

// ===================================================================
// FACTURE PDF
// ===================================================================

export function generateFacturePdf(data: FactureData): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ent = data.entreprise
  const lignes = normalizeLignes(data.lignes)
  const isSituation = data.type === 'situation'

  const dateParts: string[] = []
  dateParts.push(`Date : ${fmtDate(data.date_emission)}`)
  if (data.date_echeance) dateParts.push(`Échéance : ${fmtDate(data.date_echeance)}`)
  if (data.date_prestation) dateParts.push(`Prestation : ${fmtDate(data.date_prestation)}`)

  const headerOpts: HeaderOpts = isSituation
    ? {
      title: 'FACTURE DE SITUATION',
      numero: data.numero,
      subtitle: data.numero_situation ? `Situation N° ${data.numero_situation}` : undefined,
      refLine: data.devis_ref ? `Sur devis N° ${data.devis_ref}${data.devis_date ? ` du ${fmtDate(data.devis_date)}` : ''}` : undefined,
      dateLine: dateParts.join(' | '),
    }
    : {
      title: 'FACTURE',
      numero: data.numero,
      dateLine: dateParts.join(' | '),
    }

  let y = drawHeader(doc, ent, headerOpts, 12)
  y = drawIdentityBoxes(doc, ent, { clientNom: data.clientNom, clientAdresse: data.clientAdresse }, y)
  if (data.objet) y = drawObjet(doc, data.objet, y)

  if (isSituation) {
    const M = 14, pageW = 210
    const w = pageW - 2 * M
    const pct = data.pourcentage_situation ?? 0
    const totalTTC = data.montant_ttc / (pct > 0 ? pct / 100 : 1)
    const desc = `Situation #${data.numero_situation ?? '?'} pour le devis n° ${data.devis_ref ?? '-'}${data.devis_date ? ` du ${fmtDate(data.devis_date)}` : ''} - ${pct}% TTC sur un montant total de ${fmt(totalTTC)} TTC`

    setFill(doc, C.skyVeryPale)
    const blockH = 22
    doc.roundedRect(M, y, w, blockH, 2, 2, 'F')
    setFill(doc, C.sky); doc.rect(M, y, 1.4, blockH, 'F')

    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); setText(doc, C.netBlueAccent)
    doc.text('DESCRIPTION DE LA SITUATION', M + 5, y + 5.5)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); setText(doc, C.navy)
    const split = doc.splitTextToSize(desc, w - 10)
    doc.text(split, M + 5, y + 11)
    y += blockH + 4

    autoTable(doc, {
      startY: y,
      head: [['DÉSIGNATION', 'TOTAL HT']],
      body: [[`Situation N° ${data.numero_situation ?? '?'} (${pct}%)`, fmt(data.montant_ht)]],
      theme: 'plain',
      margin: { left: M, right: M },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: C.navy, lineColor: C.border, lineWidth: 0.1 },
      headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right', cellWidth: 32 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4
  } else {
    y = drawHierTable(doc, lignes, y)
  }

  const NEEDED_BOTTOM = 75
  if (y + NEEDED_BOTTOM > 270) { doc.addPage(); y = 20 }

  const tvaGroups = computeTvaGroups(lignes)
  const totalsStartY = y
  let rightY = drawTotals(doc, {
    ht: data.montant_ht,
    ttc: data.montant_ttc,
    tvaGroups,
  }, y)

  if (isSituation && (data.reste_a_facturer_ht !== undefined || data.reste_a_facturer_ttc !== undefined)) {
    const M = 14, pageW = 210
    const rightX = pageW - M - 80
    const valueX = pageW - M

    if (data.reste_a_facturer_ht !== undefined) {
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); setText(doc, C.muted)
      doc.text('Reste à facturer HT', rightX, rightY)
      setText(doc, C.navy); doc.text(fmt(data.reste_a_facturer_ht), valueX, rightY, { align: 'right' })
      rightY += 4
    }
    if (data.reste_a_facturer_ttc !== undefined) {
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); setText(doc, C.netBlue)
      doc.text('Reste à facturer TTC', rightX, rightY)
      doc.text(fmt(data.reste_a_facturer_ttc), valueX, rightY, { align: 'right' })
      rightY += 5
    }
  }

  if (Object.keys(tvaGroups).length > 1) {
    rightY = drawTvaBreakdown(doc, lignes, rightY + 1)
  }

  let leftY = totalsStartY
  const M = 14
  const leftMaxW = 88

  if (data.notes) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); setText(doc, C.navy)
    doc.text('Conditions de paiement', M, leftY); leftY += 4
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); setText(doc, C.muted)
    const split = doc.splitTextToSize(data.notes, leftMaxW)
    doc.text(split, M, leftY); leftY += split.length * 3.2 + 3
  }

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); setText(doc, C.muted)
  doc.text('Pénalités de retard : 3x le taux d\'intérêt légal en vigueur.', M, leftY); leftY += 3
  if (data.clientType === 'professionnel') {
    doc.text('Indemnité forfaitaire recouvrement : 40 €.', M, leftY); leftY += 3
  }
  doc.text('Escompte pour paiement anticipé : néant.', M, leftY); leftY += 4

  if (ent.iban && ent.iban.trim()) {
    const ribW = leftMaxW
    const ribH = 18
    setFill(doc, [248, 250, 252])
    setDraw(doc, [200, 200, 200]); doc.setLineWidth(0.3)
    doc.roundedRect(M, leftY, ribW, ribH, 1.5, 1.5, 'FD')

    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); setText(doc, C.netBlue)
    doc.text('POUR RÉGLER PAR VIREMENT', M + 3, leftY + 4.5)

    const ibanClean = ent.iban.replace(/\s+/g, '').toUpperCase()
    const ibanFormatted = ibanClean.match(/.{1,4}/g)?.join(' ') || ibanClean
    doc.setFontSize(8); doc.setFont('courier', 'bold'); setText(doc, C.navy)
    doc.text(`IBAN : ${ibanFormatted}`, M + 3, leftY + 9)
    if (ent.bic && ent.bic.trim()) {
      doc.setFontSize(7.5)
      doc.text(`BIC : ${ent.bic.trim().toUpperCase()}`, M + 3, leftY + 13)
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); setText(doc, C.muted)
    doc.text(`Bénéficiaire : ${ent.nom || ''}`, M + 3, leftY + 16.5)
    leftY += ribH + 3
  }

  const tvaMentions = getTvaMentions(lignes)
  if (tvaMentions.length > 0) {
    doc.setFontSize(6.5); doc.setFont('helvetica', 'italic'); setText(doc, C.muted)
    for (const m of tvaMentions) {
      const split = doc.splitTextToSize(m, leftMaxW)
      doc.text(split, M, leftY); leftY += split.length * 2.6 + 1.5
    }
  }
  doc.setFontSize(6.5); doc.setFont('helvetica', 'italic'); setText(doc, C.muted)
  doc.text('Facture émise conformément aux articles L441-3 et suivants du Code de commerce.', M, leftY, { maxWidth: leftMaxW })

  drawFooterAllPages(doc, ent, data.numero)
  return doc.output('datauristring').split(',')[1]
}
