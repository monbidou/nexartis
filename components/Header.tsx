"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const featureItems = [
  {
    icon: "\u{1F4C4}",
    title: "Devis & Factures",
    desc: "Cr\u00e9ez vos documents BTP en quelques minutes",
    href: "/logiciel-devis-factures",
  },
  {
    icon: "\u{1F4C5}",
    title: "Planning intelligent",
    desc: "Alertes conflits automatiques",
    badge: "\u2605 Exclusif",
    href: "/planning-chantier-intelligent",
  },
  {
    icon: "\u{1F4CA}",
    title: "Tableau de bord",
    desc: "Suivez votre chiffre d\u2019affaires en temps r\u00e9el",
    href: "/#fonctionnalites",
  },
  {
    icon: "\u{1F514}",
    title: "Relances impay\u00e9s",
    desc: "R\u00e9cup\u00e9rez votre argent sans effort",
    href: "/#fonctionnalites",
  },
  {
    icon: "\u26A1",
    title: "Facture \u00e9lectronique",
    desc: "Conforme Factur-X 2026 obligatoire",
    href: "/#fonctionnalites",
  },
  {
    icon: "\u{1F4F1}",
    title: "Application mobile",
    desc: "iOS & Android \u2014 Con\u00e7u pour le terrain",
    href: "/#fonctionnalites",
  },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-5 md:h-[72px] lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-syne text-2xl font-[800] text-navy">
          <Image src="/images/logo-artidoc.png" alt="Artidoc" width={96} height={96} quality={100} className="h-12 w-auto object-contain" />
          Artidoc
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {/* Fonctionnalites dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 font-manrope text-sm font-medium text-navy/80 transition-colors hover:text-orange"
            >
              Fonctionnalit&eacute;s
              <svg
                className={`h-4 w-4 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Mega menu */}
            <div
              className={`absolute left-1/2 top-full z-50 w-[560px] -translate-x-1/2 pt-2 transition-all duration-150 ${
                dropdownOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-2 opacity-0"
              }`}
            >
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-xl">
                <div className="grid grid-cols-2 gap-2">
                  {featureItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                    >
                      <span className="text-3xl leading-none">{item.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-syne text-sm font-semibold text-navy">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {item.desc}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/tarifs"
            className="font-manrope text-sm font-medium text-navy/80 transition-colors hover:text-orange"
          >
            Tarifs
          </Link>
          <Link
            href="/blog"
            className="font-manrope text-sm font-medium text-navy/80 transition-colors hover:text-orange"
          >
            Blog
          </Link>
        </nav>

        {/* Desktop right side */}
        <div className="hidden items-center gap-4 md:flex">
          <a
            href="tel:0557000000"
            className="font-manrope text-sm font-medium text-navy/70 transition-colors hover:text-navy"
          >
            📞 05 57 00 00 00
          </a>
          <Link
            href="/login"
            className="font-manrope text-sm font-semibold text-navy transition-colors hover:text-orange"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="inline-flex h-[46px] items-center rounded-lg bg-[#e87a2a] px-6 font-syne text-sm font-bold text-white transition-colors hover:bg-[#f09050]"
          >
            Essai gratuit&nbsp;&rarr;
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          className="flex flex-col items-center justify-center gap-[5px] md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span
            className={`block h-[2px] w-6 bg-navy transition-transform duration-200 ${
              menuOpen ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-[2px] w-6 bg-navy transition-opacity duration-200 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-[2px] w-6 bg-navy transition-transform duration-200 ${
              menuOpen ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile full-screen overlay menu */}
      <div
        className={`fixed inset-0 top-[60px] z-50 bg-white transition-all duration-200 md:hidden ${
          menuOpen
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        }`}
      >
        <nav className="flex h-full flex-col px-5 py-4">
          {/* Fonctionnalites expandable */}
          <button
            type="button"
            onClick={() => setMobileSubOpen((v) => !v)}
            className="flex h-[56px] items-center justify-between font-syne text-lg font-semibold text-navy"
          >
            Fonctionnalit&eacute;s
            <svg
              className={`h-5 w-5 transition-transform duration-150 ${mobileSubOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Sub-items */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              mobileSubOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex flex-col gap-1 pb-2 pl-2">
              {featureItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={() => {
                    setMenuOpen(false);
                    setMobileSubOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-syne text-sm font-semibold text-navy">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/tarifs"
            onClick={() => setMenuOpen(false)}
            className="flex h-[56px] items-center font-syne text-lg font-semibold text-navy"
          >
            Tarifs
          </Link>
          <Link
            href="/blog"
            onClick={() => setMenuOpen(false)}
            className="flex h-[56px] items-center font-syne text-lg font-semibold text-navy"
          >
            Blog
          </Link>

          <hr className="my-3 border-gray-100" />

          {/* Phone number in mobile */}
          <a
            href="tel:0557000000"
            className="flex h-[56px] items-center font-manrope text-base font-medium text-navy/70"
          >
            📞 05 57 00 00 00
          </a>

          {/* Mobile CTAs at bottom */}
          <div className="mt-auto flex flex-col gap-3 pb-8">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex h-[48px] items-center justify-center font-manrope text-base font-semibold text-navy"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="flex h-[46px] items-center justify-center rounded-lg bg-[#e87a2a] font-syne text-base font-bold text-white transition-colors hover:bg-[#f09050]"
            >
              Essai gratuit&nbsp;&rarr;
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
