import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateFacturePdf } from '@/lib/pdf'

export async function POST(req: NextRequest) {
  try {
    const { factureId, emailDestinataire, messagePersonnalise } = await req.json()

    if (!factureId || !emailDestinataire) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: facture, error: factureErr } = await supabase.from('factures').select('*').eq('id', factureId).single()
    if (factureErr || !facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    const { data: lignes } = await supabase.from('facture_lignes').select('*').eq('facture_id', factureId).order('ordre')
    const { data: entreprise } = await supabase.from('entreprises').select('*').eq('user_id', facture.user_id).single()

    // Resolve client — extraire toutes les infos
    let clientNom = facture.client_nom || 'Client'
    let clientAdresse = ''
    let clientType = 'particulier'
    if (facture.client_id) {
      const { data: client } = await supabase.from('clients').select('nom, prenom, adresse, code_postal, ville, type, telephone, email').eq('id', facture.client_id).single()
      if (client) {
        clientNom = `${client.prenom || ''} ${client.nom || ''}`.trim()
        clientAdresse = [client.adresse, `${client.code_postal || ''} ${client.ville || ''}`.trim(), client.telephone, client.email].filter(Boolean).join(' | ')
        clientType = client.type || 'particulier'
      }
    }
    // Fallback sur notes_client
    if (facture.notes_client) {
      const parts = facture.notes_client.split(' | ').map((s: string) => s.trim())
      if (clientNom === 'Client' && parts[0]) clientNom = parts[0]
      if (!clientAdresse && parts.length > 1) clientAdresse = parts.slice(1).join(' | ')
    }

    const ent: Record<string, unknown> = entreprise || {}
    const totalHT = facture.montant_ht || 0
    const totalTVA = facture.montant_tva || 0
    const totalTTC = facture.montant_ttc || 0
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
    const dateEcheance = facture.date_echeance ? new Date(facture.date_echeance).toLocaleDateString('fr-FR') : ''

    // Generate PDF
    const pdfBase64 = generateFacturePdf({
      numero: facture.numero,
      date_emission: facture.date_emission || facture.created_at,
      date_echeance: facture.date_echeance,
      clientNom,
      clientAdresse,
      clientType,
      montant_ht: totalHT,
      montant_tva: totalTVA,
      montant_ttc: totalTTC,
      lignes: (lignes || []).map((l: Record<string, unknown>) => ({
        designation: (l.designation as string) || '',
        quantite: (l.quantite as number) || 0,
        unite: (l.unite as string) || '',
        prix_unitaire_ht: (l.prix_unitaire_ht as number) || 0,
        taux_tva: (l.taux_tva as number) || 20,
      })),
      entreprise: ent,
      notes: facture.notes,
    })

    // Build email body
    const entNom = String(ent.nom || 'Nexartis')
    const entEmail = String(ent.email || 'no-reply@nexartis.fr')
    const preheader = 'Facture n\u00b0 ' + facture.numero + ' - ' + fmt(totalTTC)

    let emailBody: string
    if (messagePersonnalise) {
      emailBody = String(messagePersonnalise).replace(/\n/g, '<br/>')
    } else {
      const echeanceLine = dateEcheance ? " Dans l'attente de votre r\u00e8glement avant le " + dateEcheance + '.' : ''
      emailBody = 'Bonjour ' + clientNom + ',<br/><br/>Veuillez trouver ci-joint votre facture n\u00b0 ' + facture.numero + " d'un montant de " + fmt(totalTTC) + '.' + echeanceLine + '<br/><br/>Cordialement,<br/><strong>' + entNom + '</strong>'
    }

    const html = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><span style="display:none;max-height:0;overflow:hidden;">' + preheader + '</span><div style="max-width:580px;margin:0 auto;padding:20px;"><div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;"><div style="padding:28px;"><p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">' + emailBody + '</p><div style="text-align:center;margin:20px 0;"><a href="https://nexartis.fr/dashboard/factures/' + facture.id + '" style="background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">Voir la facture</a></div></div><div style="padding:12px 28px;border-top:1px solid #e5e7eb;text-align:center;"><p style="margin:0;font-size:11px;color:#9ca3af;">Envoy\u00e9 via Nexartis \u2014 nexartis.fr</p></div></div></div></body></html>'

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: entNom, email: 'no-reply@nexartis.fr' },
        to: [{ email: emailDestinataire, name: clientNom }],
        subject: 'Facture n\u00b0 ' + facture.numero + ' \u2014 ' + entNom,
        replyTo: { email: entEmail, name: entNom },
        htmlContent: html,
        attachment: [{
          content: pdfBase64,
          name: 'Facture-' + facture.numero + '.pdf',
        }],
      }),
    })

    if (!brevoResponse.ok) {
      const brevoErr = await brevoResponse.json()
      console.error('Brevo error:', brevoErr)
      return NextResponse.json({ error: brevoErr.message || 'Erreur envoi Brevo' }, { status: 500 })
    }

    if (facture.statut === 'brouillon' || facture.statut === 'En attente') {
      await supabase.from('factures').update({ statut: 'En attente', date_envoi: new Date().toISOString() }).eq('id', factureId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send facture error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
