"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;

interface PlanningEntry {
  poseur: string;
  client: string;
  objet: string;
  color: string;
}

type SlotData = PlanningEntry | null;

const planningData: { am: SlotData[]; pm: SlotData[] } = {
  am: [
    { poseur: "Michel R.", client: "M. Dupont", objet: "Instal. chauffe-eau", color: "#5ab4e0" },
    { poseur: "Thomas B.", client: "Mme Martin", objet: "Rénov. salle de bain", color: "#e87a2a" },
    { poseur: "Michel R.", client: "M. Bernard", objet: "Pose carrelage", color: "#22c55e" },
    { poseur: "Lucas D.", client: "M. Petit", objet: "Extension terrasse", color: "#f5c842" },
    { poseur: "Thomas B.", client: "Mme Girard", objet: "Électricité cuisine", color: "#f43f5e" },
  ],
  pm: [
    { poseur: "Michel R.", client: "M. Dupont", objet: "Instal. chauffe-eau", color: "#5ab4e0" },
    { poseur: "Thomas B.", client: "Mme Martin", objet: "Rénov. salle de bain", color: "#e87a2a" },
    { poseur: "Lucas D.", client: "Mme Moreau", objet: "Peinture façade", color: "#8b5cf6" },
    { poseur: "Lucas D.", client: "M. Petit", objet: "Extension terrasse", color: "#f5c842" },
    null,
  ],
};

const conflictCard: PlanningEntry = {
  poseur: "Michel R.",
  client: "M. Bernard",
  objet: "Pose carrelage",
  color: "#22c55e",
};

const advantages = [
  {
    title: "Glissez-déposez vos interventions",
    subtitle: "Aussi simple qu'un agenda",
  },
  {
    title: "Alerte immédiate si un artisan est déjà occupé",
    subtitle: "Plus aucun conflit de planning",
  },
  {
    title: "Vos équipiers reçoivent leur planning sur leur téléphone",
    subtitle: "Toujours à jour, sans appeler",
  },
  {
    title: "Un chantier décalé → la facture se met à jour automatiquement",
    subtitle: "Tout reste synchronisé",
  },
];

