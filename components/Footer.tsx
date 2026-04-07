import Link from "next/link";

const metierLinks = [
  { label: "Plombier", href: "/logiciel-devis-plombier" },
  { label: "Électricien", href: "/logiciel-devis-electricien" },
  { label: "Maçon", href: "/logiciel-devis-macon" },
  { label: "Menuisier", href: "/logiciel-devis-menuisier" },
  { label: "Peintre", href: "/logiciel-devis-peintre" },
  { label: "Paysagiste", href: "/logiciel-devis-paysagiste" },
  { label: "Carreleur", href: "/logiciel-devis-carreleur" },
  { label: "Couvreur", href: "/logiciel-devis-couvreur" },
  { label: "Chauffagiste", href: "/logiciel-devis-chauffagiste" },
  { label: "Auto-entrepreneur", href: "/logiciel-artisan-auto-entrepreneur" },
];

const navLinks = [
  { label: "Tarifs", href: "/tarifs" },
  { label: "Blog", href: "/blog" },
  { label: "Se connecter", href: "/login" },
  { label: "Essai gratuit", href: "/register" },
];

const legalLinks = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "CGV", href: "/cgv" },
  { label: "RGPD", href: "/rgpd" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Column 1 — Logo & tagline */}
          <div>
            <Link href="/" className="font-syne text-2xl font-[800] text-white">
              Artidoc
            </Link>
            <p className="font-manrope mt-4 text-sm leading-relaxed text-white/70">
              Solution de gestion pour artisans du bâtiment — Développée à Bordeaux, Gironde.
            </p>
          </div>

          {/* Column 2 — Par métier */}
          <div>
            <h3 className="font-syne mb-4 text-sm font-bold uppercase tracking-wider text-white/50">
              Par métier
            </h3>
            <ul className="flex flex-col gap-2">
              {metierLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-manrope text-sm text-white/70 transition-colors hover:text-orange"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Support client */}
          <div>
            <h3 className="font-syne mb-4 text-sm font-bold uppercase tracking-wider text-white/50">
              Support client
            </h3>
            <ul className="flex flex-col gap-2 font-manrope text-sm text-white/70">
              <li>📞 05 57 00 00 00</li>
              <li>Lun-Ven 9h-18h</li>
              <li>📧 contact@artidoc.fr</li>
            </ul>
          </div>

          {/* Column 4 — Navigation & Legal */}
          <div className="flex flex-col gap-8 sm:flex-row sm:gap-16 md:flex-col md:gap-8">
            <div>
              <h3 className="font-syne mb-4 text-sm font-bold uppercase tracking-wider text-white/50">
                Navigation
              </h3>
              <ul className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-manrope text-sm text-white/70 transition-colors hover:text-orange"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-syne mb-4 text-sm font-bold uppercase tracking-wider text-white/50">
                Légal
              </h3>
              <ul className="flex flex-col gap-2">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-manrope text-sm text-white/70 transition-colors hover:text-orange"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8">
          <p className="font-manrope text-center text-xs leading-relaxed text-white/40">
            &copy; 2026 Artidoc &mdash; Bordeaux, France &middot; Logiciel
            certifi&eacute; conforme Factur-X &middot; Donn&eacute;es
            h&eacute;berg&eacute;es en France
          </p>
        </div>
      </div>
    </footer>
  );
}
