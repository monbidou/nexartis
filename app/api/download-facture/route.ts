import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateFacturePdf } from '@/lib/pdf'

export async function POST(req: NextRequest) {
  try {
    const { factureId } = await req.json()
    if (!factureId) return NextResponse.json({ error: 'factureId manquant' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: facture, error: factureErr } = await supabase.from('factures').select('*').eq('id', factureId).single()
    if (factureErr || !facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    const { data: lignes } = await supabase.from('facture_lignes').select('*').eq('facture_id', factureId).order('ordre')
    const { data: entreprise } = await supabase.from('entreprises').select('*').eq('user_id', facture.user_id).single()

    let clientNom = facture.client_nom || 'Client'
    let clientAdresse = ''
    let clientType = 'particulier'
    if (facture.client_id) {
      const { data: client } = await supabase.from('clients').select('nom, prenom, adresse, code_postal, ville, telephone, email, type').eq('id', facture.client_id).single()
      if (client) {
        clientNom = `${client.prenom || ''} ${client.nom || ''}`.trim()
        const adressParts = [client.adresse, `${client.code_postal || ''} ${client.ville || ''}`.trim()].filter(Boolean)
        if (client.telephone) adressParts.push(client.telephone)
        if (client.email) adressParts.push(client.email)
        clientAdresse = adressParts.join(' | ')
        clientType = client.type || 'particulier'
      }
    }

    // Fallback: use notes_client
    if (facture.notes_client) {
      clientNom = facture.notes_client.split(' | ')[0] || clientNom
      const parts = facture.notes_client.split(' | ').slice(1)
      if (parts.length > 0 && !clientAdresse) clientAdresse = parts.join(' | ')
    }

    const pdfBase64 = generateFacturePdf({
      numero: facture.numero,
      date_emission: facture.date_emission || facture.created_at,
      date_echeance: facture.date_echeance,
      clientNom,
      clientAdresse,
      clientType,
      montant_ht: facture.montant_ht || 0,
      montant_tva: facture.montant_tva || 0,
      montant_ttc: facture.montant_ttc || 0,
      lignes: (lignes || []).map((l: Record<string, unknown>) => ({
        designation: (l.designation as string) || '',
        quantite: (l.quantite as number) || 0,
        unite: (l.unite as string) || '',
        prix_unitaire_ht: (l.prix_unitaire_ht as number) || 0,
        taux_tva: (l.taux_tva as number) || 10,
      })),
      entreprise: entreprise || {},
      notes: facture.notes,
    })

    // Return the base64 PDF
    return NextResponse.json({ pdfBase64, filename: `Facture-${facture.numero}.pdf` })
  } catch (error) {
    console.error('Download facture error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
