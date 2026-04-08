"use client";

export default function TrustBar() {
  const items = [
    "Conforme Factur-X 2026",
    "Certifié anti-fraude TVA",
    "Données hébergées en France",
    "Support par email",
  ];

  return (
    <section className="bg-[#f0ede4] py-8">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="font-syne text-lg font-bold text-[#0f1a3a] md:text-xl">
          NexArtis est conçu pour être aussi simple qu&apos;un SMS
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {items.map((item) => (
            <span
              key={item}
              className="flex items-center gap-2 text-sm text-[#0f1a3a] md:text-base"
            >
              <span className="text-[#22c55e] font-bold">✓</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
