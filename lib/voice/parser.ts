// ============================================================
// Moteur d'analyse vocale BTP — Parser intelligent sans IA
// Extrait client, adresse, chantier, lignes de devis
// depuis une dictée vocale en langage naturel
// ============================================================

export interface VoiceDevisResult {
  client_civilite: string | null
  client_prenom: string | null
  client_nom: string | null
  client_adresse: string | null
  client_code_postal: string | null
  client_ville: string | null
  client_telephone: string | null
  client_email: string | null
  chantier: string | null
  lignes: VoiceLigne[]
  tva_taux: number | null
  conditions_paiement: string | null
  notes: string | null
  dechets_nature: string | null
}

export interface VoiceLigne {
  designation: string
  quantite: number
  unite: string
  prix_unitaire: number
}

// -------------------------------------------------------------------
// Dictionnaires BTP
// -------------------------------------------------------------------

const TRAVAUX_BTP: Record<string, { designation: string; unite: string; category: string }> = {
  // Terrassement
  'terrassement': { designation: 'Terrassement', unite: 'm³', category: 'gros_oeuvre' },
  'terrasser': { designation: 'Terrassement', unite: 'm³', category: 'gros_oeuvre' },
  'décaissement': { designation: 'Décaissement du terrain', unite: 'm³', category: 'gros_oeuvre' },
  'décaisser': { designation: 'Décaissement du terrain', unite: 'm³', category: 'gros_oeuvre' },
  'nivellement': { designation: 'Nivellement du terrain', unite: 'm²', category: 'gros_oeuvre' },
  'niveler': { designation: 'Nivellement du terrain', unite: 'm²', category: 'gros_oeuvre' },
  'remblai': { designation: 'Remblai', unite: 'm³', category: 'gros_oeuvre' },
  'remblayer': { designation: 'Remblai', unite: 'm³', category: 'gros_oeuvre' },
  'déblai': { designation: 'Déblai et évacuation', unite: 'm³', category: 'gros_oeuvre' },
  'excavation': { designation: 'Excavation', unite: 'm³', category: 'gros_oeuvre' },
  'tranchée': { designation: 'Creusement de tranchée', unite: 'ml', category: 'gros_oeuvre' },

  // Maçonnerie
  'maçonnerie': { designation: 'Travaux de maçonnerie', unite: 'm²', category: 'gros_oeuvre' },
  'mur': { designation: 'Construction de mur', unite: 'm²', category: 'gros_oeuvre' },
  'muret': { designation: 'Construction de muret', unite: 'ml', category: 'gros_oeuvre' },
  'dalle': { designation: 'Coulage de dalle béton', unite: 'm²', category: 'gros_oeuvre' },
  'béton': { designation: 'Coulage béton', unite: 'm³', category: 'gros_oeuvre' },
  'chape': { designation: 'Chape béton', unite: 'm²', category: 'gros_oeuvre' },
  'fondation': { designation: 'Fondations', unite: 'ml', category: 'gros_oeuvre' },
  'fondations': { designation: 'Fondations', unite: 'ml', category: 'gros_oeuvre' },
  'agglo': { designation: 'Mur en agglo/parpaing', unite: 'm²', category: 'gros_oeuvre' },
  'parpaing': { designation: 'Mur en agglo/parpaing', unite: 'm²', category: 'gros_oeuvre' },
  'enduit': { designation: 'Enduit de façade', unite: 'm²', category: 'gros_oeuvre' },
  'crépir': { designation: 'Crépi de façade', unite: 'm²', category: 'gros_oeuvre' },
  'crépi': { designation: 'Crépi de façade', unite: 'm²', category: 'gros_oeuvre' },

  // Électricité
  'électricité': { designation: 'Travaux d\'électricité', unite: 'U', category: 'electricite' },
  'électrique': { designation: 'Installation électrique', unite: 'U', category: 'electricite' },
  'tableau électrique': { designation: 'Mise en place tableau électrique', unite: 'U', category: 'electricite' },
  'prise': { designation: 'Pose de prise électrique', unite: 'U', category: 'electricite' },
  'prises': { designation: 'Pose de prises électriques', unite: 'U', category: 'electricite' },
  'interrupteur': { designation: 'Pose d\'interrupteur', unite: 'U', category: 'electricite' },
  'éclairage': { designation: 'Installation éclairage', unite: 'U', category: 'electricite' },
  'luminaire': { designation: 'Pose de luminaire', unite: 'U', category: 'electricite' },
  'câblage': { designation: 'Câblage électrique', unite: 'ml', category: 'electricite' },
  'disjoncteur': { designation: 'Remplacement disjoncteur', unite: 'U', category: 'electricite' },
  'mise aux normes': { designation: 'Mise aux normes électrique', unite: 'U', category: 'electricite' },
  'différentiel': { designation: 'Pose de différentiel', unite: 'U', category: 'electricite' },

  // Plomberie
  'plomberie': { designation: 'Travaux de plomberie', unite: 'U', category: 'plomberie' },
  'tuyauterie': { designation: 'Tuyauterie', unite: 'ml', category: 'plomberie' },
  'chauffe-eau': { designation: 'Installation chauffe-eau', unite: 'U', category: 'plomberie' },
  'cumulus': { designation: 'Installation chauffe-eau (cumulus)', unite: 'U', category: 'plomberie' },
  'robinet': { designation: 'Pose de robinet', unite: 'U', category: 'plomberie' },
  'lavabo': { designation: 'Pose de lavabo', unite: 'U', category: 'plomberie' },
  'wc': { designation: 'Pose de WC', unite: 'U', category: 'plomberie' },
  'toilette': { designation: 'Pose de WC', unite: 'U', category: 'plomberie' },
  'douche': { designation: 'Installation douche', unite: 'U', category: 'plomberie' },
  'baignoire': { designation: 'Pose de baignoire', unite: 'U', category: 'plomberie' },
  'évacuation': { designation: 'Réseau d\'évacuation', unite: 'ml', category: 'plomberie' },
  'fuite': { designation: 'Réparation fuite', unite: 'U', category: 'plomberie' },

  // Carrelage / Revêtement
  'carrelage': { designation: 'Pose de carrelage', unite: 'm²', category: 'revetement' },
  'carreler': { designation: 'Pose de carrelage', unite: 'm²', category: 'revetement' },
  'faïence': { designation: 'Pose de faïence', unite: 'm²', category: 'revetement' },
  'parquet': { designation: 'Pose de parquet', unite: 'm²', category: 'revetement' },
  'lino': { designation: 'Pose de lino/PVC', unite: 'm²', category: 'revetement' },
  'pvc': { designation: 'Pose de sol PVC', unite: 'm²', category: 'revetement' },
  'moquette': { designation: 'Pose de moquette', unite: 'm²', category: 'revetement' },
  'stratifié': { designation: 'Pose de sol stratifié', unite: 'm²', category: 'revetement' },

  // Peinture
  'peinture': { designation: 'Peinture', unite: 'm²', category: 'peinture' },
  'peindre': { designation: 'Peinture', unite: 'm²', category: 'peinture' },
  'repeindre': { designation: 'Remise en peinture', unite: 'm²', category: 'peinture' },
  'sous-couche': { designation: 'Application sous-couche', unite: 'm²', category: 'peinture' },
  'papier peint': { designation: 'Pose de papier peint', unite: 'm²', category: 'peinture' },
  'tapisserie': { designation: 'Pose de tapisserie', unite: 'm²', category: 'peinture' },

  // Menuiserie
  'menuiserie': { designation: 'Travaux de menuiserie', unite: 'U', category: 'menuiserie' },
  'porte': { designation: 'Pose de porte', unite: 'U', category: 'menuiserie' },
  'fenêtre': { designation: 'Pose de fenêtre', unite: 'U', category: 'menuiserie' },
  'volet': { designation: 'Pose de volet', unite: 'U', category: 'menuiserie' },
  'volets': { designation: 'Pose de volets', unite: 'U', category: 'menuiserie' },
  'portail': { designation: 'Pose de portail', unite: 'U', category: 'menuiserie' },
  'clôture': { designation: 'Pose de clôture', unite: 'ml', category: 'menuiserie' },
  'clôturer': { designation: 'Pose de clôture', unite: 'ml', category: 'menuiserie' },
  'grillage': { designation: 'Pose de grillage', unite: 'ml', category: 'menuiserie' },
  'pergola': { designation: 'Construction pergola', unite: 'U', category: 'menuiserie' },
  'terrasse bois': { designation: 'Construction terrasse bois', unite: 'm²', category: 'menuiserie' },
  'bardage': { designation: 'Pose de bardage', unite: 'm²', category: 'menuiserie' },

  // Toiture
  'toiture': { designation: 'Travaux de toiture', unite: 'm²', category: 'toiture' },
  'toit': { designation: 'Réfection toiture', unite: 'm²', category: 'toiture' },
  'tuile': { designation: 'Remplacement tuiles', unite: 'U', category: 'toiture' },
  'tuiles': { designation: 'Remplacement tuiles', unite: 'U', category: 'toiture' },
  'gouttière': { designation: 'Pose de gouttière', unite: 'ml', category: 'toiture' },
  'gouttières': { designation: 'Pose de gouttières', unite: 'ml', category: 'toiture' },
  'zinguerie': { designation: 'Travaux de zinguerie', unite: 'ml', category: 'toiture' },
  'charpente': { designation: 'Travaux de charpente', unite: 'm²', category: 'toiture' },
  'isolation': { designation: 'Isolation', unite: 'm²', category: 'toiture' },
  'isoler': { designation: 'Isolation', unite: 'm²', category: 'toiture' },
  'étanchéité': { designation: 'Étanchéité', unite: 'm²', category: 'toiture' },

  // Extérieur / Allée
  'allée': { designation: 'Réfection allée', unite: 'm²', category: 'exterieur' },
  'chemin': { designation: 'Aménagement chemin', unite: 'ml', category: 'exterieur' },
  'pavé': { designation: 'Pose de pavés', unite: 'm²', category: 'exterieur' },
  'pavés': { designation: 'Pose de pavés', unite: 'm²', category: 'exterieur' },
  'dallage': { designation: 'Pose de dallage extérieur', unite: 'm²', category: 'exterieur' },
  'enrobé': { designation: 'Pose d\'enrobé', unite: 'm²', category: 'exterieur' },
  'gravillonnage': { designation: 'Gravillonnage', unite: 'm²', category: 'exterieur' },
  'gravier': { designation: 'Fourniture et pose gravier', unite: 'm³', category: 'exterieur' },
  'gazon': { designation: 'Pose de gazon', unite: 'm²', category: 'exterieur' },
  'pelouse': { designation: 'Engazonnement', unite: 'm²', category: 'exterieur' },
  'aménagement paysager': { designation: 'Aménagement paysager', unite: 'U', category: 'exterieur' },
  'jardin': { designation: 'Aménagement jardin', unite: 'U', category: 'exterieur' },
  'piscine': { designation: 'Piscine', unite: 'U', category: 'exterieur' },

  // Démolition
  'démolition': { designation: 'Démolition', unite: 'U', category: 'demolition' },
  'démolir': { designation: 'Démolition', unite: 'U', category: 'demolition' },
  'dépose': { designation: 'Dépose', unite: 'U', category: 'demolition' },
  'déposer': { designation: 'Dépose', unite: 'U', category: 'demolition' },
  'arrachage': { designation: 'Arrachage', unite: 'U', category: 'demolition' },
  'arracher': { designation: 'Arrachage', unite: 'U', category: 'demolition' },

  // Placo / Cloison
  'placo': { designation: 'Pose de placo (BA13)', unite: 'm²', category: 'second_oeuvre' },
  'plaque de plâtre': { designation: 'Pose de plaques de plâtre', unite: 'm²', category: 'second_oeuvre' },
  'cloison': { designation: 'Montage cloison', unite: 'm²', category: 'second_oeuvre' },
  'faux plafond': { designation: 'Pose de faux plafond', unite: 'm²', category: 'second_oeuvre' },
}

