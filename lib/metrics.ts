import type { AuditData, Entity, Platform, Post, Source } from "./types";

export const ENTITIES: { id: Entity; label: string; long: string }[] = [
  { id: "CGA", label: "CGA", long: "Centre de Gestion Agréé" },
  { id: "CFP", label: "CFP", long: "Centre de Formation Professionnelle" },
  { id: "GATHE", label: "Gathe Finance", long: "Coopérative & tontine" },
  {
    id: "GROUPE",
    label: "Comptes communs",
    long: "Comptes au nom de Broad Range Consulting Group (YouTube, X, annuaires)",
  },
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X (Twitter)",
  maligah: "Maligah",
};

export const THEME_LABEL: Record<string, string> = {
  fiscalite: "Fiscalité",
  comptabilite: "Comptabilité",
  juridique: "Juridique",
  formation: "Formation",
  recrutement: "Recrutement",
  evenement: "Événement",
  conseil: "Conseil",
  promotion: "Promotion",
  voeux: "Vœux",
  temoignage: "Témoignage",
  financement: "Financement / épargne",
  vie: "Vie de l'entreprise",
  motivation: "Motivation",
  humour: "Humour",
  autre: "Autre",
};

export type EntityFilter = Entity | "ALL";

export function filterData(data: AuditData, entity: EntityFilter) {
  if (entity === "ALL") return data;
  return {
    ...data,
    sources: data.sources.filter((s) => s.entity === entity),
    posts: data.posts.filter((p) => p.entity === entity),
    findings: data.findings.filter((f) => f.entity === entity),
  };
}

const n = (v: number | null | undefined) => v ?? 0;

export function interactions(p: Post) {
  return n(p.reactions) + n(p.comments) + n(p.shares);
}

export function isMeasured(p: Post) {
  return p.reactions !== null || p.comments !== null || p.shares !== null;
}

export function monthOf(date: string | null) {
  return date && date.length >= 7 ? date.slice(0, 7) : null;
}

export function yearOf(date: string | null) {
  return date ? date.slice(0, 4) : null;
}

