import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { DataCategory } from '@/lib/import/mappers'

interface ImportedRow {
  [key: string]: unknown
}

interface ImportData {
  clients: ImportedRow[]
  devis: ImportedRow[]
  factures: ImportedRow[]
  devis_lignes: ImportedRow[]
  facture_lignes: ImportedRow[]
  chantiers: ImportedRow[]
  prestations: ImportedRow[]
  fournisseurs: ImportedRow[]
  intervenants: ImportedRow[]
  planning: ImportedRow[]
  paiements: ImportedRow[]
  achats: ImportedRow[]
}

type DuplicateHandling = 'skip' | 'overwrite' | 'create_new'

interface ExecuteRequest {
  data: Partial<ImportData>
  options: {
    duplicateHandling: DuplicateHandling
  }
}

interface ExecuteResponse {
  success: boolean
  imported: Record<string, number>
  skipped: Record<string, number>
  errors: string[]
}

interface MappingResult {
  [key: string]: string | null
}

async function checkDuplicate(
  supabase: any,
  table: string,
  data: ImportedRow,
  duplicateFields: string[]
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  if (duplicateFields.length === 0) {
    return { isDuplicate: false }
  }

  const conditions = duplicateFields
    .filter(field => data[field] !== undefined && data[field] !== null)
    .map(field => `${field}.eq.${encodeURIComponent(String(data[field]))}`)
    .join(',')

  if (!conditions) {
    return { isDuplicate: false }
  }

  const { data: existingRecords } = await supabase
    .from(table)
    .select('id')
    .or(conditions)
    .limit(1)

  if (existingRecords && existingRecords.length > 0) {
    return { isDuplicate: true, existingId: existingRecords[0].id }
  }

  return { isDuplicate: false }
}

function getDuplicateFields(table: string): string[] {
  const fieldMap: Record<string, string[]> = {
    clients: ['email', 'nom'],
    devis: ['numero'],
    factures: ['numero'],
    prestations: ['designation', 'prix_unitaire_ht'],
    fournisseurs: ['nom'],
    intervenants: ['nom'],
    chantiers: ['titre'],
  }
  return fieldMap[table] || []
}

async function findClientIdByName(supabase: any, user_id: string, clientName: string): Promise<string | null> {
  if (!clientName) return null

  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user_id)
    .ilike('nom', `%${clientName}%`)
    .limit(1)

  return clients && clients.length > 0 ? clients[0].id : null
}

async function findDevisIdByNumero(supabase: any, user_id: string, numero: string): Promise<string | null> {
  if (!numero) return null

  const { data: devisList } = await supabase
    .from('devis')
    .select('id')
    .eq('user_id', user_id)
    .eq('numero', numero)
    .limit(1)

  return devisList && devisList.length > 0 ? devisList[0].id : null
}

async function findChantierIdByName(supabase: any, user_id: string, chantierName: string): Promise<string | null> {
  if (!chantierName) return null

  const { data: chantiers } = await supabase
    .from('chantiers')
    .select('id')
    .eq('user_id', user_id)
    .ilike('titre', `%${chantierName}%`)
    .limit(1)

  return chantiers && chantiers.length > 0 ? chantiers[0].id : null
}

async function findFournisseurIdByName(supabase: any, user_id: string, nom: string): Promise<string | null> {
  if (!nom) return null

  const { data: fournisseurs } = await supabase
    .from('fournisseurs')
    .select('id')
    .eq('user_id', user_id)
    .ilike('nom', `%${nom}%`)
    .limit(1)

  return fournisseurs && fournisseurs.length > 0 ? fournisseurs[0].id : null
}

async function findIntervenantIdByName(supabase: any, user_id: string, intervenantName: string): Promise<string | null> {
  if (!intervenantName) return null

  const { data: intervenants } = await supabase
    .from('intervenants')
    .select('id')
    .eq('user_id', user_id)
    .or(`nom.ilike.%${intervenantName}%,prenom.ilike.%${intervenantName}%`)
    .limit(1)

  return intervenants && intervenants.length > 0 ? intervenants[0].id : null
}

