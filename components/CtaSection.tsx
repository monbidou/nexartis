"use client";

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-navy py-14 lg:py-20">
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 font-syne text-3xl font-extrabold text-white md:text-4xl lg:text-5xl">
            Prenez le contrôle de votre gestion d&apos;entreprise
          </h2>

          <p className="mb-10 max-w-lg font-manrope text-lg font-light text-gray-400">
            14 jours d&apos;accès complet, gratuit, sans carte bancaire requise.
          </p>

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
            Une question ? Écrivez-nous : contact@nexartis.fr (Lun-Ven 9h-18h)
          </p>
        </div>
      </div>
    </section>
  );
}
