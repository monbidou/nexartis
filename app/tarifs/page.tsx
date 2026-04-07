"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import PricingSection from "@/components/PricingSection";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const detailedComparison = [
  { label: "Prix mensuel", artidoc: "25\u20ac/mois", obat: "49\u20ac+/mois", tolteck: "25\u20ac/mois", henrri: "Gratuit (limit\u00e9)" },
  { label: "Devis illimit\u00e9s", artidoc: true, obat: true, tolteck: false, henrri: false },
  { label: "Factures illimit\u00e9es", artidoc: true, obat: true, tolteck: false, henrri: false },
  { label: "Signature \u00e9lectronique", artidoc: true, obat: true, tolteck: false, henrri: false },
  { label: "Planning chantiers", artidoc: true, obat: "partial", tolteck: false, henrri: false },
  { label: "Alertes conflits planning", artidoc: true, obat: false, tolteck: false, henrri: false },
  { label: "Sync mobile \u00e9quipe", artidoc: true, obat: false, tolteck: false, henrri: false },
  { label: "Tableau de bord CA", artidoc: true, obat: true, tolteck: "partial", henrri: false },
  { label: "TVA auto (5.5/10/20%)", artidoc: true, obat: true, tolteck: true, henrri: false },
  { label: "Factur-X 2026", artidoc: true, obat: true, tolteck: false, henrri: false },
  { label: "Relances impay\u00e9s auto", artidoc: true, obat: true, tolteck: false, henrri: false },
  { label: "Acomptes / situations", artidoc: true, obat: true, tolteck: "partial", henrri: false },
  { label: "Export comptable", artidoc: true, obat: true, tolteck: true, henrri: "partial" },
  { label: "Application mobile", artidoc: true, obat: "partial", tolteck: "partial", henrri: false },
  { label: "Biblioth\u00e8que prestations", artidoc: true, obat: true, tolteck: true, henrri: false },
  { label: "Support t\u00e9l\u00e9phone", artidoc: true, obat: true, tolteck: false, henrri: false },
  { label: "Donn\u00e9es h\u00e9berg\u00e9es en France", artidoc: true, obat: true, tolteck: true, henrri: false },
  { label: "Sans engagement", artidoc: true, obat: false, tolteck: true, henrri: true },
];

const faqItems = [
  {
    q: "Y a-t-il des frais cach\u00e9s ou des options payantes\u00a0?",
    a: "Non, absolument aucun. Le tarif de 25\u20ac/mois HT inclut toutes les fonctionnalit\u00e9s : devis, factures, planning, signature \u00e9lectronique, application mobile, support. Pas de module suppl\u00e9mentaire \u00e0 acheter.",
  },
  {
    q: "Puis-je annuler mon abonnement \u00e0 tout moment\u00a0?",
    a: "Oui, Artidoc est sans engagement. Vous pouvez résilier directement depuis votre espace, \u00e0 tout moment. Vos donn\u00e9es restent accessibles pendant 30 jours apr\u00e8s l\u2019annulation.",
  },
  {
    q: "L\u2019essai gratuit est-il vraiment sans carte bancaire\u00a0?",
    a: "Oui. Vous cr\u00e9ez votre compte avec un email, et vous avez 14 jours pour tester toutes les fonctionnalit\u00e9s. Aucune carte bancaire n\u2019est demand\u00e9e \u00e0 l\u2019inscription.",
  },
  {
    q: "Proposez-vous un tarif annuel\u00a0?",
    a: "Pas encore. Nous pr\u00e9f\u00e9rons la simplicit\u00e9 d\u2019un tarif unique mensuel sans engagement. Si suffisamment de clients le demandent, nous \u00e9tudierons une offre annuelle avec r\u00e9duction.",
  },
  {
    q: "Pourquoi Artidoc est-il moins cher qu\u2019Obat\u00a0?",
    a: "Obat facture 49\u20ac/mois minimum et ajoute des modules payants. Artidoc a \u00e9t\u00e9 con\u00e7u d\u00e8s le d\u00e9part pour tout inclure \u00e0 un prix juste. Notre architecture technique moderne nous permet de r\u00e9duire nos co\u00fbts et de vous en faire profiter.",
  },
];