const MATERIAUX: Record<string, { designation: string; unite: string }> = {
  'calcaire': { designation: 'Fourniture calcaire', unite: 'm³' },
  'sable': { designation: 'Fourniture sable', unite: 'm³' },
  'gravier': { designation: 'Fourniture gravier', unite: 'm³' },
  'gravillon': { designation: 'Fourniture gravillons', unite: 'm³' },
  'ciment': { designation: 'Fourniture ciment', unite: 'sac' },
  'béton': { designation: 'Fourniture béton prêt à l\'emploi', unite: 'm³' },
  'parpaing': { designation: 'Fourniture parpaings', unite: 'U' },
  'parpaings': { designation: 'Fourniture parpaings', unite: 'U' },
  'brique': { designation: 'Fourniture briques', unite: 'U' },
  'briques': { designation: 'Fourniture briques', unite: 'U' },
  'plaque de plâtre': { designation: 'Fourniture plaques de plâtre (BA13)', unite: 'U' },
  'tube': { designation: 'Fourniture tube/tuyau', unite: 'ml' },
  'câble': { designation: 'Fourniture câble électrique', unite: 'ml' },
  'gaine': { designation: 'Fourniture gaine électrique', unite: 'ml' },
  'carrelage': { designation: 'Fourniture carrelage', unite: 'm²' },
  'peinture': { designation: 'Fourniture peinture', unite: 'L' },
  'enduit': { designation: 'Fourniture enduit', unite: 'kg' },
  'bois': { designation: 'Fourniture bois', unite: 'ml' },
  'planche': { designation: 'Fourniture planches', unite: 'ml' },
  'tuile': { designation: 'Fourniture tuiles', unite: 'U' },
  'tuiles': { designation: 'Fourniture tuiles', unite: 'U' },
  'isolant': { designation: 'Fourniture isolant', unite: 'm²' },
  'laine de verre': { designation: 'Fourniture laine de verre', unite: 'm²' },
  'laine de roche': { designation: 'Fourniture laine de roche', unite: 'm²' },
  'mortier': { designation: 'Fourniture mortier', unite: 'sac' },
  'colle': { designation: 'Fourniture colle', unite: 'sac' },
  'joint': { designation: 'Fourniture joint', unite: 'kg' },
  'silicone': { designation: 'Fourniture silicone', unite: 'U' },
  'géotextile': { designation: 'Fourniture géotextile', unite: 'm²' },
  'film': { designation: 'Fourniture film polyane', unite: 'm²' },
  'ferraille': { designation: 'Fourniture ferraillage', unite: 'kg' },
  'treillis soudé': { designation: 'Fourniture treillis soudé', unite: 'm²' },
  'gouttière': { designation: 'Fourniture gouttière', unite: 'ml' },
}

