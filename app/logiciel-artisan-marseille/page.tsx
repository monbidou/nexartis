import { Metadata } from "next";
import LocalPageTemplate from "@/components/LocalPageTemplate";

export const metadata: Metadata = {
  title: "Logiciel Artisan Marseille — NexArtis | 25€/mois tout inclus",
  description:
    "NexArtis pour les artisans de Marseille et des Bouches-du-Rhône. Devis, factures, planning. 25€/mois. Essai gratuit.",
};

const data = {
  ville: "Marseille",
  region: "Bouches-du-Rhône",
  codePostal: "13",
  h1: "Logiciel artisan à Marseille — Devis, factures et planning",
  metaTitle: "Logiciel Artisan Marseille — NexArtis | 25€/mois tout inclus",
  metaDescription:
    "NexArtis pour les artisans de Marseille et des Bouches-du-Rhône. Devis, factures, planning. 25€/mois. Essai gratuit.",
  specificite:
    "Les artisans marseillais apprécient la simplicité d'NexArtis, un logiciel pensé pour le terrain, pas pour le bureau.",
  temoignage: {
    quote:
      "Depuis que j'utilise NexArtis, je gagne au moins 3 heures par semaine. Et mes clients me disent que mes devis font très pro.",
    nom: "Rachid K.",
    metier: "Peintre",
    ville: "Marseille (13)",
  },
};

export default function Page() {
  return <LocalPageTemplate {...data} />;
}
