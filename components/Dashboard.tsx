"use client";

import { useMemo, useState } from "react";
import type { AuditData, Entity, SourceStatus } from "@/lib/types";
import {
  ENTITIES,
  PLATFORM_LABEL,
  THEME_LABEL,
  computeKpis,
  countBy,
  filterData,
  formatDate,
  formatNumber,
  perPlatform,
  postsByYear,
  topPosts,
  type EntityFilter,
} from "@/lib/metrics";
import { buildInsights, type Level } from "@/lib/insights";
import {
  BarList,
  ENTITY_COLOR,
  Legend,
  SplitBar,
  StackedColumns,
} from "./charts";
import { Gallery, Videos, type MediaItem, type VideoItem } from "./Showcase";
import {
  BenchmarkSection,
  StrategySection,
  type Benchmark,
  type StrategyData,
} from "./Strategy";

const FORMAT_LABEL: Record<string, string> = {
  flyer: "Flyer / visuel",
  photo: "Photo",
  video: "Vidéo",
  short: "Vidéo courte",
  reel: "Reel",
  carrousel: "Carrousel",
  texte: "Texte",
  lien: "Lien",
  capture: "Capture / témoignage",
  autre: "Autre",
};

const STATUS: Record<SourceStatus, { label: string; color: string }> = {
  ok: { label: "Collecté", color: "var(--good)" },
  partial: { label: "Partiel", color: "var(--warning)" },
  login_required: { label: "Connexion requise", color: "var(--serious)" },
  blocked: { label: "Bloqué", color: "var(--critical)" },
  not_found: { label: "Introuvable", color: "var(--critical)" },
};

const LEVEL: Record<
  Level,
  { label: string; plural: string; color: string; wash: string; icon: string }
> = {
  critical: {
    label: "Prioritaire",
    plural: "Priorités",
    color: "var(--critical)",
    wash: "rgba(208, 59, 59, 0.07)",
    icon: "!",
  },
  warning: {
    label: "À améliorer",
    plural: "À améliorer",
    color: "var(--serious)",
    wash: "rgba(236, 131, 90, 0.09)",
    icon: "▲",
  },
  good: {
    label: "Point fort",
    plural: "Points forts",
    color: "var(--good)",
    wash: "rgba(12, 163, 12, 0.07)",
    icon: "✓",
  },
};

