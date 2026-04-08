import { Metadata } from "next";
import LocalPageTemplate from "@/components/LocalPageTemplate";

export const metadata: Metadata = {
  title: "Logiciel Artisan Lyon — NexArtis | 25€/mois tout inclus",
  description:
    "NexArtis pour les artisans de Lyon et du Rhône. Devis, factures, planning intelligent. 25€/mois tout inclus. Essai gratuit.",
};

const data = {
  ville: "Lyon",
  region: "Rhône",
  codePostal: "69",
  h1: "Logiciel artisan à Lyon — Devis, factures et planning",
  metaTitle: "Logiciel Artisan Lyon — NexArtis | 25€/mois tout inclus",
  metaDescription:
    "NexArtis pour les artisans de Lyon et du Rhône. Devis, factures, planning intelligent. 25€/mois tout inclus. Essai gratuit.",
  specificite:
    "De nombreux artisans lyonnais utilisent déjà NexArtis pour gérer leurs chantiers dans toute la métropole.",
  temoignage: {
    quote:
      "Je gère 3 chantiers en parallèle dans la métropole lyonnaise. Avec le planning d'NexArtis, je ne me trompe plus jamais d'affectation.",
    nom: "Sylvain D.",
    metier: "Maçon",
    ville: "Lyon (69)",
  },
};

export default function Page() {
  return <LocalPageTemplate {...data} />;
}
