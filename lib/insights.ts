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

const VIDEO_FORMATS = new Set(["video", "reel", "short"]);

/** Rule-based findings derived from whatever slice of the audit is shown. */
export function buildInsights(
  data: AuditData,
): Insight[] {
  const k = computeKpis(data);
  const out: Insight[] = [...data.findings];
  if (!data.posts.length) return out;


  if (k.postsPerMonth !== null) {
    const ppm = k.postsPerMonth;
    out.push(
      ppm < 4
        ? {
            level: ppm < 2 ? "critical" : "warning",
            title: "Rythme de publication irrégulier",
            detail: `${formatNumber(ppm, 1)} publication(s) par mois en moyenne depuis ${k.first?.slice(0, 4)}. Les algorithmes pénalisent les pages peu actives.`,
            action:
              "Mettre en place un calendrier éditorial : 3 à 4 publications par semaine et par entité.",
          }
        : {
            level: "good",
            title: "Rythme de publication soutenu",
            detail: `${formatNumber(ppm, 1)} publications par mois en moyenne.`,
            action: "Maintenir le rythme et le planifier à l'avance.",
          },
    );
  }

  if (k.last) {
    const days = Math.round(
      (Date.parse(data.generatedAt) - Date.parse(k.last.padEnd(10, "-01").slice(0, 10))) /
        86_400_000,
    );
    if (days > 30)
      out.push({
        level: days > 90 ? "critical" : "warning",
        title: "Présence en sommeil",
        detail: `Dernière publication recensée il y a environ ${days} jours.`,
        action: "Relancer la page avec une série de contenus programmés.",
      });
  }

  const months = [
    ...new Set(data.posts.map((p) => monthOf(p.date)).filter(Boolean) as string[]),
  ].sort();
  let gap = { months: 0, from: "", to: "" };
  for (let i = 1; i < months.length; i++) {
    const d = monthDiff(months[i - 1], months[i]) - 1;
    if (d > gap.months) gap = { months: d, from: months[i - 1], to: months[i] };
  }
  if (gap.months >= 6)
    out.push({
      level: "critical",
      title: "Longue période sans publication",
      detail: `Aucune publication recensée pendant ${gap.months} mois, entre ${formatDate(gap.from)} et ${formatDate(gap.to)}. L'audience construite au départ s'est en grande partie perdue.`,
      action:
        "Ne plus jamais laisser une page sans animation : un planning minimal et un suppléant désigné pendant les absences.",
    });

  if (k.engagementRate !== null) {
    out.push(
      k.engagementRate < 1
        ? {
            level: "warning",
            title: "Engagement faible",
            detail: `Taux d'engagement moyen de ${formatNumber(k.engagementRate, 2)} % par publication (repère sectoriel : 1 à 3 %).`,
            action:
              "Poser des questions, publier des témoignages clients, des coulisses et des vidéos courtes.",
          }
        : {
            level: "good",
            title: "Engagement correct",
            detail: `Taux d'engagement moyen de ${formatNumber(k.engagementRate, 2)} % par publication.`,
            action: "Identifier les formats gagnants (top publications) et les répliquer.",
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
