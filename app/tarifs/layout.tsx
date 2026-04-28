import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs Nexartis — 25€/mois tout inclus | Logiciel artisan",
  description:
    "Un seul abonnement, tout inclus : devis, factures, planning, tableau de bord. Moins cher qu'Obat, plus complet que Tolteck. 14 jours d'essai gratuit.",
  alternates: {
    canonical: '/tarifs',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