const LOCATION_ENGINS: Record<string, { designation: string; unite: string }> = {
  'pelle': { designation: 'Location pelle mécanique', unite: 'jour' },
  'mini-pelle': { designation: 'Location mini-pelle', unite: 'jour' },
  'mini pelle': { designation: 'Location mini-pelle', unite: 'jour' },
  'tractopelle': { designation: 'Location tractopelle', unite: 'jour' },
  'chargeuse': { designation: 'Location chargeuse', unite: 'jour' },
  'camion': { designation: 'Location camion', unite: 'jour' },
  'benne': { designation: 'Location benne à déchets', unite: 'jour' },
  'nacelle': { designation: 'Location nacelle élévatrice', unite: 'jour' },
  'échafaudage': { designation: 'Location échafaudage', unite: 'jour' },
  'bétonnière': { designation: 'Location bétonnière', unite: 'jour' },
  'plaque vibrante': { designation: 'Location plaque vibrante', unite: 'jour' },
  'compacteur': { designation: 'Location compacteur', unite: 'jour' },
  'marteau piqueur': { designation: 'Location marteau-piqueur', unite: 'jour' },
  'groupe électrogène': { designation: 'Location groupe électrogène', unite: 'jour' },
  'aspirateur': { designation: 'Location aspirateur industriel', unite: 'jour' },
  'grue': { designation: 'Location grue', unite: 'jour' },
  'brouette': { designation: 'Fourniture/location brouette', unite: 'jour' },
  'dumper': { designation: 'Location dumper', unite: 'jour' },
}

