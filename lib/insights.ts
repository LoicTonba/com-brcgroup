import type { AuditData } from "./types";
import {
  PLATFORM_LABEL,
  THEME_LABEL,
  computeKpis,
  countBy,
  formatDate,
  formatNumber,
  monthDiff,
  monthOf,
  perPlatform,
} from "./metrics";

export type Level = "good" | "warning" | "critical";

export interface Insight {
  level: Level;
  title: string;
  detail: string;
  action: string;
}

/** Average Facebook engagement per post, Socialinsider benchmarks (Jan 2026). */
const FACEBOOK_BENCHMARK = 0.15;

const VIDEO_FORMATS = new Set(["video", "reel", "short"]);

/** Rule-based findings derived from whatever slice of the audit is shown. */
export function buildInsights(
  data: AuditData,
): Insight[] {
  const k = computeKpis(data);
  const out: Insight[] = [...data.findings];
  if (!data.posts.length) return out;


  if (k.last12 !== null) {
    const ppm = k.last12 / 12;
    out.push(
      ppm < 12
        ? {
            level: ppm < 4 ? "critical" : "warning",
            title: "Rythme de publication insuffisant",
            detail: `Au moins ${k.last12} publications sur les 12 derniers mois, soit environ ${formatNumber(ppm, 1)} par mois pour ${data.sources.filter((s) => s.collected > 0).length} comptes réunis. Les algorithmes favorisent les pages qui publient plusieurs fois par semaine.`,
            action:
              "Calendrier éditorial : 3 à 4 publications par semaine et par entité, planifiées à l'avance.",
          }
        : {
            level: "good",
            title: "Rythme de publication soutenu",
            detail: `${k.last12} publications recensées sur les 12 derniers mois (environ ${formatNumber(ppm, 1)} par mois).`,
            action: "Maintenir le rythme et le planifier à l'avance.",
          },
    );
  }

  // Longest silence inside a single account whose history was collected in
  // full: on a partial collection a gap may just be posts we could not see.
  let gap = { months: 0, from: "", to: "", source: "" };
  for (const src of data.sources.filter((s) => s.status === "ok")) {
    const months = [
      ...new Set(
        data.posts
          .filter((p) => p.sourceId === src.id)
          .map((p) => monthOf(p.date))
          .filter(Boolean) as string[],
      ),
    ].sort();
    for (let i = 1; i < months.length; i++) {
      const d = monthDiff(months[i - 1], months[i]) - 1;
      if (d > gap.months)
        gap = { months: d, from: months[i - 1], to: months[i], source: src.name };
    }
  }
  if (gap.months >= 6)
    out.push({
      level: "critical",
      title: "Longue période sans publication",
      detail: `${gap.source} : aucune publication retrouvée pendant ${gap.months} mois, entre ${formatDate(gap.from)} et ${formatDate(gap.to)}. Une page silencieuse perd sa portée auprès de ses propres abonnés.`,
      action:
        "Ne plus laisser une page sans animation : planning minimal garanti et suppléant désigné pendant les absences.",
    });

  if (k.engagementRate !== null) {
    const rate = formatNumber(k.engagementRate, 2);
    out.push(
      k.engagementRate >= FACEBOOK_BENCHMARK
        ? {
            level: "good",
            title: "Une audience qui réagit",
            detail: `Taux d'engagement médian de ${rate} % par publication, au niveau ou au-dessus du repère international Facebook (${formatNumber(FACEBOOK_BENCHMARK, 2)} %, Socialinsider 2026). Le frein n'est pas l'intérêt des abonnés mais leur nombre et la régularité des publications.`,
            action:
              "Faire grandir l'audience (vidéo courte, sponsorisation ciblée, partages croisés entre entités) en gardant la qualité actuelle.",
          }
        : {
            level: "warning",
            title: "Engagement sous les repères",
            detail: `Taux d'engagement médian de ${rate} % par publication, sous le repère international Facebook (${formatNumber(FACEBOOK_BENCHMARK, 2)} %, Socialinsider 2026).`,
            action:
              "Poser des questions, publier des témoignages clients, des coulisses et des vidéos courtes.",
          },
    );
  }

  if (k.reactions > 0 && k.comments / k.reactions < 0.05)
    out.push({
      level: "warning",
      title: "Peu de conversation",
      detail: `${formatNumber(k.comments)} commentaires pour ${formatNumber(k.reactions)} réactions : l'audience réagit mais ne dialogue pas.`,
      action:
        "Terminer chaque publication par un appel à répondre et répondre à chaque commentaire sous 24 h.",
    });

  const video = data.posts.filter((p) => VIDEO_FORMATS.has(p.format)).length;
  const videoShare = (video / data.posts.length) * 100;
  if (videoShare < 20)
    out.push({
      level: "warning",
      title: "Trop peu de vidéo",
      detail: `Seulement ${Math.round(videoShare)} % des contenus sont des vidéos, alors que les formats courts (Reels, Shorts) sont les plus diffusés.`,
      action:
        "Produire 1 à 2 vidéos courtes par semaine : conseils fiscaux, vie du campus, témoignages de membres Gathe.",
    });

  const themes = countBy(data.posts, (p) => (p.theme ? p.theme : null));
  const [topTheme, topCount] = [...themes.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (topTheme && topCount / data.posts.length > 0.5)
    out.push({
      level: "warning",
      title: "Ligne éditoriale peu variée",
      detail: `${Math.round((topCount / data.posts.length) * 100)} % des contenus portent sur « ${THEME_LABEL[topTheme] ?? topTheme} ».`,
      action:
        "Équilibrer entre expertise, preuve sociale (témoignages), vie de l'entreprise et offres commerciales.",
    });

  if (k.ctaRate !== null && k.ctaRate < 70)
    out.push({
      level: "warning",
      title: "Appels à l'action insuffisants",
      detail: `${Math.round(k.ctaRate)} % des visuels comportent un contact ou un lien.`,
      action: "Systématiser un bandeau de contact (WhatsApp, téléphone, site) sur chaque visuel.",
    });

  const platforms = perPlatform(data);
  const ageDays = (d: string | null) =>
    d
      ? (Date.parse(data.generatedAt) - Date.parse(d.padEnd(7, "-01").padEnd(10, "-01"))) /
        86_400_000
      : Infinity;
  const dormant = platforms.filter((p) => p.posts > 0 && ageDays(p.last) > 90);
  const active = platforms.filter((p) => ageDays(p.last) <= 90);
  if (dormant.length)
    out.push({
      level: "critical",
      title: "Canaux à l'abandon",
      detail: dormant
        .map((p) => `${PLATFORM_LABEL[p.platform]} (dernière publication : ${formatDate(p.last)})`)
        .join(", ") + ". Un compte inactif donne une image d'entreprise fermée.",
      action:
        "Relancer chaque compte avec un plan de publication, ou le fermer proprement et rediriger vers les canaux actifs.",
    });
  if (active.length >= 2)
    out.push({
      level: "good",
      title: "Présence multicanale",
      detail: `${platforms.length} plateformes ouvertes, dont ${active.length} actives ces 3 derniers mois : une base à coordonner.`,
      action: "Centraliser la gestion sous un seul community manager groupe.",
    });

  const s = k.sentiment;
  if (k.sentimentTotal >= 10) {
    const neg = (s.negative / k.sentimentTotal) * 100;
    out.push(
      neg > 15
        ? {
            level: "critical",
            title: "Retours négatifs à traiter",
            detail: `${Math.round(neg)} % des commentaires analysés sont négatifs.`,
            action: "Mettre en place une charte de modération et un délai de réponse garanti.",
          }
        : {
            level: "good",
            title: "Image perçue positive",
            detail: `${Math.round(k.satisfaction ?? 0)} % des commentaires analysés sont positifs.`,
            action: "Transformer ces retours en témoignages publiés (avec accord).",
          },
    );
  }

  const order: Record<Level, number> = { critical: 0, warning: 1, good: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
