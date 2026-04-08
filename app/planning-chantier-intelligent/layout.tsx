import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planning Chantier Intelligent — NexArtis | Alertes conflits incluses",
  description:
    "Le seul planning artisan avec drag-and-drop, alertes conflits automatiques et vue équipe en temps réel. Inclus dans NexArtis à 25€/mois.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
