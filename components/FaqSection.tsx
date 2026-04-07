"use client";

import { motion } from "framer-motion";

const faqs = [
  {
    q: "Artidoc est-il accessible si je n'utilise pas beaucoup les outils informatiques ?",
    a: "Artidoc a été conçu spécifiquement pour les artisans, qu'ils soient ou non à l'aise avec les outils numériques. La prise en main est guidée pas à pas. En règle générale, les premiers devis sont créés dans les dix minutes suivant l'inscription.",
  },
  {
    q: "L'application Artidoc est-elle disponible sur smartphone ?",
    a: "Oui, sur tous les téléphones Android et iPhone. Artidoc fonctionne aussi bien sur un téléphone que sur un ordinateur. Vous pouvez créer un devis depuis votre chantier.",
  },
  {
    q: "Est-il possible d'essayer Artidoc avant de souscrire ?",
    a: "Oui. 14 jours d'essai complet, gratuit, sans entrer votre carte bancaire. Vous avez accès à tout pendant ces 14 jours.",
  },
  {
    q: "Artidoc est-il conforme à la réforme de la facturation électronique 2026 ?",
    a: "Depuis septembre 2026, la loi française oblige toutes les entreprises à pouvoir recevoir et envoyer des factures dans un format spécial appelé Factur-X. Si votre logiciel n'est pas conforme, vous risquez une amende. Artidoc est certifié conforme — vous ne risquez rien.",
  },
  {
    q: "Comment résilier mon abonnement Artidoc ?",
    a: "La résiliation s'effectue directement depuis votre espace Artidoc, sans formulaire, sans appel téléphonique et sans pénalité.",
  },
  {
    q: "Comment fonctionne le planning de chantier Artidoc ?",
    a: "Vous voyez tous vos chantiers sur une semaine, avec des couleurs différentes pour chaque client. Vous pouvez déplacer un chantier en le glissant avec votre doigt. Si vous essayez de mettre deux personnes au même endroit le même jour, Artidoc vous prévient avec une alerte orange.",
  },
  {
    q: "Artidoc gère-t-il les équipes avec plusieurs intervenants ?",
    a: "Artidoc inclut la gestion de votre équipe. Chaque membre de votre équipe reçoit son planning sur son téléphone. Tout le monde sait où il doit aller et quand.",
  },
  {
    q: "Où sont hébergées mes données et comment sont-elles protégées ?",
    a: "Vos données sont hébergées en France, sur des serveurs sécurisés. Elles ne sont jamais vendues ni partagées. Si vous arrêtez Artidoc, vous pouvez tout exporter en PDF ou Excel.",
  },
  {
    q: "Artidoc peut-il remplacer mon expert-comptable ?",
    a: "Non, et ce n'est pas son but. Artidoc vous aide à créer vos devis et factures, et à les envoyer à votre comptable en un clic au format qu'il utilise. Ça lui fait gagner du temps, et donc ça vous coûte moins cher.",
  },
  {
    q: "Comment Artidoc propose-t-il autant de fonctionnalités à 25 € par mois ?",
    a: "Nous pensons qu'un bon logiciel artisan ne devrait pas coûter le prix d'un repas au restaurant par semaine. Nous avons décidé de rendre tous les outils accessibles à un prix honnête, sans version premium, sans mauvaise surprise.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function FaqSection() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6">
        <motion.h2
          className="mb-14 text-center font-syne text-3xl font-extrabold text-navy md:text-4xl lg:text-5xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Vos questions, répondues simplement
        </motion.h2>

        <div className="mx-auto max-w-3xl">
          {faqs.map((faq, i) => (
            <motion.details
              key={i}
              className="group border-b border-gray-200 py-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between font-syne text-lg font-bold text-navy [&::-webkit-details-marker]:hidden">
                <span>{faq.q}</span>
                <span className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-navy transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 font-manrope text-base leading-relaxed text-gray-600">
                {faq.a}
              </p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  );
}
