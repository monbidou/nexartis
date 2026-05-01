/**
 * Helper de génération du "Pacte de chantier"
 *
 * Le Pacte est une page de garde OPTIONNELLE du PDF planning chantier.
 * Format engagement mutuel signé par les deux parties (artisan + client).
 * Différenciateur fort : aucun concurrent SaaS ne propose ce document.
 *
 * Le texte est :
 *   - Pré-rempli automatiquement à partir des données du chantier + profil
 *   - Modifiable librement par l'artisan dans la modal d'export
 *   - Sauvegardé dans `chantiers.pacte_chantier_texte` pour ré-édition
 */

interface PacteContext {
  artisanNom?: string | null
  clientNom?: string | null
  chantierTitre?: string | null
  dateDebut?: string | null
  dateFin?: string | null
  engagements?: string | null      // entreprise.engagements_default
  preparationClient?: string | null // chantier.preparation_client
}

/** Format date FR longue : "13 avril 2026" */
function fmtDateFr(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Génère le texte du Pacte de chantier prêt à être édité.
 * Format : intro + bloc engagements artisan + bloc engagements client + clôture.
 */
export function generatePacteTemplate(ctx: PacteContext): string {
  const artisan = ctx.artisanNom?.trim() || 'L\'artisan'
  const client = ctx.clientNom?.trim() || 'Le client'
  const titre = ctx.chantierTitre?.trim() || 'votre chantier'

  // ─── Intro ───
  const debutTxt = ctx.dateDebut ? fmtDateFr(ctx.dateDebut) : 'la date convenue'
  const finTxt = ctx.dateFin ? fmtDateFr(ctx.dateFin) : 'la date de réception'

  // ─── Engagements artisan ───
  // Si l'artisan a renseigné des engagements par défaut dans son profil, on les
  // utilise. Sinon on propose un set minimal cohérent.
  const engagementsArtisan = (ctx.engagements?.trim()
    || `• Démarrer le chantier le ${debutTxt} comme convenu
• Vous tenir informé de l'avancement (photos, SMS)
• Maintenir le site propre et sécurisé
• Vous prévenir au minimum 48h à l'avance en cas de retard ou modification
• Livrer le chantier au plus tard le ${finTxt}, hors aléas documentés`)

  // ─── Engagements client ───
  const engagementsClient = (ctx.preparationClient?.trim()
    || `• Garantir l'accès au chantier aux dates et horaires convenus
• Préparer les lieux avant le démarrage (libération, nettoyage)
• Être présent ou joignable pour les validations clés
• Régler le solde dans les conditions du devis signé`)

  // ─── Texte final ───
  return `Le présent pacte engage moralement les deux parties dans la conduite du chantier «${titre}», dont le démarrage est prévu le ${debutTxt} et la livraison le ${finTxt}.

══════════════════════════════════════════════════
NOS ENGAGEMENTS — ${artisan.toUpperCase()}
══════════════════════════════════════════════════
${engagementsArtisan}

══════════════════════════════════════════════════
VOS ENGAGEMENTS — ${client.toUpperCase()}
══════════════════════════════════════════════════
${engagementsClient}

══════════════════════════════════════════════════
EN CAS D'ALÉA
══════════════════════════════════════════════════
Tout imprévu technique fait l'objet d'un échange transparent et d'un devis complémentaire signé avant exécution. Aucun travail hors devis n'est facturé sans votre accord écrit.

Ce pacte ne remplace ni le devis signé, ni les conditions générales de vente. Il vise simplement à poser les bases d'une collaboration claire et sereine.`
}