const DECHETS_TYPES: Record<string, string> = {
  'terre': 'Terre et déblais',
  'gravats': 'Gravats',
  'déchets': 'Déchets de chantier',
  'débris': 'Débris',
  'bois': 'Déchets bois',
  'métal': 'Déchets métalliques',
  'plastique': 'Déchets plastique',
  'plâtre': 'Déchets plâtre',
  'amiante': 'Amiante (traitement spécial)',
  'végétaux': 'Déchets végétaux',
}

// -------------------------------------------------------------------
// Normalisation du texte
// -------------------------------------------------------------------

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// -------------------------------------------------------------------
// Extraction du client
// -------------------------------------------------------------------

function extractClient(text: string): {
  civilite: string | null
  prenom: string | null
  nom: string | null
} {
  // Patterns : "chez monsieur Dupont", "monsieur Eric Dupont", "madame Martin", "société ABC"
  const patterns = [
    // "chez monsieur/madame prénom nom"
    /(?:chez|pour|client)\s+(?:le\s+|la\s+)?(monsieur|madame|mme|m\.|mr|société|societe)\s+([a-zàâäéèêëïîôùûüÿç-]+)\s+([a-zàâäéèêëïîôùûüÿç-]+)/i,
    // "monsieur prénom nom" (sans chez)
    /(?:^|\.\s+|,\s+)(monsieur|madame|mme|m\.|mr)\s+([a-zàâäéèêëïîôùûüÿç-]+)\s+([a-zàâäéèêëïîôùûüÿç-]+)/i,
    // "monsieur nom" (sans prénom)
    /(?:chez|pour|client)\s+(?:le\s+|la\s+)?(monsieur|madame|mme|m\.|mr|société|societe)\s+([a-zàâäéèêëïîôùûüÿç-]+)/i,
    // Juste "monsieur nom"
    /(monsieur|madame|mme|m\.|mr)\s+([a-zàâäéèêëïîôùûüÿç-]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const civRaw = match[1].toLowerCase()
      let civilite = 'M.'
      if (civRaw.includes('madame') || civRaw.includes('mme')) civilite = 'Mme'
      if (civRaw.includes('société') || civRaw.includes('societe')) civilite = 'Société'

      if (match.length === 4) {
        // prénom + nom
        return {
          civilite,
          prenom: capitalize(match[2]),
          nom: capitalize(match[3]),
        }
      } else {
        // nom seul
        return {
          civilite,
          prenom: null,
          nom: capitalize(match[2]),
        }
      }
    }
  }
  return { civilite: null, prenom: null, nom: null }
}

