import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créez vos devis et factures BTP rapidement — Artidoc",
  description:
    "Logiciel de devis et facturation pour artisans BTP. Signature électronique, TVA automatique, conforme Factur-X 2026. Essai gratuit 14 jours.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
