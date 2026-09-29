import { ENTITIES, formatNumber } from "@/lib/metrics";
import { ENTITY_COLOR } from "./charts";
import type { Entity } from "@/lib/types";

// ---- Types of data/benchmark.json and data/strategy.json

interface Account {
  platform: string;
  followers: number | string | null;
  asOf?: string;
}
interface Reference {
  name: string;
  sector: string;
  relevance: Entity;
  accounts: Account[];
  practices: { title: string; detail: string }[];
  sources: string[];
}
interface MarketFact {
  metric: string;
  value: number | null;
  unit: string;
  period: string;
  source: string;
  url: string;
}
export interface Benchmark {
  market: MarketFact[];
  references: Reference[];
}

export interface StrategyData {
  title: string;
  ambition: string;
  phases: {
    id: string;
    name: string;
    months: [number, number];
    goal: string;
    deliverables: string[];
  }[];
  workstreams: { name: string; months: [number, number] }[];
  targets: {
    kpi: string;
    current: number;
    currentLabel: string;
    target: number;
    targetLabel: string;
    note: string;
  }[];
  unmeasured: string[];
  pillars: { entity: Entity; items: string[] }[];
  milestones: { month: number; items: string[] }[];
  requirements: string[];
  risks: { risk: string; answer: string }[];
  orangeLessons: { orange: string; brc: string }[];
  governance: string[];
}

const PHASE_COLOR = ["var(--e-cga)", "var(--e-cfp)", "var(--e-gathe)"];

function linkedinFollowers(r: Reference) {
  const a = r.accounts.find(
    (x) => x.platform.toLowerCase() === "linkedin" && typeof x.followers === "number",
  );
  return a ? (a.followers as number) : null;
}

