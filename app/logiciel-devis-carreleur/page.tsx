import { Metadata } from "next";
import MetierPageTemplate from "@/components/MetierPageTemplate";

export const metadata: Metadata = {
  title: "Logiciel Devis Carreleur — NexArtis | 25€/mois tout inclus",
  description:
    "Créez vos devis carrelage en quelques minutes. Fournitures et pose séparées. Conforme Factur-X 2026. Essai gratuit.",
};

const data = {
  nom: "Carreleur",
  nomPluriel: "Carreleurs",
  icon: "🔲",
  h1: "Logiciel devis et factures pour carreleurs",
  metaTitle: "Logiciel Devis Carreleur — NexArtis | 25€/mois tout inclus",
  metaDescription:
    "Créez vos devis carrelage en quelques minutes. Fournitures et pose séparées. Conforme Factur-X 2026. Essai gratuit.",
  tvaNotes:
    "TVA 10% sur la pose en rénovation, 20% sur les fournitures vendues seules",
  prestationsExemples: [
    "Pose carrelage sol 60x60",
    "Pose faïence murale salle de bain",
    "Chape de ragréage",
    "Pose mosaïque douche",
    "Dépose ancien carrelage",
  ],
  keywordPrincipal: "logiciel devis carreleur",
  specificite:
    "Détaillez fournitures et pose avec le bon taux de TVA pour chaque ligne.",
};

export default function Page() {
  return <MetierPageTemplate {...data} />;
}
