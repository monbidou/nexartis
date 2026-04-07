"use client";

import { motion } from "framer-motion";

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-navy py-20 lg:py-28">
      {/* Floating background shapes */}
      <motion.div
        className="absolute left-10 top-10 h-72 w-72 rounded-full bg-sky/5 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-orange/5 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/5 blur-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 font-syne text-3xl font-extrabold text-white md:text-4xl lg:text-5xl">
            Prenez le contrôle de votre gestion d&apos;entreprise
          </h2>

          <p className="mb-10 max-w-lg font-manrope text-lg font-light text-gray-400">
            14 jours d&apos;accès complet, gratuit, sans carte bancaire requise.
          </p>

          {/* Email form */}
          <form
            className="flex w-full max-w-xl flex-col gap-4 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Votre adresse email"
              className="h-16 flex-1 rounded-xl bg-white px-6 font-manrope text-lg text-navy placeholder-gray-400 outline-none focus:ring-2 focus:ring-sky"
            />
            <button
              type="submit"
              className="h-16 shrink-0 rounded-xl bg-orange px-8 font-syne text-lg font-bold text-white transition-colors hover:bg-orange-hover"
            >
              Commencer gratuitement →
            </button>
          </form>

          <p className="mt-5 font-manrope text-sm text-gray-500">
            Vos données sont hébergées en France et ne sont jamais partagées.
          </p>

          <p className="mt-4 font-manrope text-sm text-gray-500">
            Une question ? Appelez-nous : 05 57 00 00 00 (Lun-Ven 9h-18h)
          </p>
        </motion.div>
      </div>
    </section>
  );
}
