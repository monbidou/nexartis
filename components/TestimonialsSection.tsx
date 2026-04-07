"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "La gestion administrative me prenait plus de deux heures par semaine. Avec Artidoc, je traite mes devis et factures en vingt minutes. Le résultat est professionnel et mes clients le remarquent.",
    initials: "PM",
    name: "Pierre M.",
    info: "Plombier, Bordeaux (33)",
    avatarBg: "bg-sky",
  },
  {
    quote:
      "J'avais testé d'autres solutions, mais le rapport fonctionnalités/prix ne me convenait pas. Artidoc couvre tous mes besoins à un tarif raisonnable.",
    initials: "KB",
    name: "Karim B.",
    info: "Électricien, Mérignac (33)",
    avatarBg: "bg-orange",
  },
  {
    quote:
      "Le planning a transformé mon organisation. Je visualise l'ensemble des interventions de mon équipe en quelques secondes, et les alertes m'évitent les erreurs d'affectation.",
    initials: "SD",
    name: "Sylvain D.",
    info: "Maçon, Lyon (69)",
    avatarBg: "bg-emerald-500",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.15 },
  }),
};

export default function TestimonialsSection() {
  return (
    <section className="bg-cream py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-14 text-center font-syne text-3xl font-extrabold text-navy md:text-4xl lg:text-5xl">
          Ils ont choisi Artidoc pour piloter leur activité
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.initials}
              className="rounded-2xl bg-white p-8 shadow-lg"
              variants={cardVariants}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              {/* Stars */}
              <div className="mb-4 flex text-gold">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="text-xl">
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p className="mb-6 font-manrope text-base leading-relaxed text-gray-700">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${t.avatarBg} text-sm font-bold text-white`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="font-syne text-base font-bold text-navy">
                    {t.name}
                  </div>
                  <div className="font-manrope text-sm text-gray-500">
                    {t.info}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