export function computeKpis(data: {
  sources: Source[];
  posts: Post[];
  generatedAt?: string;
}) {
  const { sources, posts } = data;
  const measured = posts.filter(isMeasured);
  const reactions = posts.reduce((a, p) => a + n(p.reactions), 0);
  const comments = posts.reduce((a, p) => a + n(p.comments), 0);
  const shares = posts.reduce((a, p) => a + n(p.shares), 0);
  const views = posts.reduce((a, p) => a + n(p.views), 0);
  const total = reactions + comments + shares;
  const followers = sources.reduce((a, s) => a + n(s.followers), 0);

  // Engagement rate per post = interactions / audience of its page. The median
  // is reported: a single viral post must not flatter the whole account.
  const rates = measured
    .map((p) => (p.audience ? interactions(p) / p.audience : null))
    .filter((r): r is number => r !== null)
    .sort((a, b) => a - b);
  const engagementRate = rates.length
    ? (rates.length % 2
        ? rates[(rates.length - 1) / 2]
        : (rates[rates.length / 2 - 1] + rates[rates.length / 2]) / 2) * 100
    : null;
  const engagementMean = rates.length
    ? (rates.reduce((a, r) => a + r, 0) / rates.length) * 100
    : null;

  const dated = posts
    .map((p) => p.date)
    .filter((d): d is string => !!d)
    .sort();
  const months = posts.map((p) => monthOf(p.date)).filter(Boolean) as string[];
  const first = dated[0] ?? null;
  const last = dated[dated.length - 1] ?? null;
  // Activity over the 12 months preceding the collection date.
  let last12: number | null = null;
  if (data.generatedAt) {
    const end = data.generatedAt.slice(0, 7);
    last12 = months.filter((m) => {
      const d = monthDiff(m, end);
      return d >= 0 && d < 12;
    }).length;
  }
  const postsPerMonth = last12 === null ? null : last12 / 12;

  const sentiment = posts.reduce(
    (a, p) => {
      if (!p.sentiment) return a;
      a.positive += p.sentiment.positive;
      a.neutral += p.sentiment.neutral;
      a.negative += p.sentiment.negative;
      return a;
    },
    { positive: 0, neutral: 0, negative: 0 },
  );
  const sentimentTotal =
    sentiment.positive + sentiment.neutral + sentiment.negative;
  const rated = sources.filter((s) => s.recommendation?.rate != null);
  const reviewCount = sources.reduce(
    (a, s) => a + (s.recommendation?.count ?? 0),
    0,
  );
  const ratedCount = rated.reduce((a, s) => a + s.recommendation!.count, 0);
  const recommendation = ratedCount
    ? rated.reduce(
        (a, s) => a + s.recommendation!.rate! * s.recommendation!.count,
        0,
      ) / ratedCount
    : null;

  // Volume published = every collected post, plus the posts a platform declares
  // that could not be collected (e.g. Instagram shows 179 but lists 12 logged-out).
  // Partitioned by source, so entity totals always add up to the group total.
  const published =
    posts.length +
    sources.reduce(
      (a, s) => a + Math.max(0, (s.totalPosts ?? 0) - s.collected),
      0,
    );
  // Directory listings carry the company's founding year, not an online presence.
  const since = sources
    .filter((s) => s.platform !== "maligah")
    .map((s) => s.createdAt?.slice(0, 4))
    .filter(Boolean)
    .sort()[0] ?? null;

  const withCta = posts.filter((p) => p.hasCallToAction !== null);
  const ctaRate = withCta.length
    ? (withCta.filter((p) => p.hasCallToAction).length / withCta.length) * 100
    : null;

  return {
    posts: posts.length,
    measured: measured.length,
    reactions,
    comments,
    shares,
    views,
    interactions: total,
    avgInteractions: measured.length ? total / measured.length : null,
    followers,
    engagementRate,
    engagementMean,
    first,
    last,
    postsPerMonth,
    last12,
    sentiment,
    satisfaction: sentimentTotal
      ? (sentiment.positive / sentimentTotal) * 100
      : null,
    sentimentTotal,
    recommendation,
    reviewCount,
    ratedCount,
    published,
    since,
    ctaRate,
    platforms: new Set([
      ...sources.map((s) => s.platform),
      ...posts.map((p) => p.platform),
    ]).size,
  };
}

export type Kpis = ReturnType<typeof computeKpis>;

export function monthDiff(a: string, b: string) {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

export function countBy<T>(items: T[], key: (t: T) => string | null) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (k === null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Publications per year, split by entity (for the stacked timeline). */
export function postsByYear(posts: Post[]) {
  const years = new Map<string, Record<Entity, number>>();
  for (const p of posts) {
    const y = yearOf(p.date);
    if (!y) continue;
    const row = years.get(y) ?? { CGA: 0, CFP: 0, GATHE: 0, GROUPE: 0 };
    row[p.entity]++;
    years.set(y, row);
  }
  return [...years.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function perPlatform(data: {
  sources: Source[];
  posts: Post[];
  generatedAt?: string;
}) {
  const platforms = [
    ...new Set([
      ...data.sources.map((s) => s.platform),
      ...data.posts.map((p) => p.platform),
    ]),
  ];
  return platforms
    .map((pl) => {
      const posts = data.posts.filter((p) => p.platform === pl);
      const sources = data.sources.filter((s) => s.platform === pl);
      return {
        platform: pl,
        ...computeKpis({ sources, posts, generatedAt: data.generatedAt }),
      };
    })
    .sort((a, b) => b.posts - a.posts);
}

export function topPosts(posts: Post[], limit = 8) {
  return posts
    .filter(isMeasured)
    .sort(
      (a, b) =>
        interactions(b) + n(b.views) / 100 - (interactions(a) + n(a.views) / 100),
    )
    .slice(0, limit);
}

export function formatNumber(v: number | null, digits = 0) {
  if (v === null || Number.isNaN(v)) return "—";
  if (Math.abs(v) >= 10000)
    return new Intl.NumberFormat("fr-FR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(v);
}

export function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!m) return y;
  const month = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
    "fr-FR",
    { month: "short" },
  );
  return day ? `${Number(day)} ${month} ${y}` : `${month} ${y}`;
}
