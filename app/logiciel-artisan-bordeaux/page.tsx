import { Metadata } from "next";
import LocalPageTemplate from "@/components/LocalPageTemplate";

export const metadata: Metadata = {
  title: "Logiciel Artisan Bordeaux — Artidoc | Fait en Gironde | 25€/mois",
  description:
    "Artidoc, le logiciel artisan créé à Bordeaux. Devis, factures, planning pour les artisans de Gironde. 25€/mois tout inclus.",
};

const data = {
  ville: "Bordeaux",
  region: "Gironde",
  codePostal: "33",
  h1: "Logiciel artisan à Bordeaux — Artidoc, fait en Gironde",
  metaTitle:
    "Logiciel Artisan Bordeaux — Artidoc | Fait en Gironde | 25€/mois",
  metaDescription:
    "Artidoc, le logiciel artisan créé à Bordeaux. Devis, factures, planning pour les artisans de Gironde. 25€/mois tout inclus.",
  specificite:
    "Artidoc est né à Bordeaux, en Gironde. Notre équipe est ici, et nous comprenons les besoins des artisans locaux.",
  temoignage: {
    quote:
      "Un outil conçu localement, qui comprend la réalité de notre métier. Je crée mes devis directement depuis mon véhicule, et le résultat est professionnel.",
    nom: "Pierre M.",
    metier: "Plombier",
    ville: "Bordeaux (33)",
  },
};

export default function Page() {
  return <LocalPageTemplate {...data} />;
}
