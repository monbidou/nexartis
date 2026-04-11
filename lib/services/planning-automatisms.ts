/**
 * AUTOMATISMES PLANNING
 * Services pour creer/mettre a jour interventions depuis chantier
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Creer une intervention de planning a partir d'un chantier
 * (appele depuis l'onglet "A planifier" apres devis signe)
 */
export async function createPlanningFromChantier(
  chantier_id: string,
  intervention_data: {
    titre: string
    description_travaux?: string
    date_debut: string // YYYY-MM-DD
    date_fin?: string
    heure_debut?: string // HH:mm
    heure_fin?: string
    intervenant_id?: string
    devis_id?: string
  }
) {
  const supabase = createClient()

  // Recuperer chantier pour recuperer client_id
  const { data: chantier } = await supabase
    .from('chantiers')
    .select('*, client_id, devis_original_id')
    .eq('id', chantier_id)
    .single()

  if (!chantier) throw new Error('Chantier non trouve')

  // Creer intervention
  const { data: intervention, error } = await supabase
    .from('planning_interventions')
    .insert({
      user_id: chantier.user_id,
      chantier_id,
      client_id: chantier.client_id,
      devis_id: intervention_data.devis_id || chantier.devis_original_id,
      titre: intervention_data.titre,
      description_travaux: intervention_data.description_travaux,
      date_debut: intervention_data.date_debut,
      date_fin: intervention_data.date_fin,
      heure_debut: intervention_data.heure_debut || '08:00',
      heure_fin: intervention_data.heure_fin || '17:00',
      intervenant_id: intervention_data.intervenant_id,
      statut: 'planifie'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return intervention
}

/**
 * Quand intervenant complete l'intervention (statut -> "termine") :
 * - Logger les heures reelles (heure_reelle_debut, heure_reelle_fin)
 * - Valider pour facturation
 */
export async function validateInterventionForFacturation(
  intervention_id: string,
  validation_data: {
    heure_reelle_debut?: string
    heure_reelle_fin?: string
  }
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('planning_interventions')
    .update({
      statut: 'termine',
      heure_reelle_debut: validation_data.heure_reelle_debut || null,
      heure_reelle_fin: validation_data.heure_reelle_fin || null,
      validation_intervenant_date: new Date().toISOString()
    })
    .eq('id', intervention_id)

  if (error) throw new Error(error.message)

  return { status: 'success', message: 'Intervention validee' }
}

/**
 * Recuperer toutes les interventions d'un chantier
 * (pour affichage dans detail chantier)
 */
export async function getChantierInterventions(chantier_id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('planning_interventions')
    .select(
      `
      *,
      intervenant:intervenants(*),
      devis:devis(numero, montant_ttc, statut)
      `
    )
    .eq('chantier_id', chantier_id)
    .order('date_debut', { ascending: true })

  if (error) throw new Error(error.message)

  return data
}

/**
 * Dupliquer une intervention (meme artisan, jour suivant)
 * Utile si travail sur plusieurs jours
 */
export async function duplicateIntervention(
  intervention_id: string,
  new_date_debut: string
) {
  const supabase = createClient()

  const { data: original } = await supabase
    .from('planning_interventions')
    .select('*')
    .eq('id', intervention_id)
    .single()

  if (!original) throw new Error('Intervention non trouvee')

  const { data: duplicate, error } = await supabase
    .from('planning_interventions')
    .insert({
      ...original,
      id: undefined, // Laisser generer nouveau UUID
      created_at: undefined,
      updated_at: undefined,
      date_debut: new_date_debut,
      date_fin: new_date_debut, // Meme jour
      statut: 'planifie'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return duplicate
}

/**
 * Recuperer les interventions a planifier (chantiers signes sans planning)
 */
export async function getChantiersToPlan(user_id: string) {
  const supabase = createClient()

  // Chantiers signes sans interventions
  const { data: chantiers } = await supabase
    .from('chantiers')
    .select(
      `
      *,
      client:clients(nom, prenom),
      interventions:planning_interventions(id)
      `
    )
    .eq('user_id', user_id)
    .eq('statut', 'signe')
    .order('created_at', { ascending: true })

  // Filtrer ceux sans interventions
  const to_plan = chantiers?.filter(c => !c.interventions || c.interventions.length === 0) || []

  return to_plan
}

export { logPlanningEvent }

// ---------------------------------------------------------
// Helper: Logger les events
// ---------------------------------------------------------

async function logPlanningEvent(
  supabase: ReturnType<typeof createClient>,
  event: {
    user_id: string
    intervention_id: string
    old_statut: string
    new_statut: string
    action_type: string
  }
) {
  try {
    await supabase.from('module_events').insert({
      user_id: event.user_id,
      entity_type: 'planning',
      entity_id: event.intervention_id,
      old_statut: event.old_statut,
      new_statut: event.new_statut,
      action_type: event.action_type,
      payload: {}
    })
  } catch (_) { /* table module_events pas encore creee - on ignore */ }
}
