'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'

// ── Generic hook ──────────────────────────────────────────────

type QueryState<T> = {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => void
}

function useSupabaseQuery<T>(
  table: string,
  options?: { orderBy?: string; ascending?: boolean; filters?: Record<string, unknown> }
): QueryState<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non connecté'); setLoading(false); return }

    let query = supabase.from(table).select('*').eq('user_id', user.id)
    if (options?.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query = query.eq(key, value)
      }
    }

    const { data: rows, error: err } = await query
    if (err) { setError(err.message); setLoading(false); return }
    setData((rows ?? []) as T[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ── Single record hook ────────────────────────────────────────

type SingleState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

function useSupabaseRecord<T>(table: string, id: string | null): SingleState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    async function fetch() {
      setLoading(true)
      const supabase = createClient()
      const { data: row, error: err } = await supabase.from(table).select('*').eq('id', id).single()
      if (err) { setError(err.message); setLoading(false); return }
      setData(row as T)
      setLoading(false)
    }
    fetch()
  }, [table, id])

  return { data, loading, error }
}

// ── Mutations ─────────────────────────────────────────────────

async function insertRow(table: string, values: Record<string, unknown>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')
  const { data, error } = await supabase.from(table).insert({ ...values, user_id: user.id }).select().single()
  if (error) throw new Error(error.message)
  return data
}

async function updateRow(table: string, id: string, values: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

async function deleteRow(table: string, id: string) {
  const supabase = createClient()
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── User / Entreprise ─────────────────────────────────────────

function useUser() {
  const [user, setUser] = useState<{ id: string; email: string; user_metadata: Record<string, string> } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user ? { id: user.id, email: user.email ?? '', user_metadata: (user.user_metadata ?? {}) as Record<string, string> } : null)
      setLoading(false)
    }
    fetch()
  }, [])

  return { user, loading }
}

function useEntreprise() {
  const [entreprise, setEntreprise] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('entreprises').select('*').eq('user_id', user.id).single()
      setEntreprise(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const update = async (values: Record<string, unknown>) => {
    if (!entreprise) return
    const supabase = createClient()
    const { data, error } = await supabase.from('entreprises').update(values).eq('id', entreprise.id).select().single()
    if (error) throw new Error(error.message)
    setEntreprise(data)
    return data
  }

  return { entreprise, loading, update }
}

// ── Specific table hooks ──────────────────────────────────────

type Row = Record<string, unknown>

function useClients() { return useSupabaseQuery<Row>('clients', { orderBy: 'created_at' }) }
function useFournisseurs() { return useSupabaseQuery<Row>('fournisseurs', { orderBy: 'created_at' }) }
function useIntervenants() { return useSupabaseQuery<Row>('intervenants', { orderBy: 'created_at' }) }
function usePrestations() { return useSupabaseQuery<Row>('prestations', { orderBy: 'created_at' }) }
function useChantiers() { return useSupabaseQuery<Row>('chantiers', { orderBy: 'created_at' }) }
function useDevis() { return useSupabaseQuery<Row>('devis', { orderBy: 'created_at' }) }
function useFactures() { return useSupabaseQuery<Row>('factures', { orderBy: 'created_at' }) }
function useAchats() { return useSupabaseQuery<Row>('achats', { orderBy: 'date_achat' }) }
function usePaiements() { return useSupabaseQuery<Row>('paiements', { orderBy: 'date_paiement' }) }
function usePlanning() { return useSupabaseQuery<Row>('planning_interventions', { orderBy: 'date_debut', ascending: true }) }
function useRelances() { return useSupabaseQuery<Row>('relances', { orderBy: 'created_at' }) }

// ── Devis lignes (no user_id, linked via devis_id) ───────────

function useDevisLignes(devisId: string | null) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!devisId) { setLoading(false); return }
    async function fetch() {
      setLoading(true)
      const supabase = createClient()
      const { data: rows } = await supabase.from('devis_lignes').select('*').eq('devis_id', devisId).order('ordre')
      setData(rows ?? [])
      setLoading(false)
    }
    fetch()
  }, [devisId])

  return { data, loading }
}

function useFactureLignes(factureId: string | null) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!factureId) { setLoading(false); return }
    async function fetch() {
      setLoading(true)
      const supabase = createClient()
      const { data: rows } = await supabase.from('facture_lignes').select('*').eq('facture_id', factureId).order('ordre')
      setData(rows ?? [])
      setLoading(false)
    }
    fetch()
  }, [factureId])

  return { data, loading }
}

// ── Loading component ─────────────────────────────────────────

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-lg" />
      ))}
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
      <p className="text-sm text-red-600 font-manrope">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-red-600 font-medium hover:underline">
          Réessayer
        </button>
      )}
    </div>
  )
}

export {
  useSupabaseQuery,
  useSupabaseRecord,
  insertRow,
  updateRow,
  deleteRow,
  useUser,
  useEntreprise,
  useClients,
  useFournisseurs,
  useIntervenants,
  usePrestations,
  useChantiers,
  useDevis,
  useFactures,
  useAchats,
  usePaiements,
  usePlanning,
  useRelances,
  useDevisLignes,
  useFactureLignes,
  LoadingSkeleton,
  ErrorBanner,
}