async function findPrestationIdByDesignation(supabase: any, user_id: string, designation: string): Promise<string | null> {
  if (!designation) return null

  const { data: prestations } = await supabase
    .from('prestations')
    .select('id')
    .eq('user_id', user_id)
    .ilike('designation', `%${designation}%`)
    .limit(1)

  return prestations && prestations.length > 0 ? prestations[0].id : null
}

async function insertRecords(
  supabase: any,
  user_id: string,
  table: string,
  rows: ImportedRow[],
  duplicateHandling: DuplicateHandling,
  clientIdMap?: Map<string, string>,
  devisIdMap?: Map<string, string>,
  chantierIdMap?: Map<string, string>,
  fournisseurIdMap?: Map<string, string>,
  intervenantIdMap?: Map<string, string>,
  prestationIdMap?: Map<string, string>
): Promise<{ imported: number; skipped: number; errors: string[]; lastInsertIds?: Map<string, string> }> {
  const imported: number[] = []
  const skipped: number[] = []
  const errors: string[] = []
  const lastInsertIds = new Map<string, string>()

  for (const row of rows) {
    if (!row || Object.keys(row).length === 0) continue

    const insertData: ImportedRow = { ...row, user_id }

    if (table === 'devis' && row.client_name && clientIdMap) {
      const clientId = clientIdMap.get(String(row.client_name))
      if (clientId) {
        insertData.client_id = clientId
      }
      delete insertData.client_name
    }

    if (table === 'factures' && row.client_name && clientIdMap) {
      const clientId = clientIdMap.get(String(row.client_name))
      if (clientId) {
        insertData.client_id = clientId
      }
      delete insertData.client_name
    }

    if ((table === 'devis' || table === 'factures') && row.chantier_name && chantierIdMap) {
      const chantierId = chantierIdMap.get(String(row.chantier_name))
      if (chantierId) {
        insertData.chantier_id = chantierId
      }
      delete insertData.chantier_name
    }

    if (table === 'chantiers' && row.client_name && clientIdMap) {
      const clientId = clientIdMap.get(String(row.client_name))
      if (clientId) {
        insertData.client_id = clientId
      }
      delete insertData.client_name
    }

    if (table === 'devis_lignes' && row.devis_numero && devisIdMap) {
      const devisId = devisIdMap.get(String(row.devis_numero))
      if (devisId) {
        insertData.devis_id = devisId
      }
      delete insertData.devis_numero
    }

    if (table === 'devis_lignes' && row.designation && prestationIdMap) {
      const prestationId = prestationIdMap.get(String(row.designation))
      if (prestationId) {
        insertData.prestation_id = prestationId
      }
    }

    if (table === 'facture_lignes' && row.facture_numero) {
      delete insertData.facture_numero
    }

    if (table === 'planning' && row.chantier_name && chantierIdMap) {
      const chantierId = chantierIdMap.get(String(row.chantier_name))
      if (chantierId) {
        insertData.chantier_id = chantierId
      }
      delete insertData.chantier_name
    }

    if (table === 'planning' && row.intervenant_name && intervenantIdMap) {
      const intervenantId = intervenantIdMap.get(String(row.intervenant_name))
      if (intervenantId) {
        insertData.intervenant_id = intervenantId
      }
      delete insertData.intervenant_name
    }

    if (table === 'planning' && row.client_name && clientIdMap) {
      const clientId = clientIdMap.get(String(row.client_name))
      if (clientId) {
        insertData.client_id = clientId
      }
      delete insertData.client_name
    }

    if (table === 'achats' && row.fournisseur_name && fournisseurIdMap) {
      const fournisseurId = fournisseurIdMap.get(String(row.fournisseur_name))
      if (fournisseurId) {
        insertData.fournisseur_id = fournisseurId
      }
      delete insertData.fournisseur_name
    }

    if (table === 'achats' && row.chantier_name && chantierIdMap) {
      const chantierId = chantierIdMap.get(String(row.chantier_name))
      if (chantierId) {
        insertData.chantier_id = chantierId
      }
      delete insertData.chantier_name
    }

    if (table === 'paiements' && row.facture_numero) {
      delete insertData.facture_numero
    }

    const duplicateFields = getDuplicateFields(table)
    const { isDuplicate, existingId } = await checkDuplicate(supabase, table, insertData, duplicateFields)

    if (isDuplicate) {
      if (duplicateHandling === 'skip') {
        skipped.push(1)
        continue
      } else if (duplicateHandling === 'overwrite' && existingId) {
        const { error } = await supabase
          .from(table)
          .update(insertData)
          .eq('id', existingId)

        if (error) {
          errors.push(`Erreur update ${table}: ${error.message}`)
          skipped.push(1)
        } else {
          imported.push(1)
          lastInsertIds.set(String(row.numero || row.designation || row.nom || ''), existingId)
        }
        continue
      }
    }

    const { data: insertedData, error } = await supabase
      .from(table)
      .insert([insertData])
      .select('id')
      .single()

    if (error) {
      errors.push(`Erreur insert ${table}: ${error.message}`)
      skipped.push(1)
    } else if (insertedData) {
      imported.push(1)
      const key = String(row.numero || row.designation || row.nom || '')
      lastInsertIds.set(key, insertedData.id)
    }
  }

  return {
    imported: imported.length,
    skipped: skipped.length,
    errors,
    lastInsertIds,
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = (await req.json()) as ExecuteRequest
    const { data, options } = body

    if (!data || !options) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const { duplicateHandling } = options
    const imported: Record<string, number> = {}
    const skipped: Record<string, number> = {}
    const errors: string[] = []

    const clientIdMap = new Map<string, string>()
    const devisIdMap = new Map<string, string>()
    const chantierIdMap = new Map<string, string>()
    const fournisseurIdMap = new Map<string, string>()
    const intervenantIdMap = new Map<string, string>()
    const prestationIdMap = new Map<string, string>()

    const insertOrder: DataCategory[] = [
      'clients',
      'fournisseurs',
      'intervenants',
      'prestations',
      'chantiers',
      'devis',
      'devis_lignes',
      'factures',
      'facture_lignes',
      'paiements',
      'planning',
      'achats',
    ]

    for (const category of insertOrder) {
      const rows = data[category as keyof ImportData] || []

      if (!Array.isArray(rows) || rows.length === 0) {
        imported[category] = 0
        skipped[category] = 0
        continue
      }

      let idMap: Map<string, string> | undefined

      if (category === 'clients') {
        idMap = clientIdMap
      } else if (category === 'devis') {
        idMap = devisIdMap
      } else if (category === 'chantiers') {
        idMap = chantierIdMap
      } else if (category === 'fournisseurs') {
        idMap = fournisseurIdMap
      } else if (category === 'intervenants') {
        idMap = intervenantIdMap
      } else if (category === 'prestations') {
        idMap = prestationIdMap
      }

      const result = await insertRecords(
        supabase,
        user.id,
        category,
        rows as ImportedRow[],
        duplicateHandling,
        clientIdMap,
        devisIdMap,
        chantierIdMap,
        fournisseurIdMap,
        intervenantIdMap,
        prestationIdMap
      )

      imported[category] = result.imported
      skipped[category] = result.skipped
      errors.push(...result.errors)

      if (idMap && result.lastInsertIds) {
        for (const [key, id] of Array.from(result.lastInsertIds)) {
          idMap.set(key, id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors,
    } as ExecuteResponse)
  } catch (error) {
    console.error('Execute import error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erreur lors de l\'import' },
      { status: 500 }
    )
  }
}
