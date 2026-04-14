/**
 * Template HTML pour l'export PDF d'une planification chantier.
 * Retourne une string HTML complete (avec <!DOCTYPE> et CSS inline).
 * Utilisee par /api/export-chantier-pdf avec Puppeteer.
 */

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
  heure_debut?: string | null
  heure_fin?: string | null
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
  equipe: { intervenant_id: string }[]
  notes: ChantierNote[]
}

// ============ HELPERS ============
function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatDateShort(d: string | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function daysBetween(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}

function workingDays(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
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

function generateRef(chantierId: string): string {
  const year = new Date().getFullYear()
  const short = chantierId.replace(/-/g, '').substring(0, 6).toUpperCase()
  return `PL-${year}-${short}`
}

function getTodayFr(): string {
  return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Couleurs fixes pour les phases (ordre = cycle)
const PHASE_COLORS = [
  { bg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', dot: '#2563eb' },
  { bg: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', dot: '#0d9488' },
  { bg: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', dot: '#4338ca' },
  { bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', dot: '#d97706' },
  { bg: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', dot: '#7c3aed' },
  { bg: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)', dot: '#be123c' },
]

// ============ MAIN TEMPLATE ============
export function renderChantierPdfHtml(data: ChantierPdfData): string {
  const { entreprise, chantier, client, interventions, intervenants, notes } = data

  // === HEADER ARTISAN ===
  const artisanName = escapeHtml(entreprise.nom) || 'Entreprise'
  const artisanAdresse = [entreprise.adresse, entreprise.code_postal, entreprise.ville]
    .filter(Boolean).map(s => escapeHtml(s)).join(', ')
  const artisanSiret = escapeHtml(entreprise.siret) || '—'
  const artisanNaf = escapeHtml(entreprise.code_naf) || '—'
  const artisanTel = escapeHtml(entreprise.telephone) || '—'
  const artisanEmail = escapeHtml(entreprise.email) || '—'
  const artisanDecennale = escapeHtml(entreprise.decennale_numero) || 'À renseigner'

  const logoHtml = entreprise.logo_url
    ? `<img src="${escapeHtml(entreprise.logo_url)}" alt="Logo" style="width:88px;height:88px;object-fit:contain;border-radius:8px;" />`
    : `<div class="logo-slot">LOGO<br>DE<br>L'ARTISAN</div>`

  // === CLIENT ===
  const clientName = client
    ? `${escapeHtml(client.civilite)} ${escapeHtml(client.prenom)} ${escapeHtml(client.nom)}`.trim()
    : 'Client non renseigné'
  const clientAdresse = client
    ? [client.adresse, client.code_postal, client.ville].filter(Boolean).map(s => escapeHtml(s)).join(', ')
    : ''

  // === CHANTIER INFOS ===
  const chantierTitle = escapeHtml(chantier.titre) || 'Chantier'
  const chantierDesc = escapeHtml(chantier.description_client || chantier.description) || ''
  const chantierAdresse = [chantier.adresse_chantier, chantier.code_postal_chantier, chantier.ville_chantier]
    .filter(Boolean).map(s => escapeHtml(s)).join(', ')
  const accesInfo = escapeHtml(chantier.acces_info) || ''

  // === RÉSUMÉ ===
  const dateDebut = chantier.date_debut
  const dateFin = chantier.date_fin_prevue
  const nbJoursOuvres = workingDays(dateDebut, dateFin)
  const nbJoursTotal = daysBetween(dateDebut, dateFin)

  // === PHASES (regroupement des interventions par titre ou par intervenant) ===
  // On trie par date_debut
  const sortedInterventions = [...interventions].sort((a, b) =>
    new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
  )

  // Map intervenants
  const ivMap = new Map(intervenants.map(iv => [iv.id, iv]))

  // Phase index (pour couleur)
  const phasesWithColor = sortedInterventions.map((i, idx) => ({
    ...i,
    color: PHASE_COLORS[idx % PHASE_COLORS.length],
    colorIdx: idx % PHASE_COLORS.length,
  }))

  // === CALENDRIER ===
  // On construit une grille de semaines couvrant date_debut → date_fin
  const calendarHtml = renderCalendar(phasesWithColor, dateDebut, dateFin)

  // === TABLEAU DÉTAIL PHASES ===
  const phasesTableHtml = phasesWithColor.map(p => {
    const iv = p.intervenant_id ? ivMap.get(p.intervenant_id) : null
    const ivName = iv ? `${iv.prenom ?? ''} ${iv.nom ?? ''}`.trim() : '—'
    const ivRole = iv?.metier || iv?.type_contrat || ''
    const dateRange = p.date_fin && p.date_fin !== p.date_debut
      ? `${formatDateShort(p.date_debut)} → ${formatDateShort(p.date_fin)}`
      : formatDateShort(p.date_debut)
    const duree = daysBetween(p.date_debut, p.date_fin || p.date_debut)
    return `
      <tr>
        <td>
          <div class="phase-pill" style="--dot:${p.color.dot}">${escapeHtml(p.titre) || 'Phase'}</div>
          ${p.description_travaux ? `<div class="phase-desc">${escapeHtml(p.description_travaux)}</div>` : ''}
        </td>
        <td>
          <strong>${dateRange}</strong><br>
          <span style="color:#64748b;font-size:11px;">${duree} jour${duree > 1 ? 's' : ''}</span>
        </td>
        <td class="phase-team">
          ${escapeHtml(ivName)}
          ${ivRole ? `<span class="phase-team-line">${escapeHtml(ivRole)}</span>` : ''}
        </td>
        <td><span class="presence-badge pres-yes">À confirmer</span></td>
      </tr>
    `
  }).join('')

  // === ÉQUIPE ===
  const uniqueIvIds = Array.from(new Set(sortedInterventions.map(i => i.intervenant_id).filter(Boolean))) as string[]
  const teamHtml = uniqueIvIds.map(ivId => {
    const iv = ivMap.get(ivId)
    if (!iv) return ''
    const name = `${iv.prenom ?? ''} ${iv.nom ?? ''}`.trim()
    const role = iv.metier || ''
    const tag = iv.type_contrat === 'sous-traitant' ? 'Sous-traitant' : 'Salarié'
    const tagCls = iv.type_contrat === 'sous-traitant' ? 'st' : ''
    return `
      <div class="team-member">
        <div class="tm-avatar ${tagCls}">${initials(iv.prenom, iv.nom)}</div>
        <div class="tm-info">
          <div class="tm-name">${escapeHtml(name)}</div>
          <div class="tm-role">${escapeHtml(role)}</div>
          <span class="tm-tag ${tagCls}">${tag}</span>
        </div>
      </div>
    `
  }).join('')

  // === NOTES VISIBLES DANS PDF ===
  const visibleNotes = notes.filter(n => n.visible_in_pdf === true)
  const urgentNotes = visibleNotes.filter(n => n.categorie === 'urgent')
  const importantNotes = visibleNotes.filter(n => n.categorie === 'rappel' || n.categorie === 'demain')
  const infoNotes = visibleNotes.filter(n => n.categorie === 'info' || !n.categorie)

  const notesHtml = (urgentNotes.length + importantNotes.length + infoNotes.length > 0) ? `
    <div class="section-title">Informations importantes</div>
    <div class="notes-wrap">
      ${(urgentNotes.length + importantNotes.length > 0) ? `
        <div class="notes-title">À préparer avant notre arrivée</div>
        ${urgentNotes.map(n => `
          <div class="note-personal urgent">
            <span class="note-badge urgent">Urgent</span>
            <div class="note-content">${escapeHtml(n.texte)}</div>
          </div>
        `).join('')}
        ${importantNotes.map(n => `
          <div class="note-personal">
            <span class="note-badge important">Important</span>
            <div class="note-content">${escapeHtml(n.texte)}</div>
          </div>
        `).join('')}
      ` : ''}
      ${infoNotes.length > 0 ? `
        <div class="notes-title">Bon à savoir</div>
        ${infoNotes.map(n => `
          <div class="note-personal info">
            <span class="note-badge info">Info</span>
            <div class="note-content">${escapeHtml(n.texte)}</div>
          </div>
        `).join('')}
      ` : ''}
    </div>
  ` : ''

  const ref = generateRef(chantier.id)
  const today = getTodayFr()

  // === HTML COMPLET ===
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Planning — ${chantierTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 0; }
  body {
    font-family: 'Helvetica Neue', 'Arial', sans-serif;
    color: #0f172a;
    font-size: 12px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { padding: 48px 44px 36px; min-height: 100vh; }
  .artisan-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; margin-bottom: 32px;
  }
  .artisan-left { display: flex; gap: 16px; }
  .logo-slot {
    width: 88px; height: 88px; border: 2px dashed #cbd5e1; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; text-align: center;
    font-size: 10px; color: #94a3b8; font-weight: 600; line-height: 1.3; background: #f8fafc;
  }
  .artisan-info { padding-top: 4px; }
  .artisan-name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.3px; }
  .artisan-details { font-size: 10px; line-height: 1.6; color: #475569; }
  .artisan-details span { color: #94a3b8; }
  .doc-meta { text-align: right; }
  .doc-type {
    display: inline-block; padding: 3px 9px; background: #0f172a; color: white;
    font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
    border-radius: 4px; margin-bottom: 6px;
  }
  .doc-ref { font-size: 10px; color: #64748b; }
  .doc-num { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .doc-date { font-size: 10px; color: #64748b; margin-top: 4px; }

  .chantier-title { margin-bottom: 26px; }
  .chantier-label { font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px; }
  .chantier-name { font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.2; letter-spacing: -0.5px; }
  .chantier-desc { font-size: 13px; color: #475569; margin-top: 6px; line-height: 1.5; }

  .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
  .info-card { background: #f8fafc; border-radius: 10px; padding: 14px 16px; }
  .info-card-label { font-size: 9px; letter-spacing: 1.3px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 8px; }
  .info-card-content { font-size: 12px; line-height: 1.6; color: #0f172a; }
  .info-card-content strong { font-weight: 700; }
  .info-card-content em { color: #64748b; font-style: normal; font-size: 11px; }

  .summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
  .summary-box { padding: 14px 16px; border: 1.5px solid #e2e8f0; border-radius: 10px; position: relative; overflow: hidden; }
  .summary-box::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; }
  .summary-box.blue::before { background: linear-gradient(90deg, #2563eb, #3b82f6); }
  .summary-box.green::before { background: linear-gradient(90deg, #059669, #10b981); }
  .summary-box.amber::before { background: linear-gradient(90deg, #d97706, #f59e0b); }
  .summary-box.blue .summary-box-value { color: #2563eb; }
  .summary-box.green .summary-box-value { color: #059669; }
  .summary-box.amber .summary-box-value { color: #d97706; }
  .summary-box-label { font-size: 8px; letter-spacing: 1.3px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .summary-box-value { font-size: 19px; font-weight: 800; color: #0f172a; margin-top: 4px; letter-spacing: -0.5px; }
  .summary-box-sub { font-size: 9px; color: #64748b; margin-top: 2px; }

  .section-title {
    font-size: 10px; font-weight: 800; color: #0f172a; text-transform: uppercase;
    letter-spacing: 1.6px; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;
  }

  .calendar { background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .cal-header {
    display: grid; grid-template-columns: 50px repeat(7, 1fr);
    background: #f8fafc; border-bottom: 1px solid #e2e8f0;
  }
  .cal-cell-h { padding: 8px 3px; font-size: 9px; font-weight: 700; text-align: center; color: #64748b; border-right: 1px solid #e2e8f0; }
  .cal-cell-h:last-child { border-right: none; }
  .cal-cell-h.weekend { background: #f1f5f9; color: #94a3b8; }
  .cal-cell-h .day-num { display: block; font-size: 12px; color: inherit; margin-top: 2px; font-weight: 800; }
  .cal-week-label { padding: 8px 4px; font-size: 9px; font-weight: 700; color: white; background: #0f172a; text-align: center; border-right: 1px solid #e2e8f0; }
  .cal-row { display: grid; grid-template-columns: 50px repeat(7, 1fr); position: relative; min-height: 44px; border-bottom: 1px solid #f1f5f9; }
  .cal-row:last-child { border-bottom: none; }
  .cal-day-cell { border-right: 1px solid #f1f5f9; position: relative; }
  .cal-day-cell.weekend { background: #f8fafc; }
  .cal-day-cell:last-child { border-right: none; }
  .phase-bar {
    position: absolute; top: 6px; bottom: 6px; left: 3px; right: 3px;
    border-radius: 5px; padding: 4px 8px; color: white; font-size: 9px;
    font-weight: 700; line-height: 1.2; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex; flex-direction: column; justify-content: center; overflow: hidden;
  }
  .phase-bar .phase-days { font-size: 8px; font-weight: 500; opacity: 0.85; margin-top: 1px; }

  .phases-detail { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-top: 14px; }
  .phases-detail thead th { padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; border-bottom: 2px solid #0f172a; }
  .phases-detail tbody td { padding: 11px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .phase-pill { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; color: #0f172a; font-size: 11px; }
  .phase-pill::before { content: ''; width: 9px; height: 9px; border-radius: 2px; display: inline-block; background: var(--dot); }
  .phase-desc { color: #475569; font-size: 10px; margin-top: 3px; line-height: 1.4; }
  .phase-team { font-size: 10px; color: #0f172a; font-weight: 600; }
  .phase-team-line { display: block; margin-top: 2px; font-size: 9px; color: #64748b; font-weight: 500; }
  .presence-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; border: 1px solid; }
  .pres-yes { background: #f0fdf4; color: #166534; border-color: #86efac; }
  .pres-no { background: #f8fafc; color: #64748b; border-color: #cbd5e1; }

  .team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .team-member { display: flex; gap: 10px; padding: 11px; background: #f8fafc; border-radius: 10px; align-items: center; }
  .tm-avatar { width: 38px; height: 38px; border-radius: 50%; background: #0f172a; color: white; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .tm-avatar.st { background: #64748b; }
  .tm-info { font-size: 11px; min-width: 0; }
  .tm-name { font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tm-role { color: #64748b; font-size: 9px; margin-top: 2px; }
  .tm-tag { display: inline-block; padding: 2px 6px; background: #e2e8f0; color: #0f172a; font-size: 8px; font-weight: 700; border-radius: 3px; margin-top: 3px; }
  .tm-tag.st { background: #1e293b; color: white; }

  .notes-wrap { margin-bottom: 20px; }
  .note-personal { display: flex; gap: 10px; padding: 12px 14px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 6px; margin-bottom: 7px; font-size: 11px; }
  .note-personal.info { background: #f8fafc; border-left-color: #475569; }
  .note-personal.urgent { background: #fef2f2; border-left-color: #dc2626; }
  .note-badge { display: inline-block; padding: 2px 7px; font-size: 8px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; border-radius: 3px; flex-shrink: 0; height: fit-content; margin-top: 1px; }
  .note-badge.urgent { background: #dc2626; color: white; }
  .note-badge.important { background: #f59e0b; color: white; }
  .note-badge.info { background: #475569; color: white; }
  .note-content { color: #334155; line-height: 1.45; flex: 1; font-size: 11px; }
  .note-content strong { color: #0f172a; font-weight: 700; }
  .notes-title { font-size: 8px; letter-spacing: 1.1px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-top: 14px; margin-bottom: 6px; }

  .footer-row { margin-top: 32px; padding-top: 22px; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 230px; gap: 20px; align-items: start; }
  .guarantees-block { font-size: 10px; color: #475569; line-height: 1.6; }
  .guarantees-block h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 1.3px; color: #0f172a; margin-bottom: 8px; font-weight: 800; }
  .guarantees-block strong { color: #0f172a; }
  .guarantees-disclaimer { margin-top: 10px; padding: 8px 10px; background: #f8fafc; border-radius: 6px; font-size: 9px; font-style: italic; color: #64748b; line-height: 1.4; }

  .contact-card { background: #0f172a; color: white; padding: 16px; border-radius: 10px; }
  .contact-card-title { font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
  .contact-card-name { font-size: 13px; font-weight: 800; margin-bottom: 8px; }
  .contact-card-line { font-size: 10px; color: #cbd5e1; margin-top: 3px; }

  .signatures-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 30px; }
  .sig-block { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; min-height: 110px; position: relative; }
  .sig-block.client { background: #f8fafc; }
  .sig-label { font-size: 9px; letter-spacing: 1.1px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 8px; }
  .sig-content { font-size: 10px; color: #475569; }
  .sig-date { font-size: 10px; color: #0f172a; font-weight: 700; margin-top: 4px; }
  .sig-client-line { font-size: 9px; color: #64748b; padding-bottom: 14px; border-bottom: 1px solid #cbd5e1; margin-top: 8px; }

  .brand-footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 8px; color: #94a3b8; letter-spacing: 0.5px; }
  .brand-footer strong { color: #64748b; font-weight: 700; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER ARTISAN -->
  <div class="artisan-header">
    <div class="artisan-left">
      ${logoHtml}
      <div class="artisan-info">
        <div class="artisan-name">${artisanName}</div>
        <div class="artisan-details">
          ${artisanAdresse || '<em>Adresse non renseignée</em>'}<br>
          <span>SIRET</span> ${artisanSiret} · <span>APE</span> ${artisanNaf}<br>
          ${artisanTel} · ${artisanEmail}<br>
          <span>Décennale</span> ${artisanDecennale}
        </div>
      </div>
    </div>
    <div class="doc-meta">
      <span class="doc-type">Planning Chantier</span>
      <div class="doc-ref">Référence</div>
      <div class="doc-num">${ref}</div>
      <div class="doc-date">Émis le ${today}</div>
    </div>
  </div>

  <!-- TITRE CHANTIER -->
  <div class="chantier-title">
    <div class="chantier-label">Planification de chantier</div>
    <div class="chantier-name">${chantierTitle}</div>
    ${chantierDesc ? `<div class="chantier-desc">${chantierDesc}</div>` : ''}
  </div>

  <!-- CLIENT + LIEU -->
  <div class="two-cols">
    <div class="info-card">
      <div class="info-card-label">Client</div>
      <div class="info-card-content">
        <strong>${clientName}</strong><br>
        ${clientAdresse || '—'}<br>
        ${escapeHtml(client?.telephone) || ''}${client?.telephone && client?.email ? '<br>' : ''}
        ${escapeHtml(client?.email) || ''}
      </div>
    </div>
    <div class="info-card">
      <div class="info-card-label">Lieu du chantier</div>
      <div class="info-card-content">
        <strong>${chantierAdresse || 'Adresse non renseignée'}</strong>
        ${accesInfo ? `<br><em>${accesInfo}</em>` : ''}
      </div>
    </div>
  </div>

  <!-- RÉSUMÉ -->
  <div class="summary-row">
    <div class="summary-box blue">
      <div class="summary-box-label">Durée totale</div>
      <div class="summary-box-value">${nbJoursOuvres} jour${nbJoursOuvres > 1 ? 's' : ''}</div>
      <div class="summary-box-sub">ouvrés (${nbJoursTotal}j calendaires)</div>
    </div>
    <div class="summary-box green">
      <div class="summary-box-label">Démarrage</div>
      <div class="summary-box-value">${formatDate(dateDebut)}</div>
      <div class="summary-box-sub">${dateDebut ? new Date(dateDebut).toLocaleDateString('fr-FR', {weekday:'long'}) : ''}</div>
    </div>
    <div class="summary-box amber">
      <div class="summary-box-label">Fin prévue</div>
      <div class="summary-box-value">${formatDate(dateFin)}</div>
      <div class="summary-box-sub">${dateFin ? new Date(dateFin).toLocaleDateString('fr-FR', {weekday:'long'}) : ''}</div>
    </div>
  </div>

  <!-- CALENDRIER -->
  ${phasesWithColor.length > 0 ? `
    <div class="section-title">Calendrier du chantier</div>
    ${calendarHtml}
  ` : ''}

  <!-- DÉTAIL PHASES -->
  ${phasesWithColor.length > 0 ? `
    <div class="section-title">Détail des phases</div>
    <table class="phases-detail">
      <thead>
        <tr>
          <th style="width:35%;">Phase</th>
          <th style="width:18%;">Dates</th>
          <th style="width:27%;">Équipe</th>
          <th style="width:20%;">Présence client</th>
        </tr>
      </thead>
      <tbody>${phasesTableHtml}</tbody>
    </table>
  ` : '<div class="section-title">Planning</div><div style="padding:20px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:10px;">Aucune intervention planifiée pour ce chantier.</div>'}

  <!-- ÉQUIPE -->
  ${teamHtml ? `
    <div class="section-title">Équipe assignée à votre chantier</div>
    <div class="team-grid">${teamHtml}</div>
  ` : ''}

  <!-- NOTES -->
  ${notesHtml}

  <!-- GARANTIES + CONTACT -->
  <div class="footer-row">
    <div class="guarantees-block">
      <h4>Garanties</h4>
      ${entreprise.decennale_numero ? `<strong>Assurance décennale</strong> : ${artisanDecennale}<br>` : ''}
      <strong>Garantie biennale</strong> : 2 ans sur équipements installés.<br>
      <strong>Garantie de parfait achèvement</strong> : 1 an sur les travaux.
      <div class="guarantees-disclaimer">
        Cette planification est indicative. Les dates peuvent être ajustées selon les livraisons matériel ou aléas. Tout changement sera communiqué au minimum 48h à l'avance.
      </div>
    </div>
    <div class="contact-card">
      <div class="contact-card-title">Votre contact chantier</div>
      <div class="contact-card-name">${artisanName}</div>
      <div class="contact-card-line">${artisanTel}</div>
      <div class="contact-card-line">${artisanEmail}</div>
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="signatures-row">
    <div class="sig-block">
      <div class="sig-label">L'artisan</div>
      <div class="sig-content">${artisanName}</div>
      <div class="sig-date">${today}</div>
    </div>
    <div class="sig-block client">
      <div class="sig-label">Bon pour accord — Le client</div>
      <div class="sig-content">${clientName}</div>
      <div class="sig-client-line"><strong>Date :</strong></div>
      <div class="sig-client-line"><strong>Signature :</strong></div>
    </div>
  </div>

  <div class="brand-footer">
    Document généré avec <strong>Nexartis</strong> · www.nexartis.fr
  </div>

</div>
</body>
</html>`
}

// ============ CALENDRIER — rendu semaine par semaine ============
function renderCalendar(
  phases: Array<{ date_debut: string; date_fin?: string | null; titre?: string | null; color: typeof PHASE_COLORS[0] }>,
  dateDebut: string | null | undefined,
  dateFin: string | null | undefined
): string {
  if (!dateDebut || !dateFin) return '<div style="padding:20px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:10px;">Dates du chantier non renseignées.</div>'

  const start = new Date(dateDebut)
  const end = new Date(dateFin)

  // Ramener start au lundi de sa semaine
  const firstMonday = new Date(start)
  const dow = firstMonday.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  firstMonday.setDate(firstMonday.getDate() + diffToMonday)

  const weeks: Date[][] = []
  const cur = new Date(firstMonday)
  // Limiter à 6 semaines max pour tenir sur la page
  while (cur <= end && weeks.length < 6) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cur)
      week.push(d)
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  // Map date -> phase
  const phaseMap = new Map<string, typeof phases[0]>()
  phases.forEach(p => {
    const pStart = new Date(p.date_debut)
    const pEnd = p.date_fin ? new Date(p.date_fin) : pStart
    const c = new Date(pStart)
    while (c <= pEnd) {
      const key = c.toISOString().split('T')[0]
      if (!phaseMap.has(key)) phaseMap.set(key, p)
      c.setDate(c.getDate() + 1)
    }
  })

  const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  let html = '<div class="calendar">'
  weeks.forEach((week, wIdx) => {
    const weekNum = getWeekNumber(week[0])
    // Header
    html += `<div class="cal-header" ${wIdx > 0 ? 'style="border-top:1px solid #e2e8f0;"' : ''}>`
    html += `<div class="cal-cell-h" style="background:#0f172a;color:white;">S${weekNum}</div>`
    week.forEach((day, dIdx) => {
      const isWE = dIdx >= 5
      html += `<div class="cal-cell-h ${isWE ? 'weekend' : ''}">${DAYS_SHORT[dIdx]}<span class="day-num">${String(day.getDate()).padStart(2, '0')}</span></div>`
    })
    html += '</div>'

    // Row avec barres de phases (une cellule par jour, mais on dessine une barre par tranche continue)
    html += '<div class="cal-row">'
    html += `<div class="cal-week-label">S${weekNum}</div>`

    // Parcourir les 7 jours et détecter les runs de la même phase
    let i = 0
    while (i < 7) {
      const day = week[i]
      const key = day.toISOString().split('T')[0]
      const phase = phaseMap.get(key)
      const isWE = i >= 5
      const inChantier = day >= start && day <= end

      if (phase && inChantier) {
        // Trouver la fin de la run
        let j = i
        while (j < 7) {
          const k = week[j].toISOString().split('T')[0]
          if (phaseMap.get(k) !== phase || week[j] > end) break
          j++
        }
        const span = j - i
        const duree = daysBetween(phase.date_debut, phase.date_fin || phase.date_debut)
        const phaseTitle = escapeHtml(phase.titre) || 'Phase'
        const phaseDates = `${formatDateShort(phase.date_debut)}${phase.date_fin && phase.date_fin !== phase.date_debut ? ' → ' + formatDateShort(phase.date_fin) : ''}`
        html += `<div class="cal-day-cell" style="grid-column: span ${span};"><div class="phase-bar" style="background:${phase.color.bg};">${phaseTitle}<span class="phase-days">${phaseDates} · ${duree}j</span></div></div>`
        i = j
      } else {
        html += `<div class="cal-day-cell ${isWE ? 'weekend' : ''}"></div>`
        i++
      }
    }
    html += '</div>'
  })
  html += '</div>'

  return html
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
