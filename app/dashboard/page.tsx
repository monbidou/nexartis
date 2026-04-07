"use client";

import Link from "next/link";
import { useState } from "react";
import EmptyDashboard from "@/components/dashboard/EmptyDashboard";

// --- Demo data ---
const alerts = [
  {
    type: "warning" as const,
    icon: "\u26A0",
    text: "2 factures impay\u00e9es depuis plus de 30 jours",
    link: "/dashboard/factures",
    linkText: "Voir les factures \u2192",
  },
  {
    type: "info" as const,
    icon: "\u2139",
    text: "3 devis envoy\u00e9s sans r\u00e9ponse depuis 15 jours",
    link: "/dashboard/devis",
    linkText: "Relancer \u2192",
  },
];

const metrics = [
  {
    label: "CA factur\u00e9",
    value: "14 200 \u20AC HT",
    trend: "\u2191 +12%",
    trendColor: "text-[#22c55e]",
    valueColor: "text-[#1a1a2e]",
  },
  {
    label: "CA encaiss\u00e9",
    value: "9 800 \u20AC",
    trend: "\u2191 +8%",
    trendColor: "text-[#22c55e]",
    valueColor: "text-[#1a1a2e]",
  },
  {
    label: "Reste \u00e0 encaisser",
    value: "4 400 \u20AC",
    trend: "3 factures",
    trendColor: "text-[#e87a2a]",
    valueColor: "text-[#e87a2a]",
    badge: true,
  },
  {
    label: "Devis en cours",
    value: "7",
    trend: "23 500 \u20AC HT",
    trendColor: "text-[#6b7280]",
    valueColor: "text-[#1a1a2e]",
  },
];

const planningData = [
  {
    day: "Lun",
    entries: [
      {
        poseur: "Michel R.",
        client: "M. Dupont",
        objet: "Instal. chauffe-eau",
        horaires: "8h\u219217h",
        bg: "bg-[#5ab4e0]/10",
      },
    ],
  },
  {
    day: "Mar",
    entries: [
      {
        poseur: "Thomas B.",
        client: "Mme Martin",
        objet: "R\u00e9nov. salle de bain",
        horaires: "8h\u219217h",
        bg: "bg-[#e87a2a]/10",
      },
    ],
  },
  {
    day: "Mer",
    entries: [
      {
        poseur: "Michel R.",
        client: "M. Bernard",
        objet: "Pose carrelage",
        horaires: "AM",
        bg: "bg-[#22c55e]/10",
      },
      {
        poseur: "Lucas D.",
        client: "Mme Moreau",
        objet: "Peinture fa\u00e7ade",
        horaires: "PM",
        bg: "bg-purple-500/10",
      },
    ],
  },
  {
    day: "Jeu",
    entries: [
      {
        poseur: "Lucas D.",
        client: "M. Petit",
        objet: "Extension terrasse",
        horaires: "8h\u219217h",
        bg: "bg-amber-500/10",
      },
    ],
  },
  {
    day: "Ven",
    entries: [
      {
        poseur: "Thomas B.",
        client: "Mme Girard",
        objet: "\u00c9lectricit\u00e9 cuisine",
        horaires: "AM",
        bg: "bg-rose-500/10",
      },
      {
        poseur: "",
        client: "Libre",
        objet: "",
        horaires: "PM",
        bg: "",
        empty: true,
      },
    ],
  },
];

const activityData = [
  {
    icon: "\uD83D\uDCC4",
    desc: "Devis #089 envoy\u00e9",
    detail: "M. Dupont",
    amount: "2 450 \u20AC",
    time: "il y a 2h",
  },
  {
    icon: "\u2705",
    desc: "Facture #067 pay\u00e9e",
    detail: "Mme Martin",
    amount: "1 800 \u20AC",
    time: "hier",
  },
  {
    icon: "\uD83D\uDC64",
    desc: "Nouveau client",
    detail: "SARL Renov33",
    amount: "",
    time: "il y a 3j",
  },
  {
    icon: "\uD83D\uDCC5",
    desc: "Chantier planifi\u00e9",
    detail: "M. Bernard \u2014 Pose carrelage",
    amount: "",
    time: "il y a 3j",
  },
  {
    icon: "\uD83D\uDCC4",
    desc: "Devis #088 sign\u00e9",
    detail: "Mme Girard",
    amount: "3 200 \u20AC",
    time: "il y a 4j",
  },
  {
    icon: "\uD83E\uDDFE",
    desc: "Facture #066 envoy\u00e9e",
    detail: "M. Petit",
    amount: "5 100 \u20AC",
    time: "il y a 5j",
  },
  {
    icon: "\uD83D\uDD14",
    desc: "Relance envoy\u00e9e",
    detail: "M. Leroy \u2014 Facture #061",
    amount: "",
    time: "il y a 6j",
  },
  {
    icon: "\uD83D\uDCC4",
    desc: "Devis #087 cr\u00e9\u00e9",
    detail: "M. Moreau",
    amount: "1 950 \u20AC",
    time: "il y a 1 sem",
  },
];

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

// --- Components ---

