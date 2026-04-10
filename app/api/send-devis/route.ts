import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateDevisPdf } from '@/lib/pdf'
import { buildDocumentEmailHtml } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { devisId, emailDestinataire, messagePersonnalise } = await req.json()

    if (!devisId || !emailDestinataire) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: devis, error: devisErr } = await supabase.from('devis').select('*').eq('id', devisId).single()
    if (devisErr || !devis) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    const { data: lignes } = await supabase.from('devis_lignes').select('*').eq('devis_id', devisId).order('ordre')
    const { data: entreprise } = await supabase.from('entreprises').select('*').eq('user_id', devis.user_id).single()

    // Resolve client — extraire toutes les infos
    let clientNom = 'Client'
    let clientAdresse = ''
    let clientType = 'particulier'
    if (devis.client_id) {
      const { data: client } = await supabase.from('clients').select('nom, prenom, adresse, code_postal, ville, type, telephone, email').eq('id', devis.client_id).single()
      if (client) {
        clientNom = `${client.prenom || ''} ${client.nom || ''}`.trim()
        clientAdresse = [client.adresse, `${client.code_postal || ''} ${client.ville || ''}`.trim(), client.telephone, client.email].filter(Boolean).join(' | ')
        clientType = client.type || 'particulier'
      }
    }
    // Fallback sur notes_client si pas de client_id ou client non trouvé
    if (devis.notes_client) {
      const parts = devis.notes_client.split(' | ').map((s: string) => s.trim())
      if (clientNom === 'Client' && parts[0]) clientNom = parts[0]
      if (!clientAdresse && parts.length > 1) clientAdresse = parts.slice(1).join(' | ')
    }

    const ent = entreprise || {}
    const totalHT = devis.montant_ht || 0
    const totalTVA = devis.montant_tva || 0
    const totalTTC = devis.montant_ttc || 0
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
    const dateValidite = devis.date_validite ? new Date(devis.date_validite).toLocaleDateString('fr-FR') : ''

    // Generate PDF
    const pdfBase64 = generateDevisPdf({
      numero: devis.numero,
      date_emission: devis.date_emission || devis.created_at,
      date_validite: devis.date_validite,
      date_debut_travaux: devis.date_debut_travaux,
      duree_travaux: devis.duree_travaux,
      objet: devis.objet || devis.description,
      conditions_paiement: devis.conditions_paiement,
      acompte_pourcent: devis.acompte_pourcent,
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
        taux_tva: (l.taux_tva as number) || 10,
      })),
      entreprise: ent,
    })

    // Build short email body (avoids Gmail truncation)
    const preheader = `${messagePersonnalise || `Devis n° ${devis.numero} - ${fmt(totalTTC)}`}`
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
<div style="max-width:580px;margin:0 auto;padding:20px;">
<div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
<div style="padding:28px;">
<p style="font-size:16px;color:#1a1a2e;margin:0 0 14px;font-weight:600;">Bonjour ${clientNom},</p>
<p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${messagePersonnalise || `Veuillez trouver ci-joint votre devis n\u00b0 ${devis.numero} d'un montant de ${fmt(totalTTC)}.`}</p>
${dateValidite ? `<p style="font-size:13px;color:#e87a2a;margin:0 0 16px;">Ce devis est valable jusqu'au ${dateValidite}.</p>` : ''}
<div style="text-align:center;margin:20px 0;">
<a href="https://nexartis.fr/dashboard/devis/${devis.id}" style="background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">Voir le devis</a>
</div>
<p style="font-size:14px;color:#374151;margin:0;">Cordialement,<br/><strong>${(ent as Record<string,unknown>).nom || 'Nexartis'}</strong></p>
</div>
<div style="padding:12px 28px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;font-size:11px;color:#9ca3af;">Envoy\u00e9 via Nexartis \u2014 nexartis.fr</p>
</div>
</div>
</div>
</body></html>`

    // Send via Brevo with PDF attachment
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: ent.nom || 'Nexartis', email: 'no-reply@nexartis.fr' },
        to: [{ email: emailDestinataire, name: clientNom }],
        subject: `Devis n° ${devis.numero} — ${ent.nom || 'Nexartis'}`,
        replyTo: { email: ent.email || 'no-reply@nexartis.fr', name: ent.nom || 'Nexartis' },
        htmlContent: html,
        attachment: [{
          content: pdfBase64,
          name: `Devis-${devis.numero}.pdf`,
        }],
      }),
    })

    if (!brevoResponse.ok) {
      const brevoErr = await brevoResponse.json()
      console.error('Brevo error:', brevoErr)
      return NextResponse.json({ error: brevoErr.message || 'Erreur envoi Brevo' }, { status: 500 })
    }

    await supabase.from('devis').update({ statut: 'envoye', date_envoi: new Date().toISOString() }).eq('id', devisId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send devis error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
