/**
 * AUTOMATISMES DEVIS
 * Services pour chaîner les actions lors des changements d'état
 */

import { createClient } from '@/lib/supabase/client'

interface DevisChangePayload {
  devis_id: string
  user_id: string
  old_statut: string
  new_statut: string
  data?: Record<string, unknown>
}

/**
 * Quand devis passe à "signe" (accepté) :
 * 1. Proposer créer/lier chantier
 * 2. Mettre à jour devis.chantier_id si lié
 * 3. Créer event (pour audit + automations futures)
 */
export async function handleDevisSigne(payload: DevisChangePayload) {
  const supabase = createClient()
  const { devis_id, user_id, data } = payload

  // Récupérer le devis complet
  const { data: devis, error: err1 } = await supabase
    .from('devis')
    .select('*, clients(*)')
    .eq('id', devis_id)
    .single()

  if (err1 || !devis) throw new Error(`Devis non trouvé: ${err1?.message}`)

  // 1. Si chantier_id pas encore renseigné, retourner instruction UI
  if (!devis.chantier_id) {
    return {
      status: 'awaiting_user_action',
      action: 'choose_chantier',
      message: `Veuillez créer ou sélectionner un chantier pour le devis D${devis.numero}`,
      suggestions: {
        create_new: `Nouveau chantier pour ${devis.clients.nom}`,
        link_existing: 'Lier à un chantier existant'
      }
    }
  }

  // 2. Si chantier_id déjà renseigné, mettre à jour son statut
  const { error: err2 } = await supabase
    .from('chantiers')
    .update({ statut: 'signe' }) // signe = devis accepté, en attente de planning
    .eq('id', devis.chantier_id)

  if (err2) throw new Error(`Erreur mise à jour chantier: ${err2.message}`)

  // 3. Créer event pour audit
  await logModuleEvent(supabase, {
    user_id,
    entity_type: 'devis',
    entity_id: devis_id,
    old_statut: payload.old_statut,
    new_statut: 'signe',
    action_type: 'status_change',
    payload: {
      chantier_id: devis.chantier_id,
      client_id: devis.client_id
    }
  })

  return {
    status: 'success',
    chantier_id: devis.chantier_id,
    message: 'Devis signé et chantier préparé pour planification'
  }
}

/**
 * Créer chantier automatiquement à partir d'un devis signé
 * Appelé depuis l'UI du devis quand utilisateur accepte la suggestion
 */
export async function createChantierFromDevis(devis_id: string) {
  const supabase = createClient()

  // Récupérer devis
  const { data: devis, error: err1 } = await supabase
    .from('devis')
    .select('*')
    .eq('id', devis_id)
    .single()

  if (err1 || !devis) throw new Error('Devis non trouvé')

  // Extraire adresse depuis notes_client (format: "Nom | Adresse | CP Ville | Tel | Email")
  const notesParts = ((devis.notes_client as string) || '').split(' | ')
  const adresseClient = notesParts[1] || ''
  const cpVille = notesParts[2] || ''
  const cpParts = cpVille.trim().split(' ')
  const cp = /^\d{5}$/.test(cpParts[0]) ? cpParts[0] : ''
  const ville = cp ? cpParts.slice(1).join(' ') : cpVille.trim()

  // Créer chantier (uniquement les colonnes qui existent en DB)
  const { data: chantier, error: err2 } = await supabase
    .from('chantiers')
    .insert({
      user_id: devis.user_id,
      client_id: devis.client_id || null,
      titre: devis.objet || `Chantier ${devis.numero}`,
      description: devis.description || null,
      adresse_chantier: adresseClient || null,
      code_postal_chantier: cp || null,
      ville_chantier: ville || null,
      date_debut: devis.date_debut_travaux || null,
      statut: 'signe',
      montant_devis_total: devis.montant_ttc || 0,
    })
    .select()
    .single()

  if (err2 || !chantier) throw new Error(`Erreur création chantier: ${err2?.message}`)

  // Lier devis au chantier
  const { error: err3 } = await supabase
    .from('devis')
    .update({ chantier_id: chantier.id })
    .eq('id', devis_id)

  if (err3) throw new Error(`Erreur liaison devis-chantier: ${err3.message}`)

  // Audit log (non-bloquant — table module_events optionnelle)
  try {
    await supabase.from('module_events').insert({
      user_id: devis.user_id,
      entity_type: 'chantier',
      entity_id: chantier.id,
      old_statut: null,
      new_statut: 'signe',
      action_type: 'created',
      triggered_by: 'user',
      payload: { from_devis_id: devis_id, client_id: devis.client_id }
    })
  } catch (_) { /* table module_events pas encore créée — on ignore */ }

  return chantier
}

/**
 * Quand chantier passe à "en_cours" :
 * → Les planning_interventions existants passent à "en_cours"
 */
export async function handleChantierEnCours(payload: DevisChangePayload) {
  const supabase = createClient()
  const chantier_id = payload.data?.chantier_id as string
  const { user_id } = payload

  const { error } = await supabase
    .from('planning_interventions')
    .update({ statut: 'en_cours' })
    .eq('chantier_id', chantier_id)
    .eq('statut', 'planifie')

  if (error) throw new Error(error.message)

  await logModuleEvent(supabase, {
    user_id,
    entity_type: 'chantier',
    entity_id: chantier_id,
    old_statut: payload.old_statut,
    new_statut: 'en_cours',
    action_type: 'status_change',
    payload: {}
  })
}

/**
 * Quand chantier passe à "livre" (travaux terminés) :
 * → Proposer créer une facture
 */
