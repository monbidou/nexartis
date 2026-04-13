import { NextRequest, NextResponse } from 'next/server'
import { parseVoiceDevis } from '@/lib/voice/parser'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const transcription = body.transcript || body.transcription || body.text || body.input

    if (!transcription || typeof transcription !== 'string' || transcription.trim() === '') {
      return NextResponse.json({ error: 'Transcription manquante' }, { status: 400 })
    }

    // Parse avec le moteur BTP local (gratuit, instantané)
    const result = parseVoiceDevis(transcription)

    // Transformer le résultat pour matcher le format attendu par handleVoiceResult
    return NextResponse.json({
      client_civilite: result.client_civilite,
      client_nom: [result.client_prenom, result.client_nom].filter(Boolean).join(' ') || null,
      client_prenom: result.client_prenom,
      client_adresse: result.client_adresse,
      client_code_postal: result.client_code_postal,
      client_ville: result.client_ville,
      client_telephone: result.client_telephone,
      client_email: result.client_email,
      chantier: result.chantier,
      lignes: result.lignes.map(l => ({
        designation: l.designation,
        quantite: l.quantite,
        unite: l.unite,
        prix_unitaire: l.prix_unitaire,
      })),
      tva_taux: result.tva_taux,
      conditions_paiement: result.conditions_paiement,
      notes: result.notes,
      dechets_nature: result.dechets_nature,
    })
  } catch (error) {
    console.error('Voice devis error:', error)
    return NextResponse.json({ error: 'Erreur de traitement' }, { status: 500 })
  }
}