function CellIcon({ value }: { value: boolean | string }) {
  if (value === true)
    return <span className="text-lg text-emerald-400">&#10003;</span>;
  if (value === false)
    return <span className="text-lg text-red-400">&#10005;</span>;
  if (value === "partial")
    return <span className="text-lg text-yellow-400">~</span>;
  return <span className="text-sm text-white">{value}</span>;
}

export default function TarifsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy to-[#0d1525] py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.h1
            className="font-syne text-3xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5 }}
          >
            Un seul prix. Tout inclus.
            <br />
            <span className="text-sky">25&euro;/mois.</span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-2xl font-manrope text-lg leading-relaxed text-gray-300"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Chaque fonctionnalit&eacute; est incluse d&egrave;s le premier jour. Aucun module payant.
          </motion.p>
        </div>
      </section>

      {/* ── PricingSection component ── */}
      <PricingSection />

      {/* ── Detailed Comparison Table ── */}
      <section className="bg-cream py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2
            className="mb-4 text-center font-syne text-2xl font-extrabold text-navy md:text-3xl lg:text-4xl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Comparaison d&eacute;taill&eacute;e
          </motion.h2>
          <motion.p
            className="mx-auto mb-12 max-w-xl text-center font-manrope text-lg text-gray-500"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Voyez par vous-m&ecirc;me pourquoi Artidoc offre le meilleur rapport
            qualit&eacute;-fonctionnalit&eacute;s du march&eacute;.
          </motion.p>

          <motion.div
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="p-4 text-left font-manrope text-sm font-normal text-gray-400" />
                    <th className="bg-sky/10 p-4 font-syne text-sm font-bold text-sky">
                      Artidoc
                      <div className="mt-1 font-manrope text-xs font-normal text-gray-500">
                        25&euro;/mois
                      </div>
                    </th>
                    <th className="p-4 font-manrope text-sm font-semibold text-gray-500">
                      Obat
                      <div className="mt-1 text-xs font-normal text-gray-400">
                        49&euro;+/mois
                      </div>
                    </th>
                    <th className="p-4 font-manrope text-sm font-semibold text-gray-500">
                      Tolteck
                      <div className="mt-1 text-xs font-normal text-gray-400">
                        25&euro;/mois
                      </div>
                    </th>
                    <th className="p-4 font-manrope text-sm font-semibold text-gray-500">
                      Henrri
                      <div className="mt-1 text-xs font-normal text-gray-400">
                        Gratuit
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailedComparison.map((row, i) => (
                    <tr
                      key={row.label}
                      className={
                        i < detailedComparison.length - 1
                          ? "border-b border-gray-50"
                          : ""
                      }
                    >
                      <td className="p-4 text-left font-manrope text-sm text-gray-700">
                        {row.label}
                      </td>
                      <td className="bg-sky/5 p-4">
                        <CellIcon value={row.artidoc} />
                      </td>
                      <td className="p-4">
                        <CellIcon value={row.obat} />
                      </td>
                      <td className="p-4">
                        <CellIcon value={row.tolteck} />
                      </td>
                      <td className="p-4">
                        <CellIcon value={row.henrri} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            className="mb-12 text-center font-syne text-2xl font-extrabold text-navy md:text-3xl lg:text-4xl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Questions sur les tarifs
          </motion.h2>

          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <motion.div
                key={i}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <button
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="pr-4 font-syne text-base font-bold text-navy">
                    {item.q}
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy/5 text-navy transition-transform ${
                      openFaq === i ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="border-t border-gray-100 px-6 pb-5 pt-4">
                    <p className="font-manrope text-sm leading-relaxed text-gray-600">
                      {item.a}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-navy py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 font-syne text-3xl font-extrabold text-white md:text-4xl lg:text-5xl">
              Pr&ecirc;t &agrave; essayer&nbsp;?
            </h2>
            <p className="mx-auto mb-8 max-w-lg font-manrope text-lg text-gray-400">
              14 jours gratuits, toutes les fonctionnalit&eacute;s, sans carte
              bancaire. Annulez quand vous voulez.
            </p>
            <button className="h-16 rounded-xl bg-orange px-10 font-syne text-lg font-bold text-white transition-colors hover:bg-orange-hover">
              D&eacute;marrer mon essai gratuit &mdash; 14 jours
            </button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