export async function handleChantierLivre(payload: DevisChangePayload) {
  const supabase = createClient()
  const chantier_id = payload.data?.chantier_id as string

  // Récupérer tous les devis du chantier
  const { data: devis_list } = await supabase
    .from('devis')
    .select('id, numero, montant_ttc, client_id')
    .eq('chantier_id', chantier_id)

  await logModuleEvent(supabase, {
    user_id: payload.user_id,
    entity_type: 'chantier',
    entity_id: chantier_id,
    old_statut: 'en_cours',
    new_statut: 'livre',
    action_type: 'status_change',
    payload: {
      devis_ids: devis_list?.map(d => d.id) || []
    }
  })

  // Retourner suggestion UI
  return {
    status: 'awaiting_user_action',
    action: 'create_facture',
    message: 'Travaux livrés. Créer une facture ?',
    devis_to_invoice: devis_list || []
  }
}

/**
 * Créer facture depuis devis (avec ou sans chantier)
 * Copie lignes du devis dans la facture.
 *
 * Récupère le profil entreprise pour générer un numéro cohérent
 * (préfixe configurable) et calculer la date d'échéance selon le délai de
 * paiement par défaut. Sans ces champs (obligatoires en BDD), la création
 * crashait silencieusement avec "Erreur création facture".
 */
export async function createFactureFromDevis(
  devis_id: string,
  factureType: 'standard' | 'acompte' | 'situation' = 'standard'
) {
  const supabase = createClient()

  // Récupérer devis complet
  const { data: devis } = await supabase
    .from('devis')
    .select('*')
    .eq('id', devis_id)
    .single()

  if (!devis) throw new Error('Devis non trouvé')

  // Récupérer le profil entreprise (SELECT * pour éviter de planter si certains
  // champs n'existent pas dans la BDD du compte). On utilise ensuite Record<string, unknown>
  // pour accéder aux valeurs de manière défensive.
  const { data: entrepriseRaw } = await supabase
    .from('entreprises')
    .select('*')
    .eq('user_id', devis.user_id)
    .single()
  const entreprise = (entrepriseRaw ?? {}) as Record<string, unknown>

  // Récupérer lignes du devis
  const { data: devis_lignes } = await supabase
    .from('devis_lignes')
    .select('*')
    .eq('devis_id', devis_id)
    .order('ordre')

  // Générer un numéro de facture unique : <PREFIX>-<YYYY>-<5 derniers chiffres timestamp>
  const now = new Date()
  const prefixF = (entreprise.prefix_factures as string) || 'F'
  const numero = `${prefixF}-${now.getFullYear()}-${String(Date.now()).slice(-5)}`

  // Calculer date d'échéance = date_emission + délai de paiement (jours)
  const dateEmission = now.toISOString().split('T')[0]
  const delaiJours = Number(entreprise.delai_paiement) || 30
  const echeance = new Date(now)
  echeance.setDate(echeance.getDate() + delaiJours)
  const dateEcheance = echeance.toISOString().split('T')[0]

  // Construire les champs à insérer de manière défensive : on n'inclut un champ
  // que si on est sûr qu'il existe dans le schéma. Les champs essentiels d'abord,
  // les optionnels seulement si valeur disponible.
  const factureInsert: Record<string, unknown> = {
    user_id: devis.user_id,
    client_id: devis.client_id,
    chantier_id: devis.chantier_id,
    devis_id: devis_id,
    type: factureType,
    numero,
    date_emission: dateEmission,
    date_echeance: dateEcheance,
    montant_ht: devis.montant_ht,
    montant_tva: devis.montant_tva,
    montant_ttc: devis.montant_ttc,
    statut: 'brouillon'
  }
  // Champs optionnels (ajoutés seulement s'ils ont une valeur)
  if (devis.objet) factureInsert.objet = devis.objet
  if (devis.notes_client) factureInsert.notes_client = devis.notes_client
  if (devis.client_nom) factureInsert.client_nom = devis.client_nom
  if (devis.client_adresse) factureInsert.client_adresse = devis.client_adresse
  const conditionsP = (entreprise.conditions_paiement as string) || devis.notes
  if (conditionsP) factureInsert.notes = conditionsP

  // Créer facture
  const { data: facture, error: err1 } = await supabase
    .from('factures')
    .insert(factureInsert)
    .select()
    .single()

  if (err1 || !facture) throw new Error(`Erreur création facture: ${err1?.message}`)

  // Copier les lignes du devis
  if (devis_lignes && devis_lignes.length > 0) {
    const facture_lignes = devis_lignes.map(dl => ({
      facture_id: facture.id,
      designation: dl.designation,
      quantite: dl.quantite,
      unite: dl.unite,
      prix_unitaire_ht: dl.prix_unitaire_ht,
      taux_tva: dl.taux_tva,
      devis_ligne_id: dl.id, // Traçabilité
      ordre: dl.ordre
    }))

    const { error: err2 } = await supabase
      .from('facture_lignes')
      .insert(facture_lignes)

    if (err2) throw new Error(`Erreur copie lignes: ${err2.message}`)
  }

  // Mettre à jour devis : statut 'facture'
  await supabase
    .from('devis')
    .update({ statut: 'facture' })
    .eq('id', devis_id)

  await logModuleEvent(supabase, {
    user_id: devis.user_id,
    entity_type: 'facture',
    entity_id: facture.id,
    old_statut: null,
    new_statut: 'brouillon',
    action_type: 'created',
    payload: {
      from_devis_id: devis_id
    }
  })

  return facture
}

// -----------------------------------------------------
// Helper: Logger les events
// -----------------------------------------------------

async function logModuleEvent(
  supabase: ReturnType<typeof createClient>,
  event: {
    user_id: string
    entity_type: string
    entity_id: string
    old_statut: string | null
    new_statut: string
    action_type: string
    payload: Record<string, unknown>
  }
) {
  await supabase.from('module_events').insert(event).single()
}

export { logModuleEvent }
