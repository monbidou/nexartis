"use client";

import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const slideInRight = {
  initial: { opacity: 0, x: 80 },
  animate: { opacity: 1, x: 0 },
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f1a3a] to-[#0d1525] text-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column — Text */}
          <div className="flex flex-col items-start">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4 }}
            >
              <span className="mb-6 inline-block rounded-full bg-[#f5c842] px-4 py-1.5 text-sm font-semibold text-[#0f1a3a]">
                Conçu en Gironde · Pour les artisans de toute la France
              </span>
            </motion.div>

            <motion.h1
              className="font-syne text-3xl font-black leading-tight md:text-5xl lg:text-6xl"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Tous vos outils artisan.
              <br />
              Un seul prix.
              <br />
              <span className="text-[#5ab4e0]">25€/mois.</span>
            </motion.h1>

            <motion.p
              className="mt-6 max-w-lg font-manrope text-lg leading-relaxed text-gray-300"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              Devis, factures, planning de chantier et suivi financier — réunis dans une seule application, pensée pour les professionnels du bâtiment.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4, delay: 0.3 }}
            >
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
            </motion.div>

            <motion.div
              className="mt-8 flex items-center gap-2"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <div className="flex text-[#f5c842]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-xl">
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-300">
                Déjà utilisé par des artisans en Gironde et toute la France
              </span>
            </motion.div>
          </div>

          {/* Right column — Dashboard Mockup */}
          <motion.div
            className="flex flex-col gap-4"
            variants={slideInRight}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* Card: Devis du mois */}
            <div className="rounded-2xl bg-[#1a2d5a] p-6 shadow-lg shadow-black/20">
              <div className="mb-1 text-sm text-gray-400">Devis du mois</div>
              <div className="text-2xl font-bold text-white">12 400€</div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-3/4 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-1.5 text-xs text-gray-400">
                74% de l&apos;objectif mensuel
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
                    Rénovation cuisine — Lun–Mar
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-2 rounded-full bg-[#f5c842]" />
                  <div className="flex-1 rounded-lg bg-[#f5c842]/20 px-3 py-2 text-sm text-white">
                    Salle de bain Dupont — Mer
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-2 rounded-full bg-[#e87a2a]" />
                  <div className="flex-1 rounded-lg bg-[#e87a2a]/20 px-3 py-2 text-sm text-white">
                    Extension garage — Jeu–Ven
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Devis en attente */}
            <div className="rounded-2xl bg-[#1a2d5a] p-6 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">En attente</div>
                  <div className="text-lg font-bold text-white">
                    2 devis en attente de signature
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5c842]/20 text-lg">
                  📝
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
