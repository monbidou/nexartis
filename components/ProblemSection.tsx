"use client";

const problems = [
  {
    icon: "💸",
    title: "Des tarifs transparents et maîtrisés",
    text: "Les solutions du marché atteignent souvent 50 à 100 € par mois pour accéder à l'ensemble des fonctionnalités. NexArtis propose tous les outils à 25 € par mois, sans restriction ni option cachée.",
  },
  {
    icon: "📅",
    title: "Une planification fiable, sans conflit d'affectation",
    text: "Les logiciels existants proposent un calendrier basique, sans détection de conflits. NexArtis vous alerte immédiatement si un intervenant est déjà affecté à un autre chantier le même jour.",
  },
  {
    icon: "📱",
    title: "Conçu pour une utilisation sur le terrain",
    text: "NexArtis fonctionne parfaitement sur smartphone comme sur ordinateur. L'interface a été pensée pour être utilisée rapidement, en situation de mobilité, directement depuis vos chantiers.",
  },
];

export default function ProblemSection() {
  return (
    <section className="bg-white px-6 py-14 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mx-auto max-w-3xl text-center font-syne text-2xl font-extrabold text-[#0f1a3a] md:text-3xl lg:text-4xl">
          Des outils professionnels à la hauteur de votre activité
        </h2>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-4 text-5xl">{problem.icon}</div>
              <h3 className="mb-3 font-syne text-xl font-bold text-[#0f1a3a]">
                {problem.title}
              </h3>
              <p className="font-manrope leading-relaxed text-[#0f1a3a]/70">
                {problem.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
