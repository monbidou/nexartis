"use client";

import { motion } from "framer-motion";

interface FeatureCard {
  icon: string;
  title: string;
  text: string;
  tag: string;
  tagColor: "green" | "gold";
  exclusive?: boolean;
}

const cards: FeatureCard[] = [
  {
    icon: "📄",
    title: "Devis et factures en quelques minutes",
    text: "Sélectionnez votre client et vos prestations. Le devis est envoyé par email ou SMS. Votre client signe directement sur son téléphone.",
    tag: "✓ Conforme légalement",
    tagColor: "green",
  },
  {
    icon: "📅",
    title: "Planning qui évite les conflits",
    text: "Glissez vos chantiers sur le calendrier. Si vous affectez quelqu'un deux fois le même jour, une alerte orange apparaît immédiatement.",
    tag: "★ EXCLUSIF ARTIDOC",
    tagColor: "gold",
    exclusive: true,
  },
  {
    icon: "📊",
    title: "Suivi financier en temps réel",
    text: "Combien vous avez facturé ce mois-ci. Ce qui n'est pas encore payé. Ce qui arrive la semaine prochaine. Tout affiché simplement.",
    tag: "✓ Temps réel",
    tagColor: "green",
  },
  {
    icon: "🔔",
    title: "Plus d'impayés qui traînent",
    text: "Artidoc envoie automatiquement des rappels polis à vos clients qui n'ont pas payé. Vous n'avez plus à le faire vous-même.",
    tag: "✓ Automatique",
    tagColor: "green",
  },
  {
    icon: "⚡",
    title: "Conforme à la loi 2026",
    text: "Depuis septembre 2026, la facture électronique est obligatoire. Artidoc est déjà certifié. Vous ne risquez aucune amende.",
    tag: "⚠️ Obligatoire en 2026",
    tagColor: "gold",
  },
  {
    icon: "📱",
    title: "Fonctionne sur votre téléphone",
    text: "Créez un devis depuis votre chantier et envoyez-le en quelques instants. Votre client signe directement sur son téléphone.",
    tag: "✓ iOS & Android",
    tagColor: "green",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="bg-[#0f1a3a] py-20 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <h2 className="font-syne text-3xl font-extrabold text-white text-center md:text-4xl lg:text-5xl">
          Toutes les fonctionnalités dont votre entreprise a besoin
        </h2>
        <p className="mt-4 text-center text-lg text-[rgba(255,255,255,0.75)]">
          Prise en main immédiate. Efficacité durable.
        </p>

        {/* Cards grid */}
        <motion.div
          className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {cards.map((card) => (
            <motion.div
              key={card.title}
              variants={cardVariants}
              className={`
                group flex flex-col rounded-2xl bg-[#1a2d5a] p-8
                transition-transform duration-300 hover:-translate-y-1
                ${
                  card.exclusive
                    ? "border-2 border-[#f5c842] shadow-[0_0_24px_rgba(245,200,66,0.2)] md:scale-105"
                    : ""
                }
              `}
            >
              {/* Icon */}
              <span className="text-5xl leading-none">{card.icon}</span>

              {/* Title */}
              <h3 className="mt-5 font-syne text-xl font-bold text-white">
                {card.title}
              </h3>

              {/* Body */}
              <p className="mt-3 flex-1 text-[rgba(255,255,255,0.75)] leading-relaxed">
                {card.text}
              </p>

              {/* Tag */}
              <span
                className={`
                  mt-5 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold
                  ${
                    card.tagColor === "green"
                      ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]"
                      : "bg-[rgba(245,200,66,0.15)] text-[#f5c842]"
                  }
                `}
              >
                {card.tag}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
