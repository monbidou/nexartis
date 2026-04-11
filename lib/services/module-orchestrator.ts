/**
 * ORCHESTRATEUR MODULAIRE
 * Gère les transitions de statut entre tous les modules (Devis → Chantier → Planning → Facture)
 *
 * Point d'entrée unique pour tous les changements d'état
 */

import { createClient } from '@/lib/supabase/client'
import {
  handleDevisSigne,
  createChantierFromDevis,
  handleChantierEnCours,
  handleChantierLivre,
  createFactureFromDevis
} from './devis-automatisms'
import { createPlanningFromChantier, getChantiersToPlan } from './planning-automatisms'

export type EntityType = 'devis' | 'facture' | 'chantier' | 'planning'

interface StatusChangeRequest {
  entity_type: EntityType
  entity_id: string
  new_statut: string
  old_statut?: string
  user_id: string
  triggered_by?: 'user' | 'system'
  metadata?: Record<string, unknown>
}

/**
 * Dispatcher principal : appelé depuis n'importe quel composant
 * qui change le statut d'une entité
 *
 * USAGE:
 * await handleStatusChange({
 *   entity_type: 'devis',
 *   entity_id: devis.id,
 *   new_statut: 'signe',
 *   user_id: user.id,
 *   triggered_by: 'user'
 * })
 */
export async function handleStatusChange(request: StatusChangeRequest) {
  const supabase = createClient()
  const { entity_type, entity_id, new_statut, user_id, triggered_by = 'user' } = request

  let result: any = { status: 'processed' }

  try {
    // ────────────────────────────────────────
    // DEVIS TRANSITIONS
    // ────────────────────────────────────────

    if (entity_type === 'devis') {
      switch (new_statut) {
        case 'signe':
          // Devis accepté → chantier signé
          result = await handleDevisSigne({
            devis_id: entity_id,
            user_id,
            old_statut: request.old_statut || 'envoye',
            new_statut: 'signe',
            data: request.metadata
          })
          break

        case 'facture':
          // Devis facturé → créer facture (ou proposer)
          // Proposé comme action utilisateur dans l'UI
          break

        case 'refuse':
        case 'expire':
          // Devis refusé/expiré → simple log
          await logEvent(supabase, {
            entity_type: 'devis',
            entity_id,
            old_statut: request.old_statut,
            new_statut,
            user_id,
            action_type: 'status_change'
          })
          break
      }
    }

    // ────────────────────────────────────────
    // CHANTIER TRANSITIONS
    // ────────────────────────────────────────

    if (entity_type === 'chantier') {
      switch (new_statut) {
        case 'en_cours':
          // Chantier démarre → interventions du planning passent en cours
          await handleChantierEnCours({
            devis_id: '', // Pas pertinent ici
            user_id,
            old_statut: 'signe',
            new_statut: 'en_cours',
            data: { chantier_id: entity_id }
          })
          break

        case 'livre':
          // Travaux terminés → proposer création facture
          result = await handleChantierLivre({
            devis_id: '',
            user_id,
            old_statut: 'en_cours',
            new_statut: 'livre',
            data: { chantier_id: entity_id }
          })
          break

        case 'cloture':
          // Chantier clôturé → simple log
          await logEvent(supabase, {
            entity_type: 'chantier',
            entity_id,
            old_statut: request.old_statut,
            new_statut: 'cloture',
            user_id,
            action_type: 'status_change'
          })
          break
      }
    }

    // ────────────────────────────────────────
    // PLANNING TRANSITIONS
    // ────────────────────────────────────────

    if (entity_type === 'planning') {
      switch (new_statut) {
        case 'termine':
          // Intervention terminée → log, en attente de validation pour facturation
          await logEvent(supabase, {
            entity_type: 'planning',
            entity_id,
            old_statut: request.old_statut,
            new_statut: 'termine',
            user_id,
            action_type: 'status_change'
          })
          break

        case 'annule':
        case 'reporte':
          // Log uniquement
          await logEvent(supabase, {
            entity_type: 'planning',
            entity_id,
            old_statut: request.old_statut,
            new_statut,
            user_id,
            action_type: 'status_change'
          })
          break
      }
    }

    // ────────────────────────────────────────
    // FACTURE TRANSITIONS
    // ────────────────────────────────────────

    if (entity_type === 'facture') {
      switch (new_statut) {
        case 'envoyee':
          // Facture envoyée → log
          await logEvent(supabase, {
            entity_type: 'facture',
            entity_id,
            old_statut: request.old_statut,
            new_statut: 'envoyee',
            user_id,
            action_type: 'status_change'
          })
          // TODO: déclencher envoi email
          break

        case 'payee':
          // Facture payée → mettre à jour chantier.montant_encaisse
          await updateChantierPayment(entity_id, user_id)
          await logEvent(supabase, {
            entity_type: 'facture',
            entity_id,
            old_statut: request.old_statut,
            new_statut: 'payee',
            user_id,
            action_type: 'status_change'
          })
          break
      }
    }

    return {
      status: 'success',
      entity_type,
      entity_id,
      new_statut,
      details: result
    }
  } catch (error) {
    console.error('[Orchestrator Error]', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────
// ACTIONS DIRECTES (appelées depuis l'UI)
// ─────────────────────────────────────────────────────

/**
 * Créer un chantier depuis devis signé
 * Appelé quand user clique "Créer chantier" dans suggestion
 */
export async function suggestCreateChantierFromDevis(devis_id: string) {
  return await createChantierFromDevis(devis_id)
}

/**
 * Créer une facture depuis devis livré/chantier livré
 * Appelé depuis l'UI après "chantier livré"
 */
export async function suggestCreateFacture(
  devis_id: string,
  type: 'standard' | 'acompte' | 'situation' = 'standard'
) {
  return await createFactureFromDevis(devis_id, type)
}

/**
 * Créer une intervention de planning
 * Appelé depuis l'onglet "À planifier" après chantier signé
 */
export async function suggestCreatePlanning(
  chantier_id: string,
  intervention_data: {
    titre: string
    description_travaux?: string
    date_debut: string
    date_fin?: string
    intervenant_id?: string
  }
) {
  return await createPlanningFromChantier(chantier_id, intervention_data)
}

/**
 * Récupérer le flux de chantiers à planifier
 */
export async function getChantierPlanningQueue(user_id: string) {
  return await getChantiersToPlan(user_id)
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

async function updateChantierPayment(facture_id: string, user_id: string) {
  const supabase = createClient()

  // Récupérer facture
  const { data: facture } = await supabase
    .from('factures')
    .select('chantier_id, montant_ttc')
    .eq('id', facture_id)
    .single()

  if (!facture?.chantier_id) return

  // Somme tous les paiements du chantier
  const { data: paiements } = await supabase
    .from('paiements')
    .select('montant')
    .eq('facture_id', facture_id)

  const montant_paye = paiements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0

  // Mettre à jour chantier
  await supabase
    .from('chantiers')
    .update({ montant_encaisse: montant_paye })
    .eq('id', facture.chantier_id)
}

async function logEvent(
  supabase: ReturnType<typeof createClient>,
  event: {
    entity_type: EntityType
    entity_id: string
    old_statut?: string | null
    new_statut: string
    user_id: string
    action_type: string
  }
) {
  try {
    await supabase.from('module_events').insert({
      user_id: event.user_id,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      old_statut: event.old_statut || null,
      new_statut: event.new_statut,
      action_type: event.action_type,
      triggered_by: 'system',
      payload: {}
    })
  } catch (err) {
    console.error('[Event logging error]', err)
  }
}