export default function Dashboard({
  data,
  media,
  videos,
  benchmark,
  strategy,
}: {
  data: AuditData;
  media: MediaItem[];
  videos: VideoItem[];
  benchmark: Benchmark;
  strategy: StrategyData;
}) {
  const [entity, setEntity] = useState<EntityFilter>("ALL");
  const inView = <T extends { entity: Entity }>(items: T[]) =>
    entity === "ALL" ? items : items.filter((i) => i.entity === entity);
  const ownLinkedIn = data.sources
    .filter((s) => s.platform === "linkedin" && s.followers !== null)
    .map((s) => ({
      name: `${ENTITIES.find((e) => e.id === s.entity)?.label} (BRC)`,
      followers: s.followers!,
    }));
  const view = useMemo(() => filterData(data, entity), [data, entity]);
  const k = useMemo(() => computeKpis(view), [view]);
  const insights = useMemo(() => buildInsights(view), [view]);
  const platforms = useMemo(() => perPlatform(view), [view]);
  const years = useMemo(() => postsByYear(view.posts), [view]);
  const present = ENTITIES.map((e) => e.id).filter((e) =>
    view.posts.some((p) => p.entity === e),
  );
  const current = ENTITIES.find((e) => e.id === entity);

  const themes = [...countBy(view.posts, (p) => p.theme || null)]
    .sort((a, b) => b[1] - a[1])
    .map(([t, v]) => ({ label: THEME_LABEL[t] ?? t, value: v }));
  const formats = [...countBy(view.posts, (p) => p.format || "autre")]
    .sort((a, b) => b[1] - a[1])
    .map(([f, v]) => ({ label: FORMAT_LABEL[f] ?? f, value: v }));

  const byLevel = (l: Level) => insights.filter((i) => i.level === l);

  return (
    <>
      <header className="hero text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-10 pb-8 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
              Broad Range Consulting Group · CGA · CFP · Gathe Finance
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Audit de la présence digitale
            </h1>
            <p className="mt-2 text-white/80">
              Toutes les publications du groupe sur les réseaux sociaux depuis
              la création des comptes : volume, audience, engagement et retours
              clients.
            </p>
            <p className="mt-4 text-sm text-white/70">
              Préparé pour la Direction Générale — Mme Paule Diane HIMSTA
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <dl className="flex flex-wrap gap-2 text-xs">
              {[
                [`${data.sources.length}`, "comptes audités"],
                [
                  `${new Set(data.sources.map((s) => s.platform)).size}`,
                  "plateformes",
                ],
                [formatDate(data.generatedAt), "date des données"],
              ].map(([v, l]) => (
                <div
                  key={l}
                  className="flex flex-col-reverse rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15"
                >
                  <dt className="text-white/70">{l}</dt>
                  <dd className="text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => window.print()}
              className="no-print rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-brand hover:bg-white/90"
            >
              Imprimer / exporter en PDF
            </button>
          </div>
        </div>
      </header>

      <nav
        className="no-print sticky z-30 border-b bg-page/90 backdrop-blur"
        style={{
          top: "env(safe-area-inset-top, 0px)",
          borderColor: "var(--border)",
        }}
        aria-label="Périmètre"
      >
        <div className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {[{ id: "ALL" as const, label: "Groupe (vue globale)" }, ...ENTITIES].map(
            (e) => {
              const active = entity === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => setEntity(e.id)}
                  aria-pressed={active}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-brand text-white"
                      : "text-ink-2 hover:bg-brand-soft"
                  }`}
                >
                  {e.id !== "ALL" && (
                    <span
                      className="inline-block size-2 shrink-0 rounded-full"
                      style={{ background: ENTITY_COLOR[e.id as Entity] }}
                    />
                  )}
                  {e.label}
                </button>
              );
            },
          )}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 sm:px-6">
      {current && (
        <div
          className="card mb-4 border-l-4 px-5 py-3"
          style={{ borderLeftColor: ENTITY_COLOR[current.id] }}
        >
          <p className="text-sm text-ink-2">
            <strong className="text-ink">{current.label}</strong> —{" "}
            {current.long}
          </p>
        </div>
      )}

      {/* Executive summary */}
      {insights.length > 0 && (
        <section className="card mb-4 p-5 sm:p-6" aria-labelledby="essentiel">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="essentiel" className="text-lg font-semibold">
              L&apos;essentiel
            </h2>
            <a
              href="#constats"
              className="no-print text-sm text-brand hover:underline"
            >
              Détail des constats et actions →
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(["critical", "warning", "good"] as Level[]).map((l) => (
              <div
                key={l}
                className="rounded-xl p-4"
                style={{ background: LEVEL[l].wash }}
              >
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="grid size-5 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: LEVEL[l].color }}
                    aria-hidden
                  >
                    {LEVEL[l].icon}
                  </span>
                  {LEVEL[l].plural} ({byLevel(l).length})
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                  {byLevel(l).map((i) => (
                    <li key={i.title} className="flex gap-2">
                      <span className="text-muted" aria-hidden>
                        •
                      </span>
                      {i.title}
                    </li>
                  ))}
                  {byLevel(l).length === 0 && (
                    <li className="text-muted">Aucun</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Headline figures */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="card flex flex-col justify-between p-6">
          <p className="text-sm text-ink-2">Publications recensées</p>
          <p className="mt-2 text-6xl font-semibold tracking-tight">
            {formatNumber(k.published)}
          </p>
          <p className="mt-3 text-sm text-ink-2">
            sur {k.platforms} plateforme{k.platforms > 1 ? "s" : ""}
            {k.since && <> · présence en ligne depuis {k.since}</>}
          </p>
          <p className="mt-1 text-xs text-muted">
            dont {formatNumber(k.posts)} analysées en détail ({formatDate(k.first)}{" "}
            → {formatDate(k.last)})
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat label="Abonnés cumulés" value={formatNumber(k.followers)} />
          <Stat
            label="Interactions totales"
            value={formatNumber(k.interactions)}
            hint={`${formatNumber(k.reactions)} réactions · ${formatNumber(k.comments)} commentaires · ${formatNumber(k.shares)} partages`}
          />
          <Stat
            label="Taux d'engagement médian"
            value={
              k.engagementRate === null
                ? "—"
                : `${formatNumber(k.engagementRate, 2)} %`
            }
            hint="interactions / abonnés par publication · repère Facebook : 0,15 %"
          />
          <Stat
            label="Vues vidéo"
            value={formatNumber(k.views)}
            hint="YouTube et vidéos Facebook"
          />
          <Stat
            label="Publications (12 derniers mois)"
            value={k.last12 === null ? "—" : `≥ ${formatNumber(k.last12)}`}
            hint={
              k.postsPerMonth === null
                ? undefined
                : `≈ ${formatNumber(k.postsPerMonth, 1)} par mois · dernière : ${formatDate(k.last)}`
            }
          />
          <Stat
            label="Satisfaction client"
            value={
              k.recommendation !== null
                ? `${Math.round(k.recommendation)} %`
                : k.satisfaction !== null
                  ? `${Math.round(k.satisfaction)} %`
                  : "—"
            }
            hint={
              k.recommendation !== null
                ? `recommandent la page (${k.ratedCount} avis Facebook notés)`
                : k.satisfaction !== null
                  ? `commentaires positifs (${k.sentimentTotal} analysés)`
                  : "pas assez d'avis publics"
            }
          />
        </div>
      </section>

      {/* Entity comparison (group view only) */}
      {entity === "ALL" && (
        <Card
          className="mt-4"
          title="Comparatif par entité"
          subtitle="Cliquez sur une entité pour afficher son détail"
        >
          <Table
            head={[
              "Entité",
              "Publications",
              "Abonnés",
              "Interactions",
              "Moy. / publication",
              "Engagement médian",
              "Dernière publication",
            ]}
            rows={ENTITIES.map((e) => {
              const ek = computeKpis(filterData(data, e.id));
              return {
                key: e.id,
                onClick: () => setEntity(e.id),
                cells: [
                  <span key="n" className="flex items-center gap-2 font-medium">
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ background: ENTITY_COLOR[e.id] }}
                    />
                    {e.label}
                  </span>,
                  formatNumber(ek.published),
                  formatNumber(ek.followers),
                  formatNumber(ek.interactions),
                  formatNumber(ek.avgInteractions, 1),
                  ek.engagementRate === null
                    ? "—"
                    : `${formatNumber(ek.engagementRate, 2)} %`,
                  formatDate(ek.last),
                ],
              };
            })}
          />
        </Card>
      )}

      <Card
        className="mt-4"
        title="Les visuels publiés"
        subtitle="Une sélection de flyers réellement publiés sur Facebook et Instagram · cliquez pour agrandir"
      >
        <Gallery items={inView(media)} />
      </Card>

      <Card
        className="mt-4"
        title="Les vidéos les plus vues"
        subtitle="Chaîne YouTube du groupe · la vidéo se charge uniquement au clic"
      >
        <Videos items={inView(videos)} />
      </Card>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Publications par année"
          subtitle="Évolution de l'activité depuis la création"
          aside={<Legend entities={present} />}
        >
          <StackedColumns rows={years} entities={present} />
        </Card>
        <Card
          title="Publications par plateforme"
          subtitle="Publications analysées en détail"
        >
          <BarList
            items={platforms.map((p) => ({
              label: PLATFORM_LABEL[p.platform],
              value: p.posts,
              hint: `${formatNumber(p.followers)} abonnés`,
            }))}
          />
        </Card>
      </section>

      <Card
        className="mt-4"
        title="Performance par plateforme"
        subtitle="Audience, interactions et engagement médian"
      >
        <Table
          head={[
            "Plateforme",
            "Abonnés",
            "Publications",
            "Réactions",
            "Commentaires",
            "Partages",
            "Vues",
            "Moy. / publication",
            "Engagement médian",
          ]}
          rows={platforms.map((p) => ({
            key: p.platform,
            cells: [
              <span key="p" className="font-medium">
                {PLATFORM_LABEL[p.platform]}
              </span>,
              formatNumber(p.followers),
              formatNumber(p.posts),
              formatNumber(p.reactions),
              formatNumber(p.comments),
              formatNumber(p.shares),
              formatNumber(p.views),
              formatNumber(p.avgInteractions, 1),
              p.engagementRate === null
                ? "—"
                : `${formatNumber(p.engagementRate, 2)} %`,
            ],
          }))}
        />
      </Card>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Thématiques" subtitle="Sujets abordés">
          <BarList items={themes} />
        </Card>
        <Card title="Formats" subtitle="Types de contenus publiés">
          <BarList items={formats} />
        </Card>
        <Card title="Retours de l'audience" subtitle="Tonalité des commentaires">
          {k.sentimentTotal >= 10 ? (
            <SplitBar
              parts={[
                { label: "Positifs", value: k.sentiment.positive, color: "var(--good)" },
                { label: "Neutres / questions", value: k.sentiment.neutral, color: "var(--axis)" },
                { label: "Négatifs", value: k.sentiment.negative, color: "var(--critical)" },
              ]}
            />
          ) : (
            <p className="rounded-lg bg-page p-3 text-sm text-ink-2">
              Trop peu de commentaires publics pour mesurer une tonalité (
              {k.sentimentTotal} analysé{k.sentimentTotal > 1 ? "s" : ""}).
              L&apos;audience réagit mais écrit peu : c&apos;est un axe de travail.
            </p>
          )}
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-2">Recommandation</dt>
              <dd className="mt-0.5 text-xl font-semibold">
                {k.recommendation !== null ? `${Math.round(k.recommendation)} %` : "—"}
              </dd>
              <dd className="text-xs text-muted">
                {k.ratedCount} avis Facebook notés
              </dd>
            </div>
            <div>
              <dt className="text-ink-2">Commentaires / publication</dt>
              <dd className="mt-0.5 text-xl font-semibold">
                {k.measured ? formatNumber(k.comments / k.measured, 1) : "—"}
              </dd>
              <dd className="text-xs text-muted">sur {k.measured} publications mesurées</dd>
            </div>
          </dl>
        </Card>
      </section>

      <Card
        className="mt-4"
        title="Publications les plus performantes"
        subtitle="Classées par nombre d'interactions"
      >
        <Table
          head={["Date", "Entité", "Plateforme", "Publication", "Réactions", "Comm.", "Partages", "Vues"]}
          rows={topPosts(view.posts).map((p) => ({
            key: p.id,
            cells: [
              formatDate(p.date),
              <span key="e" className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ background: ENTITY_COLOR[p.entity] }}
                />
                {ENTITIES.find((e) => e.id === p.entity)?.label}
              </span>,
              PLATFORM_LABEL[p.platform],
              p.url ? (
                <a key="t" href={p.url} target="_blank" rel="noreferrer" className="line-clamp-2 min-w-56 hover:text-brand hover:underline">
                  {p.title}
                </a>
              ) : (
                <span key="t" className="line-clamp-2 min-w-56">{p.title}</span>
              ),
              formatNumber(p.reactions),
              formatNumber(p.comments),
              formatNumber(p.shares),
              formatNumber(p.views),
            ],
          }))}
          empty="Aucune publication avec des interactions mesurées"
        />
        <p className="mt-3 text-xs text-muted">
          {k.measured} publications sur {k.posts} ont des
          interactions mesurables publiquement.
        </p>
      </Card>

      <Card
        id="constats"
        className="mt-4 scroll-mt-20"
        title="Constats et axes d'amélioration"
        subtitle="Générés automatiquement à partir des données de l'audit"
      >
        {insights.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {insights.map((it) => (
              <li
                key={it.title}
                className="rounded-xl border p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="flex items-center gap-2 text-xs font-medium text-ink-2">
                  <span
                    className="grid size-5 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: LEVEL[it.level].color }}
                    aria-hidden
                  >
                    {LEVEL[it.level].icon}
                  </span>
                  {LEVEL[it.level].label}
                </p>
                <p className="mt-2 font-semibold">{it.title}</p>
                <p className="mt-1 text-sm text-ink-2">{it.detail}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium text-brand">Action : </span>
                  {it.action}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Pas assez de données.</p>
        )}
      </Card>

      <Card
        id="references"
        className="mt-4 scroll-mt-20"
        title="Les références au Cameroun"
        subtitle="Ce que font les meilleurs, chiffres sourcés et vérifiables"
      >
        <BenchmarkSection
          data={benchmark}
          lessons={strategy.orangeLessons}
          ownLinkedIn={ownLinkedIn}
        />
      </Card>

      <Card
        id="strategie"
        className="mt-4 scroll-mt-20"
        title="Stratégie proposée sur 9 mois"
        subtitle={strategy.title}
      >
        <StrategySection data={strategy} />
      </Card>

      <Card
        className="mt-4"
        title="Méthode et périmètre de l'audit"
        subtitle="Comment les chiffres ont été obtenus"
      >
        <ul className="mb-5 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-ink-2 md:grid-cols-2">
          <li>
            <strong className="text-ink">Publications recensées</strong> :
            publications collectées une par une, plus celles qu&apos;une
            plateforme affiche au compteur sans les montrer (Instagram).
          </li>
          <li>
            <strong className="text-ink">Taux d&apos;engagement médian</strong> :
            (réactions + commentaires + partages) ÷ abonnés de la page, pour
            chaque publication. On retient la valeur du milieu, qu&apos;une seule
            publication virale ne peut pas gonfler.
          </li>
          <li>
            <strong className="text-ink">12 derniers mois</strong> : de
            octobre 2025 à septembre 2026. C&apos;est un minimum, car sans
            connexion Instagram n&apos;affiche que les 12 dernières publications.
          </li>
          <li>
            <strong className="text-ink">Sources</strong> : pages publiques des
            comptes du groupe, captures d&apos;écran de la page Facebook du CGA
            et métadonnées YouTube, relevées le {formatDate(data.generatedAt)}.
          </li>
        </ul>
        <Table
          head={["Compte", "Entité", "Plateforme", "Abonnés", "Publications collectées", "Collecte", "Remarques"]}
          rows={view.sources.map((s) => ({
            key: s.id,
            cells: [
              <a key="n" href={s.url} target="_blank" rel="noreferrer" className="font-medium hover:text-brand hover:underline">
                {s.name}
              </a>,
              ENTITIES.find((e) => e.id === s.entity)?.label,
              PLATFORM_LABEL[s.platform],
              formatNumber(s.followers),
              formatNumber(view.posts.filter((p) => p.sourceId === s.id).length),
              <span key="s" className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: STATUS[s.status].color }} />
                {STATUS[s.status].label}
              </span>,
              <span key="r" className="block max-w-72 text-xs text-ink-2">{s.notes}</span>,
            ],
          }))}
        />
      </Card>

      <footer className="mt-10 text-center text-xs text-muted">
        Audit réalisé pour la Direction Générale · Broad Range Consulting Group ·
        seules les données publiquement visibles ont été prises en compte.
      </footer>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Card({
  id,
  title,
  subtitle,
  aside,
  className = "",
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-ink-2">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Table({
  head,
  rows,
  empty = "Aucune donnée",
}: {
  head: string[];
  rows: { key: string; cells: React.ReactNode[]; onClick?: () => void }[];
  empty?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            {head.map((h, i) => (
              <th key={h} className={`pb-2 font-medium whitespace-nowrap ${i ? "pl-4" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="num">
          {rows.map((r) => (
            <tr
              key={r.key}
              onClick={r.onClick}
              className={`border-t ${r.onClick ? "cursor-pointer hover:bg-brand-soft" : ""}`}
              style={{ borderColor: "var(--grid)" }}
            >
              {r.cells.map((c, i) => (
                <td key={i} className={`py-2.5 align-top ${i ? "pl-4" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