function AlertBar() {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-3 mb-8">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="bg-[#fff7ed] border-l-4 border-[#e87a2a] p-4 rounded flex items-center justify-between"
        >
          <span className="text-sm text-[#1a1a2e]">
            {alert.icon} {alert.text}
          </span>
          <Link
            href={alert.link}
            className="text-sm font-semibold text-[#e87a2a] hover:underline whitespace-nowrap ml-4"
          >
            {alert.linkText}
          </Link>
        </div>
      ))}
    </div>
  );
}

function MetricCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((m, i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
        >
          <p className="text-sm text-[#6b7280] font-manrope mb-1">{m.label}</p>
          <p className={`font-syne font-bold text-2xl ${m.valueColor}`}>
            {m.value}
          </p>
          <span
            className={`text-sm ${m.trendColor} ${
              m.badge
                ? "inline-block mt-1 px-2 py-0.5 rounded-full bg-[#e87a2a]/10 text-xs font-medium"
                : "mt-1 inline-block"
            }`}
          >
            {m.trend}
          </span>
        </div>
      ))}
    </div>
  );
}

function PlanningCard() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-syne font-bold text-lg text-[#1a1a2e]">
          Planning de la semaine
        </h2>
        <Link
          href="/dashboard/planning"
          className="text-sm text-[#5ab4e0] hover:underline"
        >
          Voir le planning complet &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {planningData.map((day) => (
          <div key={day.day} className="min-h-[120px]">
            <p className="text-xs font-semibold text-[#6b7280] text-center mb-2 uppercase tracking-wide">
              {day.day}
            </p>
            <div className="space-y-2">
              {day.entries.map((entry, j) =>
                entry.empty ? (
                  <div
                    key={j}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-2 flex items-center justify-center min-h-[80px]"
                  >
                    <span className="text-xs text-[#6b7280]">Libre</span>
                  </div>
                ) : (
                  <div key={j} className={`${entry.bg} rounded-lg p-2`}>
                    <p className="text-xs text-[#6b7280]">{entry.poseur}</p>
                    <p className="text-sm font-semibold text-[#1a1a2e]">
                      {entry.client}
                    </p>
                    <p className="text-xs text-[#5ab4e0]">{entry.objet}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {entry.horaires}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityCard() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <h2 className="font-syne font-bold text-lg text-[#1a1a2e] mb-4">
        Activit\u00e9 r\u00e9cente
      </h2>
      <div>
        {activityData.map((item, i) => (
          <div
            key={i}
            className={`py-3 flex gap-3 items-start ${
              i < activityData.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <span className="text-lg mt-0.5">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1a1a2e]">
                {item.desc}
              </p>
              <p className="text-xs text-[#6b7280]">
                {item.detail}
                {item.amount && (
                  <span className="text-[#1a1a2e] font-medium">
                    {" "}
                    &mdash; {item.amount}
                  </span>
                )}
              </p>
            </div>
            <span className="text-xs text-[#6b7280] whitespace-nowrap mt-1">
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CAChart() {
  const [period, setPeriod] = useState("Mois");
  const periods = ["Semaine", "Mois", "Trimestre", "Ann\u00e9e"];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-syne font-bold text-lg text-[#1a1a2e]">
          Chiffre d&apos;affaires
        </h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
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
          <span className="text-xs text-[#6b7280]">CA factur\u00e9</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#22c55e]" />
          <span className="text-xs text-[#6b7280]">CA encaiss\u00e9</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-1">
        {/* Y-axis */}
        <div className="flex flex-col justify-between h-[200px] mr-2 pb-6">
          {[...yAxisValues].reverse().map((v) => (
            <span key={v} className="text-xs text-[#6b7280] leading-none">
              {v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`}
            </span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1 flex items-end gap-1">
          {chartData.map((d) => {
            const barH = (d.facture / maxChartValue) * 200;
            const greenH = (d.encaisse / maxChartValue) * 200;
            return (
              <div
                key={d.month}
                className="flex-1 flex flex-col items-center"
              >
                <div
                  className="w-full relative rounded-t-sm"
                  style={{ height: `${barH}px` }}
                >
                  {/* Blue (facture) bar - full height */}
                  <div
                    className="absolute bottom-0 w-full bg-[#5ab4e0] rounded-t-sm"
                    style={{ height: `${barH}px` }}
                  />
                  {/* Green (encaisse) overlay */}
                  <div
                    className="absolute bottom-0 w-full bg-[#22c55e] rounded-t-sm opacity-70"
                    style={{ height: `${greenH}px` }}
                  />
                </div>
                <span className="text-xs text-[#6b7280] mt-2">{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Page ---

export default function DashboardPage() {
  const [showDemo, setShowDemo] = useState(true)

  if (!showDemo) {
    return (
      <>
        <EmptyDashboard userName="Jean" />
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-gray-700"
        >
          Vue avec données
        </button>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <h1 className="font-syne font-bold text-2xl text-[#1a1a2e] mb-6">
          Tableau de bord
        </h1>

        {/* Alerts */}
        <AlertBar />

        {/* Metric cards */}
        <MetricCards />

        {/* Two columns: Planning + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <PlanningCard />
          </div>
          <div className="lg:col-span-2">
            <ActivityCard />
          </div>
        </div>

        {/* CA Chart */}
        <CAChart />
      </div>

      <button
        onClick={() => setShowDemo(!showDemo)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-gray-700"
      >
        Vue nouveau compte
      </button>
    </div>
  );
}