// -------------------------------------------------------------------
// Extraction de l'adresse
// -------------------------------------------------------------------

function extractAddress(text: string): {
  adresse: string | null
  codePostal: string | null
  ville: string | null
} {
  // Pattern : "144 avenue de la mer" / "12 rue du chat" / "3 bis boulevard..."
  const adressePattern = /(\d+\s*(?:bis|ter)?)\s+(rue|avenue|boulevard|impasse|chemin|allée|place|route|cours|passage|voie|square|résidence|lotissement|quartier|hameau|lieu[- ]dit)\s+([a-zàâäéèêëïîôùûüÿç\s'-]+?)(?=\s*(?:\d{5}|il|elle|qui|pour|besoin|faut|c'est|y\s+a|,|\.|$))/i

  const match = text.match(adressePattern)
  let adresse: string | null = null
  if (match) {
    adresse = `${match[1]} ${match[2]} ${match[3]}`.trim()
    // Nettoyer les mots parasites en fin
    adresse = adresse.replace(/\s+(il|elle|qui|pour|besoin|faut|c'est|y\s+a).*$/i, '').trim()
  }

  // Code postal : 5 chiffres
  const cpMatch = text.match(/\b(\d{5})\b/)
  const codePostal = cpMatch ? cpMatch[1] : null

  // Ville : après le code postal, ou après "à [Ville]"
  let ville: string | null = null
  if (cpMatch) {
    const afterCp = text.substring(text.indexOf(cpMatch[0]) + 5).trim()
    const villeMatch = afterCp.match(/^[\s,]*([a-zàâäéèêëïîôùûüÿç\s-]+?)(?=\s*(?:\.|,|il|elle|qui|pour|besoin|faut|c'est|y\s+a|$))/i)
    if (villeMatch) {
      ville = capitalize(villeMatch[1].trim())
    }
  }
  // Fallback : "à [Ville]"
  if (!ville) {
    const aVilleMatch = text.match(/\bà\s+([a-zàâäéèêëïîôùûüÿç-]+(?:\s+(?:sur|les|sous|en|de|du|la|le|des)\s+[a-zàâäéèêëïîôùûüÿç-]+)?)/i)
    if (aVilleMatch) {
      const candidate = aVilleMatch[1].trim()
      // Exclure les mots courants qui ne sont pas des villes
      const excludeWords = ['besoin', 'refaire', 'faire', 'acheter', 'louer', 'prévoir', 'installer', 'poser']
      if (!excludeWords.includes(candidate.toLowerCase())) {
        ville = capitalize(candidate)
      }
    }
  }

  return { adresse, codePostal: codePostal, ville }
}

// -------------------------------------------------------------------
// Extraction du téléphone
// -------------------------------------------------------------------

function extractPhone(text: string): string | null {
  // Formats : 06 12 34 56 78 / 0612345678 / 06.12.34.56.78
  const phonePattern = /\b(0[1-9][\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2})\b/
  const match = text.match(phonePattern)
  if (match) {
    return match[1].replace(/[\s.\-]/g, '').replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  }
  return null
}

// -------------------------------------------------------------------
// Extraction de l'email
// -------------------------------------------------------------------

function extractEmail(text: string): string | null {
  const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
  const match = text.match(emailPattern)
  return match ? match[0] : null
}

// -------------------------------------------------------------------
// Extraction des lignes de devis (travaux + matériaux + location)
// -------------------------------------------------------------------

function extractLignes(text: string): VoiceLigne[] {
  const lignes: VoiceLigne[] = []
  const normalizedText = normalizeText(text)
  const usedDesignations = new Set<string>()

  // Détecter si c'est un achat/location via le contexte
  const acheterContext = normalizedText.includes('acheter') || normalizedText.includes('achat')
  const louerContext = normalizedText.includes('louer') || normalizedText.includes('location')

  // 1. Chercher les locations d'engins
  for (const [keyword, info] of Object.entries(LOCATION_ENGINS)) {
    if (normalizedText.includes(keyword) && !usedDesignations.has(info.designation)) {
      // Chercher une quantité avant ou après
      const qty = extractQuantityNear(normalizedText, keyword)
      lignes.push({
        designation: info.designation,
        quantite: qty || 1,
        unite: info.unite,
        prix_unitaire: 0,
      })
      usedDesignations.add(info.designation)
    }
  }

  // 2. Chercher les matériaux (si contexte "acheter")
  for (const [keyword, info] of Object.entries(MATERIAUX)) {
    if (normalizedText.includes(keyword) && !usedDesignations.has(info.designation)) {
      // Éviter le double-match avec travaux (ex: "béton" = travaux OU matériau)
      if (acheterContext || normalizedText.includes(`du ${keyword}`) || normalizedText.includes(`de ${keyword}`) || normalizedText.includes(`le ${keyword}`)) {
        const qty = extractQuantityNear(normalizedText, keyword)
        lignes.push({
          designation: info.designation,
          quantite: qty || 1,
          unite: info.unite,
          prix_unitaire: 0,
        })
        usedDesignations.add(info.designation)
      }
    }
  }

  // 3. Chercher les travaux BTP (expressions les plus longues d'abord)
  const sortedTravaux = Object.entries(TRAVAUX_BTP).sort((a, b) => b[0].length - a[0].length)
  for (const [keyword, info] of sortedTravaux) {
    if (normalizedText.includes(keyword) && !usedDesignations.has(info.designation)) {
      const qty = extractQuantityNear(normalizedText, keyword)
      const price = extractPriceNear(normalizedText, keyword)
      lignes.push({
        designation: info.designation,
        quantite: qty || 1,
        unite: info.unite,
        prix_unitaire: price || 0,
      })
      usedDesignations.add(info.designation)
    }
  }

  // 4. Gestion des déchets → ligne évacuation
  for (const [keyword, dechetType] of Object.entries(DECHETS_TYPES)) {
    if (normalizedText.includes(keyword)) {
      const designation = `Évacuation ${dechetType.toLowerCase()}`
      if (!usedDesignations.has(designation)) {
        lignes.push({
          designation,
          quantite: 1,
          unite: 'm³',
          prix_unitaire: 0,
        })
        usedDesignations.add(designation)
        break // On ne met qu'une ligne d'évacuation
      }
    }
  }

  return lignes
}

// -------------------------------------------------------------------
// Extraction du chantier (description)
// -------------------------------------------------------------------

function extractChantier(text: string): string | null {
  const normalizedText = normalizeText(text)
  const patterns = [
    /(?:refaire|rénover|construire|installer|poser|remplacer|réparer|aménager|réaliser|créer)\s+(?:son|sa|ses|le|la|les|l'|un|une|des|du)?\s*([a-zàâäéèêëïîôùûüÿç\s'-]+?)(?=\s*(?:\.|,|il|elle|qui|pour|besoin|faut|c'est|y\s+a|et|donc|du coup|$))/i,
    /(?:besoin de|il faut|travaux de|projet de|chantier)\s+(?:refaire|rénover|construire|installer)?\s*(?:son|sa|ses|le|la|les|l'|un|une|des|du)?\s*([a-zàâäéèêëïîôùûüÿç\s'-]+?)(?=\s*(?:\.|,|il|elle|pour|faut|et|donc|$))/i,
  ]

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern)
    if (match && match[1].trim().length > 2) {
      const chantier = match[1].trim()
      return 'Réfection ' + chantier.charAt(0).toUpperCase() + chantier.slice(1)
    }
  }
  return null
}

// -------------------------------------------------------------------
// Extraction déchets
// -------------------------------------------------------------------

function extractDechets(text: string): string | null {
  const normalizedText = normalizeText(text)
  const found: string[] = []
  for (const [keyword, dechetType] of Object.entries(DECHETS_TYPES)) {
    if (normalizedText.includes(keyword)) {
      found.push(dechetType)
    }
  }
  return found.length > 0 ? found.join(', ') : null
}

// -------------------------------------------------------------------
// Extraction de quantité proche d'un mot-clé
// -------------------------------------------------------------------

function extractQuantityNear(text: string, keyword: string): number | null {
  const idx = text.indexOf(keyword)
  if (idx === -1) return null

  // Chercher un nombre dans les 40 caractères avant et après
  const before = text.substring(Math.max(0, idx - 40), idx)
  const after = text.substring(idx, Math.min(text.length, idx + keyword.length + 40))

  // Pattern : "15 mètres carrés", "20 m²", "3 jours"
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:mètres?\s*carrés?|m²|m2)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:mètres?\s*cubes?|m³|m3)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:mètres?\s*(?:linéaires?)?|ml|m\b)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:jours?|j\b)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:heures?|h\b)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:litres?|l\b)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:kilos?|kg)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:sacs?)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:unités?|pièces?)/i,
    /(\d+(?:[.,]\d+)?)/,
  ]

  const combined = before + ' ' + after
  for (const pattern of patterns) {
    const match = combined.match(pattern)
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'))
      if (num > 0 && num < 100000) return num
    }
  }
  return null
}

