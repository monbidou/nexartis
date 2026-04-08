import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { devisId, emailDestinataire, messagePersonnalise } = await req.json()

    if (!devisId || !emailDestinataire) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Supabase admin client (server-side, bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch devis
    const { data: devis, error: devisErr } = await supabase.from('devis').select('*').eq('id', devisId).single()
    if (devisErr || !devis) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    // Fetch lignes
    const { data: lignes } = await supabase.from('devis_lignes').select('*').eq('devis_id', devisId).order('ordre')

    // Fetch entreprise
    const { data: entreprise } = await supabase.from('entreprises').select('*').eq('user_id', devis.user_id).single()

    const ent = entreprise || {}
    const clientNom = devis.notes_client?.split(' | ')[0] || 'Client'
    const totalHT = devis.montant_ht || 0
    const totalTVA = devis.montant_tva || 0
    const totalTTC = devis.montant_ttc || 0
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

    const dateValidite = devis.date_validite ? new Date(devis.date_validite).toLocaleDateString('fr-FR') : ''

    // Build lignes HTML
    const lignesHtml = (lignes || []).map((l: Record<string, unknown>, i: number) => `
      <tr style="border-bottom:1px solid #eee;${i % 2 === 1 ? 'background:#f9fafb;' : ''}">
        <td style="padding:8px 12px;font-size:14px;">${l.designation || ''}</td>
        <td style="padding:8px 12px;font-size:14px;text-align:center;">${l.quantite || ''}</td>
        <td style="padding:8px 12px;font-size:14px;text-align:center;">${l.unite || ''}</td>
        <td style="padding:8px 12px;font-size:14px;text-align:right;">${l.prix_unitaire_ht ? fmt(l.prix_unitaire_ht as number) : '--'}</td>
      </tr>
    `).join('')

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:#0f1a3a;padding:24px 32px;">
        <h1 style="margin:0;font-size:22px;font-weight:800;color:white;">${ent.nom || 'NexArtis'}</h1>
        <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">
          ${ent.adresse || ''}${ent.code_postal ? `, ${ent.code_postal}` : ''} ${ent.ville || ''}
          ${ent.siret ? `<br>SIRET : ${ent.siret}` : ''}
          ${ent.telephone ? `<br>Tél. : ${ent.telephone}` : ''}
        </p>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <h2 style="margin:0 0 4px;font-size:18px;color:#0f1a3a;">Devis n° ${devis.numero}</h2>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
          ${devis.date_emission ? `Date : ${new Date(devis.date_emission).toLocaleDateString('fr-FR')}` : ''}
          ${dateValidite ? ` · Valable jusqu'au ${dateValidite}` : ''}
        </p>

        <p style="font-size:15px;color:#1a1a2e;line-height:1.6;">
          Bonjour ${clientNom},
        </p>
        <p style="font-size:15px;color:#1a1a2e;line-height:1.6;">
          ${messagePersonnalise || `Veuillez trouver ci-dessous notre devis n° ${devis.numero}.`}
        </p>

        ${devis.objet || devis.description ? `<p style="font-size:14px;color:#6b7280;margin:16px 0 4px;"><strong>Chantier :</strong> ${devis.objet || devis.description}</p>` : ''}

        <!-- Tableau prestations -->
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          <thead>
            <tr style="background:#5ab4e0;color:white;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;">Désignation</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;">Qté</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;">Unité</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;">Prix U. HT</th>
            </tr>
          </thead>
          <tbody>
            ${lignesHtml}
          </tbody>
        </table>

        <!-- Totaux -->
        <div style="text-align:right;margin:24px 0;">
          <p style="margin:4px 0;font-size:14px;color:#6b7280;">Total HT : <strong style="color:#1a1a2e;">${fmt(totalHT)}</strong></p>
          ${totalTVA > 0 ? `<p style="margin:4px 0;font-size:14px;color:#6b7280;">TVA : <strong style="color:#1a1a2e;">${fmt(totalTVA)}</strong></p>` : ''}
          <p style="margin:8px 0 0;font-size:18px;font-weight:800;color:#0f1a3a;">Total TTC : ${fmt(totalTTC)}</p>
          ${totalTVA === 0 ? '<p style="margin:4px 0;font-size:12px;color:#6b7280;font-style:italic;">TVA non applicable, art. 293 B du CGI</p>' : ''}
        </div>

        ${devis.conditions_paiement ? `
        <div style="border-top:1px solid #eee;padding-top:16px;margin-top:16px;">
          <p style="font-size:13px;color:#6b7280;"><strong>Conditions de paiement :</strong><br>${devis.conditions_paiement.replace(/\n/g, '<br>')}</p>
        </div>` : ''}

        ${dateValidite ? `<p style="font-size:13px;color:#e87a2a;margin-top:16px;">Ce devis est valable jusqu'au ${dateValidite}.</p>` : ''}
      </div>

      <!-- Footer -->
      <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #eee;">
        <p style="margin:0;font-size:12px;color:#6b7280;">
          ${ent.nom || 'NexArtis'}
          ${ent.email ? ` · ${ent.email}` : ''}
          ${ent.telephone ? ` · ${ent.telephone}` : ''}
        </p>
        <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Envoyé via NexArtis — nexartis.fr</p>
      </div>
    </div>
  </div>
</body>
</html>`

    // Send email via Resend
    const { error: sendErr } = await resend.emails.send({
      from: 'NexArtis <contact@nexartis.fr>',
      to: emailDestinataire,
      subject: `Devis n° ${devis.numero} — ${ent.nom || 'NexArtis'}`,
      html,
    })

    if (sendErr) {
      console.error('Resend error:', sendErr)
      return NextResponse.json({ error: sendErr.message }, { status: 500 })
    }

    // Update devis status
    await supabase.from('devis').update({ statut: 'envoye', date_envoi: new Date().toISOString() }).eq('id', devisId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send devis error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
