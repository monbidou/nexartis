"use client";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f1a3a] to-[#0d1525] text-white">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-8 lg:pt-14 lg:pb-10">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left column — Text */}
          <div className="flex flex-col items-start">
            <span className="mb-6 inline-block rounded-full bg-[#f5c842] px-4 py-1.5 text-sm font-semibold text-[#0f1a3a]">
              Conçu en Gironde · Pour les artisans de toute la France
            </span>

            <h1 className="font-syne text-3xl font-black leading-tight md:text-5xl lg:text-6xl">
              Tous vos outils artisan.
              <br />
              Un seul prix.
              <br />
              <span className="text-[#5ab4e0]">25€/mois.</span>
            </h1>

            <p className="mt-6 max-w-lg font-manrope text-lg leading-relaxed text-gray-300">
              Devis, factures, planning et suivi financier — réunis dans une seule application, pensée pour tous les artisans.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-col items-start">
                <button className="h-16 rounded-xl bg-[#e87a2a] px-8 font-syne text-lg font-bold text-white transition-colors hover:bg-[#f09050]">
                  Essayer gratuitement 14 jours →
                </button>
                <span className="mt-2 text-sm text-gray-400">
                  Sans carte bancaire requise · Sans engagement
                </span>
              </div>

              <button className="h-12 rounded-xl border border-white/30 px-6 font-syne text-base font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/5">
                ▶ Découvrir le fonctionnement
              </button>
            </div>
          </div>

          {/* Right column — Dashboard Mockup */}
          <div className="flex flex-col gap-4">
            {/* Card: Tableau de bord */}
            <div className="rounded-2xl bg-[#1a2d5a] p-6 shadow-lg shadow-black/20">
              <div className="mb-1 text-sm text-gray-400">Tableau de bord</div>
              <div className="text-2xl font-bold text-white">Vos devis et factures</div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-3/4 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-1.5 text-xs text-gray-400">
                Suivi en temps réel de votre activité
              </div>
            </div>

            {/* Mini Planning */}
            <div className="rounded-2xl bg-[#1a2d5a] p-6 shadow-lg shadow-black/20">
              <div className="mb-3 text-sm font-semibold text-white">
                Planning de la semaine
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-2 rounded-full bg-[#5ab4e0]" />
                  <div className="flex-1 rounded-lg bg-[#5ab4e0]/20 px-3 py-2 text-sm text-white">
                    Chantier A — Lun–Mar
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-2 rounded-full bg-[#f5c842]" />
                  <div className="flex-1 rounded-lg bg-[#f5c842]/20 px-3 py-2 text-sm text-white">
                    Intervention B — Mer
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-2 rounded-full bg-[#e87a2a]" />
                  <div className="flex-1 rounded-lg bg-[#e87a2a]/20 px-3 py-2 text-sm text-white">
                    Chantier C — Jeu–Ven
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Aperçu */}
            <div className="rounded-2xl bg-[#1a2d5a] p-6 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Aperçu</div>
                  <div className="text-lg font-bold text-white">
                    Devis, factures et relances centralisés
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5c842]/20 text-lg">
                  📝
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