// -------------------------------------------------------------------
// Extraction de prix proche d'un mot-clé
// -------------------------------------------------------------------

function extractPriceNear(text: string, keyword: string): number | null {
  const idx = text.indexOf(keyword)
  if (idx === -1) return null

  const after = text.substring(idx, Math.min(text.length, idx + keyword.length + 60))

  // "35 euros le mètre carré", "50€/m²", "à 40 euros"
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:€|euros?)\s*(?:le|par|\/)\s*(?:mètre|m)/i,
    /(?:à|pour|coûte|prix)\s+(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/i,
  ]

  for (const pattern of patterns) {
    const match = after.match(pattern)
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'))
      if (num > 0 && num < 1000000) return num
    }
  }
  return null
}

// -------------------------------------------------------------------
// Capitalize
// -------------------------------------------------------------------

function capitalize(str: string): string {
  if (!str) return str
  return str.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(
    str.includes('-') ? '-' : ' '
  )
}

// -------------------------------------------------------------------
// MAIN PARSER
// -------------------------------------------------------------------

export function parseVoiceDevis(transcript: string): VoiceDevisResult {
  const text = normalizeText(transcript)

  const client = extractClient(text)
  const address = extractAddress(text)
  const phone = extractPhone(text)
  const email = extractEmail(text)
  const chantier = extractChantier(text)
  const lignes = extractLignes(text)
  const dechets = extractDechets(text)

  return {
    client_civilite: client.civilite,
    client_prenom: client.prenom,
    client_nom: client.nom,
    client_adresse: address.adresse,
    client_code_postal: address.codePostal,
    client_ville: address.ville,
    client_telephone: phone,
    client_email: email,
    chantier,
    lignes,
    tva_taux: null, // On laisse la TVA par défaut
    conditions_paiement: null,
    notes: null,
    dechets_nature: dechets,
  }
}