function ChantierCard({
  poseur,
  client,
  objet,
  color,
  conflict,
  pulsing,
}: {
  poseur: string;
  client: string;
  objet: string;
  color: string;
  conflict?: boolean;
  pulsing?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-2 text-left ${pulsing ? "animate-pulse" : ""} ${conflict ? "ring-2 ring-red-500" : ""}`}
      style={{ backgroundColor: color }}
    >
      <p className="text-[11px] text-white/70">{"\uD83D\uDC64"} {poseur}</p>
      <p className="text-sm font-bold text-white">{client}</p>
      <p className="text-[11px] italic text-white/80">{objet}</p>
    </div>
  );
}

export default function PlanningDemoSection() {
  const [showConflict, setShowConflict] = useState(false);
  const [conflictPulsing, setConflictPulsing] = useState(false);

  const handleSimulateConflict = () => {
    setShowConflict(true);
    setConflictPulsing(true);
    setTimeout(() => setConflictPulsing(false), 1500);
  };

  const handleReset = () => {
    setShowConflict(false);
    setConflictPulsing(false);
  };

  const isMichelCard = (entry: PlanningEntry | null) =>
    entry?.poseur === "Michel R.";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f1a3a] to-[#1a2d5a]">
      <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <span className="inline-block rounded-full bg-[#f5c842] px-5 py-2 font-syne text-sm font-bold text-[#0f1a3a]">
            ★ Fonctionnalité exclusive NexArtis
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-center font-syne text-3xl font-extrabold text-white md:text-4xl lg:text-5xl">
          Le planning qui pense à votre place
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-center font-manrope text-lg leading-relaxed text-gray-400">
          Chez tous les concurrents, le planning est une simple liste. Chez
          NexArtis, c&apos;est un vrai outil de travail.
        </p>

        {/* Interactive Planning Demo */}
        <div className="mx-auto mt-14 max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1525]/80 shadow-2xl shadow-black/30 backdrop-blur-sm">
            {/* Demo header bar */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="font-syne text-xs font-semibold uppercase tracking-wider text-gray-500">
                Planning — Semaine 15
              </span>
              <div className="w-14" />
            </div>

            {/* Conflict alert banner */}
            <AnimatePresence>
              {showConflict && (
                <motion.div
                  className="border-b border-red-500/30 bg-gradient-to-r from-red-500/20 to-orange-500/20 px-5 py-3"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <p className="text-center font-manrope text-sm font-semibold text-white">
                    ⚠️ Conflit détecté — Michel R. est déjà affecté chez M. Bernard (Pose carrelage) le mercredi après-midi.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Planning grid */}
            <div className="overflow-x-auto p-4 md:p-6">
              <div className="min-w-[640px]">
                <div className="mb-2 grid grid-cols-[80px_repeat(5,1fr)] gap-2">
                  <div />
                  {days.map((day) => (
                    <div key={day} className="text-center font-syne text-xs font-bold uppercase tracking-wider text-gray-400">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="mb-2 grid grid-cols-[80px_repeat(5,1fr)] gap-2">
                  <div className="flex items-center font-manrope text-[10px] font-medium uppercase tracking-widest text-gray-600">Matin</div>
                  {planningData.am.map((entry, dayIdx) => (
                    <div key={dayIdx} className="flex min-h-[72px] flex-col gap-1 rounded-lg bg-white/[0.03] p-1.5">
                      {entry && (
                        <ChantierCard
                          poseur={entry.poseur} client={entry.client} objet={entry.objet} color={entry.color}
                          conflict={showConflict && isMichelCard(entry) && dayIdx === 2}
                          pulsing={conflictPulsing && isMichelCard(entry) && dayIdx === 2}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-2">
                  <div className="flex items-center font-manrope text-[10px] font-medium uppercase tracking-widest text-gray-600">Après-midi</div>
                  {planningData.pm.map((entry, dayIdx) => (
                    <div key={dayIdx} className={`flex min-h-[72px] flex-col gap-1 rounded-lg p-1.5 ${entry === null && !showConflict ? "border border-dashed border-gray-600 bg-white/[0.01]" : "bg-white/[0.03]"}`}>
                      {entry && <ChantierCard poseur={entry.poseur} client={entry.client} objet={entry.objet} color={entry.color} />}
                      {showConflict && dayIdx === 2 && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}>
                          <ChantierCard poseur={conflictCard.poseur} client={conflictCard.client} objet={conflictCard.objet} color={conflictCard.color} conflict pulsing={conflictPulsing} />
                        </motion.div>
                      )}
                      {entry === null && !showConflict && <p className="m-auto text-[10px] text-gray-600">Libre</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-5 py-4">
              {!showConflict ? (
                <button onClick={handleSimulateConflict} className="rounded-xl bg-[#e87a2a] px-6 py-2.5 font-syne text-sm font-bold text-white transition-colors hover:bg-[#f09050]">
                  Simuler un conflit
                </button>
              ) : (
                <button onClick={handleReset} className="rounded-xl border border-white/20 px-6 py-2.5 font-syne text-sm font-bold text-white transition-colors hover:border-white/40 hover:bg-white/5">
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <button className="rounded-xl bg-[#e87a2a] px-8 py-4 font-syne text-lg font-bold text-white transition-colors hover:bg-[#f09050]">
            Essayer le vrai planning →
          </button>
        </div>

        {/* 4 Advantages Grid */}
        <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-2">
          {advantages.map((adv, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-5">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#5ab4e0]/20">
                <svg className="h-4 w-4 text-[#5ab4e0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-syne text-sm font-bold leading-snug text-white">{adv.title}</p>
                <p className="mt-1 font-manrope text-sm text-gray-500">{adv.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
