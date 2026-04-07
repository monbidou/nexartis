"use client";

import { useState } from "react";

// --- Demo chart data ---
const chartData = [
  { month: "Jan", facture: 8200, encaisse: 6500 },
  { month: "F\u00e9v", facture: 9100, encaisse: 7800 },
  { month: "Mar", facture: 11400, encaisse: 9200 },
  { month: "Avr", facture: 10800, encaisse: 8900 },
  { month: "Mai", facture: 13200, encaisse: 10500 },
  { month: "Jun", facture: 12100, encaisse: 11200 },
  { month: "Jul", facture: 9500, encaisse: 8800 },
  { month: "Ao\u00fb", facture: 4200, encaisse: 3900 },
  { month: "Sep", facture: 14800, encaisse: 12100 },
  { month: "Oct", facture: 15200, encaisse: 13400 },
  { month: "Nov", facture: 13800, encaisse: 11900 },
  { month: "D\u00e9c", facture: 14200, encaisse: 9800 },
];

const maxChartValue = Math.max(...chartData.map((d) => d.facture));
const yAxisValues = [0, 5000, 10000, 15000];

// --- Stat card component ---
function StatCard({
  label,
  value,
  valueColor = "text-[#1a1a2e]",
  size = "2xl",
}: {
  label: string;
  value: string;
  valueColor?: string;
  size?: "2xl" | "3xl";
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <p className="text-sm text-[#6b7280] font-manrope mb-2">{label}</p>
      <p
        className={`font-syne font-bold ${
          size === "3xl" ? "text-3xl" : "text-2xl"
        } ${valueColor}`}
      >
        {value}
      </p>
    </div>
  );
}

// --- Section header ---
function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="font-syne font-bold text-xl text-[#1a1a2e] mb-4 mt-10 first:mt-0">
      {title}
    </h2>
  );
}

// --- Page ---
export default function StatistiquesPage() {
  const [period, setPeriod] = useState("Mois");
  const periods = ["Semaine", "Mois", "Trimestre", "Ann\u00e9e"];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <h1 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-8">
          Statistiques
        </h1>

        {/* ===================== */}
        {/* Section 1: Chiffre d'affaires */}
        {/* ===================== */}
        <SectionHeader title="Chiffre d'affaires" />

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-[#6b7280] font-manrope">
                Total CA ann&eacute;e
              </p>
              <p className="font-syne font-bold text-3xl text-[#1a1a2e]">
                136 500 &euro; HT
              </p>
              <p className="text-sm text-[#22c55e] mt-1">+18% vs 2025</p>
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden self-start">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-[#0f1a3a] text-white"
                      : "text-[#6b7280] hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#5ab4e0]" />
              <span className="text-xs text-[#6b7280]">CA factur&eacute;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#22c55e]" />
              <span className="text-xs text-[#6b7280]">
                CA encaiss&eacute;
              </span>
            </div>
          </div>

          {/* Chart (larger) */}
          <div className="flex items-end gap-1">
            {/* Y-axis */}
            <div className="flex flex-col justify-between h-[280px] mr-3 pb-6">
              {[...yAxisValues].reverse().map((v) => (
                <span key={v} className="text-xs text-[#6b7280] leading-none">
                  {v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`}
                </span>
              ))}
            </div>

            {/* Bars */}
            <div className="flex-1 flex items-end gap-2">
              {chartData.map((d) => {
                const barH = (d.facture / maxChartValue) * 280;
                const greenH = (d.encaisse / maxChartValue) * 280;
                return (
                  <div
                    key={d.month}
                    className="flex-1 flex flex-col items-center group"
                  >
                    {/* Tooltip on hover */}
                    <div className="hidden group-hover:block text-xs text-center mb-1">
                      <span className="text-[#5ab4e0] font-medium">
                        {d.facture.toLocaleString("fr-FR")} &euro;
                      </span>
                      <br />
                      <span className="text-[#22c55e] font-medium">
                        {d.encaisse.toLocaleString("fr-FR")} &euro;
                      </span>
                    </div>
                    <div
                      className="w-full relative rounded-t-sm"
                      style={{ height: `${barH}px` }}
                    >
                      <div
                        className="absolute bottom-0 w-full bg-[#5ab4e0] rounded-t-sm"
                        style={{ height: `${barH}px` }}
                      />
                      <div
                        className="absolute bottom-0 w-full bg-[#22c55e] rounded-t-sm opacity-70"
                        style={{ height: `${greenH}px` }}
                      />
                    </div>
                    <span className="text-xs text-[#6b7280] mt-2">
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===================== */}
        {/* Section 2: Devis */}
        {/* ===================== */}
        <SectionHeader title="Devis" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Taux de transformation"
            value="68%"
            valueColor="text-[#22c55e]"
            size="3xl"
          />
          <StatCard label="D\u00e9lai moyen signature" value="4,2 jours" />
          <StatCard label="Montant moyen" value="3 350 \u20AC" />
          <StatCard
            label="Top client"
            value="SARL Renov33 \u2014 12 400 \u20AC"
          />
        </div>

        {/* ===================== */}
        {/* Section 3: Factures */}
        {/* ===================== */}
        <SectionHeader title="Factures" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="D\u00e9lai moyen paiement" value="22 jours" />
          <StatCard
            label="Montant impay\u00e9"
            value="4 400 \u20AC"
            valueColor="text-[#e87a2a]"
          />
          <StatCard
            label="Factures en retard"
            value="2"
            valueColor="text-[#ef4444]"
          />
          <StatCard label="Taux encaissement" value="89%" />
        </div>

        {/* ===================== */}
        {/* Section 4: Planning */}
        {/* ===================== */}
        <SectionHeader title="Planning" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <StatCard label="Taux occupation" value="78%" />
          <StatCard label="Jour le plus charg\u00e9" value="Mercredi" />
          <StatCard label="Chantiers ce mois" value="12" />
        </div>
      </div>
    </div>
  );
}
