import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Accept multiple field names for flexibility
    const transcription = body.transcript || body.transcription || body.text || body.input

    if (!transcription || typeof transcription !== 'string' || transcription.trim() === '') {
      return NextResponse.json({ error: 'Transcription manquante' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API non configurée' }, { status: 500 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Tu es un assistant pour artisans français.
Analyse cette dictée vocale et extrait les informations pour créer un devis.
Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans explication.

Dictée : "${transcription}"

JSON à retourner (mets null si info absente, ne génère RIEN d'inventé) :
{
  "client_civilite": "M." ou "Mme" ou "Société" ou null,
  "client_nom": "nom et prénom si mentionné ou null",
  "client_adresse": "adresse complète si mentionnée ou null",
  "client_telephone": "téléphone si mentionné ou null",
  "client_email": "email si mentionné ou null",
  "chantier": "description du chantier ou prestation ou null",
  "lignes": [
    {
      "designation": "description de la prestation",
      "quantite": 1,
      "unite": "U",
      "prix_unitaire": 0
    }
  ],
  "tva_taux": 10,
  "conditions_paiement": "conditions si mentionnées ou null",
  "notes": "autres informations ou null"
}

RÈGLES :
- "35 euros le mètre carré" = prix_unitaire:35, unite:"m²"
- Ne génère AUCUNE valeur inventée
- Si une info n'est pas dans la dictée, mets null
- Ne complète jamais une adresse ou un nom avec des données inventées`
        }]
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Anthropic API error:', res.status, errBody)
      return NextResponse.json({ error: `Erreur API: ${res.status}` }, { status: 500 })
    }

    const data = await res.json()
    const rawText = data.content?.[0]?.text || '{}'
    const cleanText = rawText.replace(/```json|```/g, '').trim()

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Réponse non exploitable' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Voice devis error:', error)
    return NextResponse.json({ error: 'Erreur de traitement' }, { status: 500 })
  }
}