/** Cameroon market facts, LinkedIn gap, and what the best local brands do. */
export function BenchmarkSection({
  data,
  lessons,
  ownLinkedIn,
}: {
  data: Benchmark;
  lessons: StrategyData["orangeLessons"];
  ownLinkedIn: { name: string; followers: number }[];
}) {
  const pick = (m: string) => data.market.find((f) => f.metric === m);
  const tiles = [
    [pick("Utilisateurs d'internet"), "Internautes au Cameroun", "41,9 % de la population"],
    [pick("Audience publicitaire Facebook"), "Audience Facebook", "1er réseau du pays"],
    [pick("Audience publicitaire LinkedIn (membres)"), "Membres LinkedIn", "cible entreprises du CGA"],
    [pick("Audience publicitaire Instagram"), "Audience Instagram", "public jeune, visuel"],
  ] as const;

  const refs = data.references
    .map((r) => ({ name: r.name.replace(/ \(.*\)$/, ""), value: linkedinFollowers(r), own: false }))
    .filter((r): r is { name: string; value: number; own: boolean } => r.value !== null)
    .sort((a, b) => b.value - a.value);
  const bars = [
    ...refs,
    ...ownLinkedIn
      .map((o) => ({ name: o.name, value: o.followers, own: true }))
      .sort((a, b) => b.value - a.value),
  ];
  const max = Math.max(...bars.map((b) => b.value));
  const orange = data.references.find((r) => r.name.startsWith("Orange"));
  const others = data.references.filter((r) => r !== orange);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Le terrain de jeu : le Cameroun connecté</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(([f, label, hint]) =>
            f && f.value !== null ? (
              <div key={label} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm text-ink-2">{label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {formatNumber(f.value, 1)} {f.unit.startsWith("millions") ? "M" : "k"}
                </p>
                <p className="mt-0.5 text-xs text-muted">{hint}</p>
              </div>
            ) : null,
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          Source : DataReportal, « Digital 2026: Cameroon » (données d&apos;octobre 2025).
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold">
          Abonnés LinkedIn : les références camerounaises et nous
        </h3>
        <p className="text-sm text-ink-2">
          LinkedIn réunit 1,6 million de membres au Cameroun, les décideurs que
          cible le CGA. C&apos;est là que l&apos;écart est le plus grand.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {bars.map((b) => (
            <li
              key={b.name}
              className="grid grid-cols-[minmax(110px,32%)_1fr_auto] items-center gap-3 text-sm"
            >
              <span className={`truncate ${b.own ? "font-semibold text-ink" : "text-ink-2"}`}>
                {b.name}
              </span>
              <span className="h-3.5">
                <span
                  className="block h-full rounded-r"
                  style={{
                    width: `${Math.max((b.value / max) * 100, 0.8)}%`,
                    background: b.own ? "var(--brand)" : "var(--axis)",
                  }}
                />
              </span>
              <span className={`num text-right ${b.own ? "font-semibold" : ""}`}>
                {formatNumber(b.value)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Abonnés relevés sur les pages LinkedIn publiques le 28 sept. 2026.
        </p>
      </div>

      {orange && (
        <div>
          <h3 className="text-sm font-semibold">
            Orange Cameroun, la référence : ce qu&apos;ils font et ce que nous en retenons
          </h3>
          <p className="text-sm text-ink-2">
            {formatNumber(linkedinFollowers(orange))} abonnés LinkedIn, 112 k sur
            Instagram, plus de 14 millions d&apos;abonnés mobiles revendiqués (mars 2025).
          </p>
          <ol className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {lessons.map((l, i) => (
              <li
                key={i}
                className="grid grid-cols-1 overflow-hidden rounded-xl border sm:grid-cols-2"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="p-4">
                  <p className="text-xs font-semibold tracking-wide text-[#c2410c] uppercase">
                    Orange
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{l.orange}</p>
                </div>
                <div className="bg-brand-soft p-4">
                  <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                    Pour BRC
                  </p>
                  <p className="mt-1 text-sm">{l.brc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold">
          Autres références par métier
        </h3>
        <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {others.map((r) => (
            <li key={r.name} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ background: ENTITY_COLOR[r.relevance] }}
                  aria-hidden
                />
                {r.name}
              </p>
              <p className="text-xs text-muted">
                {r.sector}
                {linkedinFollowers(r) !== null &&
                  ` · ${formatNumber(linkedinFollowers(r))} abonnés LinkedIn`}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-ink-2">
                {r.practices.slice(0, 2).map((p) => (
                  <li key={p.title}>
                    <span className="font-medium text-ink">{p.title}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          La pastille indique l&apos;entité du groupe concernée par la référence.
        </p>
      </div>
    </div>
  );
}

/** The 9-month plan: phases, workstreams timeline, and KPI targets. */
export function StrategySection({ data }: { data: StrategyData }) {
  const months = Array.from({ length: 9 }, (_, i) => i + 1);
  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-xl bg-brand-soft p-4 text-sm">
        <span className="font-semibold text-brand">Ambition · </span>
        {data.ambition}
      </p>

      <ol className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {data.phases.map((p, i) => (
          <li
            key={p.id}
            className="rounded-xl border-t-4 bg-page p-4"
            style={{ borderTopColor: PHASE_COLOR[i] }}
          >
            <p className="text-xs font-medium text-muted">
              Mois {p.months[0]} à {p.months[1]}
            </p>
            <p className="mt-0.5 font-semibold">
              {i + 1}. {p.name}
            </p>
            <p className="mt-1 text-sm text-ink-2">{p.goal}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {p.deliverables.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-muted" aria-hidden>
                    ✓
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div>
        <h3 className="text-sm font-semibold">Ce que nous publierons, entité par entité</h3>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.pillars.map((p) => (
            <li
              key={p.entity}
              className="rounded-xl border border-l-4 p-4"
              style={{ borderColor: "var(--border)", borderLeftColor: ENTITY_COLOR[p.entity] }}
            >
              <p className="text-sm font-semibold">
                {ENTITIES.find((e) => e.id === p.entity)?.label}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                {p.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Planning des chantiers</h3>
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[200px_repeat(9,minmax(0,1fr))] gap-y-1.5 text-xs">
              <span />
              {months.map((m) => {
                const phase = data.phases.findIndex(
                  (p) => m >= p.months[0] && m <= p.months[1],
                );
                return (
                  <span
                    key={m}
                    className="border-b-2 pb-1 text-center font-medium text-ink-2"
                    style={{ borderColor: PHASE_COLOR[phase] }}
                  >
                    M{m}
                  </span>
                );
              })}
              {data.workstreams.map((w, i) => (
                <div key={w.name} className="contents">
                  <span
                    className="truncate pr-3 text-sm text-ink-2"
                    style={{ gridColumn: 1, gridRow: i + 2 }}
                  >
                    {w.name}
                  </span>
                  <span
                    className="h-5 self-center rounded"
                    style={{
                      gridRow: i + 2,
                      gridColumn: `${w.months[0] + 1} / ${w.months[1] + 2}`,
                      background: "var(--brand)",
                      opacity: 0.85,
                    }}
                    title={`${w.name} : mois ${w.months[0]} à ${w.months[1]}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Ce que vous verrez, étape par étape</h3>
        <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.milestones.map((m) => (
            <li key={m.month} className="relative rounded-xl bg-page p-4">
              <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                Fin du mois {m.month}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {m.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand" aria-hidden>
                      ●
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Objectifs à 9 mois</h3>
        <p className="text-sm text-ink-2">
          Point de départ mesuré par cet audit, et cible proposée à la fin du mois 9.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.targets.map((t) => {
            const max = Math.max(t.current, t.target);
            return (
              <li key={t.kpi} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-medium">{t.kpi}</p>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["Aujourd'hui", t.current, t.currentLabel, "var(--axis)"],
                    ["Objectif M9", t.target, t.targetLabel, "var(--brand)"],
                  ].map(([label, v, text, color]) => (
                    <div
                      key={label as string}
                      className="grid grid-cols-[76px_1fr_auto] items-center gap-2"
                    >
                      <span className="text-xs text-muted">{label}</span>
                      <span className="h-3">
                        <span
                          className="block h-full rounded-r"
                          style={{
                            width: `${Math.max(((v as number) / max) * 100, 2)}%`,
                            background: color as string,
                          }}
                        />
                      </span>
                      <span className="num text-right font-semibold">{text}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">{t.note}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold">Ce que le groupe met à disposition</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
            {data.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold">Risques anticipés</p>
          <ul className="mt-2 space-y-2 text-sm">
            {data.risks.map((r) => (
              <li key={r.risk}>
                <span className="font-medium">{r.risk}</span>
                <span className="block text-ink-2">→ {r.answer}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold">Mesuré à partir du mois 1</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
            {data.unmeasured.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold">Pilotage avec la Direction</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
            {data.governance.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
