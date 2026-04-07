import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs Artidoc — 25€/mois tout inclus | Logiciel artisan BTP",
  description:
    "Un seul abonnement, tout inclus : devis, factures, planning, tableau de bord. Moins cher qu'Obat, plus complet que Tolteck. 14 jours d'essai gratuit.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
