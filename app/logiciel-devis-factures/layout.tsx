import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créez vos devis et factures artisan rapidement — Nexartis",
  description:
    "Logiciel de devis et facturation pour artisans. Signature électronique, TVA automatique, conforme Factur-X 2026. Essai gratuit 14 jours.",
  alternates: {
    canonical: '/logiciel-devis-factures',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
