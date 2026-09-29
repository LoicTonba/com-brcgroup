// Generates the presenter's guide (HTML, then PDF through headless Chrome)
// from the same data and KPI code as the dashboard, so every figure matches.
//   pnpm guide
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import audit from "../data/audit.json";
import benchmark from "../data/benchmark.json";
import strategy from "../data/strategy.json";
import { buildInsights } from "../lib/insights";
import { ENTITIES, computeKpis, filterData, formatDate, formatNumber } from "../lib/metrics";
import type { AuditData } from "../lib/types";

const SITE = "https://com-brcgroup.vercel.app/";
const PRESENTER = "Loic Tonba";
const data = audit as AuditData;
const k = computeKpis(data);
const insights = buildInsights(data);
const byEntity = ENTITIES.map((e) => ({ ...e, k: computeKpis(filterData(data, e.id)) }));
const n = (v: number | null, d = 0) => formatNumber(v, d);
const pct = (v: number | null, d = 2) => (v === null ? "—" : `${formatNumber(v, d)} %`);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const market = (m: string) => benchmark.market.find((f) => f.metric === m);
const orange = benchmark.references.find((r) => r.name.startsWith("Orange"))!;
const linkedin = (name: string) =>
  benchmark.references
    .find((r) => r.name.startsWith(name))
    ?.accounts.find((a) => a.platform === "LinkedIn")?.followers as number | undefined;

// Where each finding can be shown on screen (screenshot numbers in
// Docs/publications-facebook-blog, kept on the presenter's laptop).
const EVIDENCE: Record<string, string> = {
  "Identité de marque incohérente":
    "pub-47, pub-62, pub-76 (site du CFP sur des flyers CGA ; pub-47 et pub-62 indiquent un agrément en 2021 au lieu de 2020), pub-71 (brconsulting-cm.com), pub-90 (branding personnel), pub-35 (#cfpbroadrangeconsulting sur la page CGA)",
  "Canaux à l'abandon":
    "Ouvrir en direct : x.com/broadrangec (dernier post mars 2022), la chaîne YouTube (dernière vidéo mars 2024), Instagram (février 2026)",
  "Visuels republiés à l'identique":
    "pub-60 / pub-80 et pub-83 / pub-95 (légendes identiques) ; pub-99 / pub-101 et pub-100 / pub-102 (publiés deux fois le 26 mars 2025)",
  "Contenus sans valeur de marque et risque de droits d'auteur":
    "pub-8 (dessin avec filigrane ledauphine.com), pub-10 et pub-35 (mèmes sans logo)",
  "Coquilles et légendes tronquées": "pub-30 (« Noël 2026 »), pub-107 (légende tronquée), pub-50 (« fical »)",
  "Présence éclatée, sans vitrine groupe":
    "Tableau « Méthode et périmètre » du site : 10 comptes, aucune page groupe ; fiche Maligah (adresse rue Jamot)",
  "Rythme de publication insuffisant": "Tuile « Publications (12 derniers mois) » du site",
  "Ligne éditoriale structurée depuis août 2025": "pub-18 à pub-57 (Aïcha le lundi, Owona le mercredi, Kamdem le vendredi)",
  "Synergies entre entités déjà visibles": "pub-83 et pub-95 (adhésion CGA + Gathe) ; pub-50 (un statut du CFP amène un client au CGA)",
  "Une vidéo a dépassé 75 000 vues": "Page Facebook du CFP, onglet Vidéos",
  "Une audience qui réagit": "Tuile « Taux d'engagement médian » du site",
};

const TIMELINE = [
  {
    t: "0:00 – 1:30",
    part: "Ouverture",
    show: "Haut de page (bandeau violet)",
    say: `« Madame, j'ai passé en revue toute la présence du groupe sur Internet depuis la création des premiers comptes en ${k.since} : ${n(k.published)} publications, ${k.platforms} plateformes, 10 comptes. Je vous présente ce qui marche, ce qui freine, et un plan concret sur 9 mois. »`,
  },
  {
    t: "1:30 – 3:00",
    part: "L'essentiel",
    show: "Encadré « L'essentiel » (3 colonnes)",
    say: "Commencer par les points forts (vert), puis les priorités (rouge). Une phrase par point. Message : « la base est bonne ; ce qui manque, c'est l'organisation, pas la qualité ».",
  },
  {
    t: "3:00 – 5:00",
    part: "Chiffres clés",
    show: "Tuile 502 + les 6 tuiles",
    say: `${n(k.followers)} abonnés cumulés, ${n(k.interactions)} interactions, ${n(k.views)} vues vidéo. Engagement médian de ${pct(k.engagementRate)}, au-dessus du repère Facebook (0,15 %) : les gens aiment ce que nous publions. Le frein est le volume : au moins ${k.last12} publications en 12 mois pour 10 comptes.`,
  },
  {
    t: "5:00 – 7:00",
    part: "Entités, visuels, vidéos",
    show: "Comparatif → cliquer CGA, CFP, Gathe → galerie → vidéos",
    say: "Laisser la PDG cliquer sur une entité. Montrer 2 ou 3 flyers et 10 secondes d'une vidéo. Citer la vidéo du CFP à 75 200 vues : la preuve que la vidéo touche large.",
  },
  {
    t: "7:00 – 9:00",
    part: "Constats",
    show: "Section « Constats et axes d'amélioration »",
    say: "Trois priorités : identité incohérente, canaux à l'abandon, présence éclatée. Captures pub-XX prêtes sur le téléphone. Ton factuel : « voici ce qu'un client voit ».",
  },
  {
    t: "9:00 – 11:30",
    part: "Les références au Cameroun",
    show: "Section « Les références au Cameroun »",
    say: "Le marché (12,6 M d'internautes, 1,6 M de membres LinkedIn), l'écart LinkedIn, puis les 6 leçons d'Orange Cameroun. « Orange n'est pas notre concurrent, c'est notre modèle de méthode. » Finir par une référence de notre métier.",
  },
  {
    t: "11:30 – 17:00",
    part: "La stratégie sur 9 mois",
    show: "Section « Stratégie proposée sur 9 mois », de haut en bas",
    say: "Dans l'ordre : l'ambition ; les 3 phases ; ce que nous publierons pour chaque entité ; le planning ; « ce que vous verrez » à M1, M3, M6 et M9 ; les 6 objectifs chiffrés ; ce que le groupe met à disposition et les risques anticipés. Phrase clé : « chaque mois, vous voyez les chiffres ici même, en 30 minutes ».",
  },
  {
    t: "17:00 – 20:00",
    part: "Proposition et conclusion",
    show: "Retour en haut de page, puis remise de la proposition commerciale imprimée",
    say: "« Pour mettre ce plan en œuvre, je vous propose de le piloter comme community manager du groupe. Voici ma proposition. » Remettre la feuille, la laisser lire, se taire. Puis : « Si vous êtes d'accord, le mois 1 démarre dès la semaine prochaine. » Suivre la fiche de négociation (document personnel).",
  },
];

const MONTHS = [
  ["M1", "Charte graphique groupe ; harmonisation des noms, bios et coordonnées des 10 comptes ; création de la page LinkedIn groupe ; revendication Maligah et Google Business Profile ; chiffres de référence."],
  ["M2", "Calendrier éditorial validé (3 publications / semaine / entité) ; rubriques récurrentes étendues au CFP et à Gathe ; WhatsApp Business (catalogue, réponses rapides) ; premiers Reels."],
  ["M3", "Rythme vidéo installé (1 Reel ou Short / semaine / entité) ; premier bilan mensuel ; objectif chiffré de demandes clients fixé sur la base mesurée."],
  ["M4", "Série témoignages (clients CGA, apprenants CFP, membres Gathe) ; lancement du programme ambassadeurs ; relance YouTube (2 vidéos / mois)."],
  ["M5", "Premières campagnes sponsorisées ciblées (Douala, Yaoundé) sur 2 offres prioritaires, contact direct WhatsApp ; charte de modération, réponse sous 24 h."],
  ["M6", "Live / webinaire du CGA (fiscalité, loi de finances) ; bilan de mi-parcours avec la Direction et ajustements."],
  ["M7", "Jeu-concours ou quiz interactif sur la page groupe ; mise en avant des offres croisées CGA + Gathe + CFP."],
  ["M8", "Campagne rentrée CFP et campagne adhésion CGA avec suivi des demandes entrantes ; défi vidéo des apprenants."],
  ["M9", "Bilan à 9 mois (audience, engagement, demandes clients, coût par contact) ; recommandations et budget de l'année 2."],
];

const WEEK = [
  ["Lundi", "CGA — rubrique comptable (Aïcha)"],
  ["Mardi", "CFP — formation, vie du campus, apprenants"],
  ["Mercredi", "CGA — rubrique juridique (Owona)"],
  ["Jeudi", "Gathe Finance — épargne, crédit, témoignage de membre"],
  ["Vendredi", "CGA — rubrique fiscale (Kamdem)"],
  ["Samedi", "Vidéo courte de la semaine (une entité à tour de rôle)"],
  ["Dimanche", "Page groupe — valeurs, équipe, motivation"],
];

const FAQ = [
  [
    "« Vos chiffres ne correspondent pas à ce que je vois sur Facebook. »",
    `Les compteurs changent chaque jour : ceux-ci ont été relevés le ${formatDate(data.generatedAt)}. Les abonnés sont additionnés compte par compte (${n(k.followers)} au total), donc une même personne abonnée à deux pages compte deux fois. C'est expliqué dans la section « Méthode ».`,
  ],
  [
    "« 0,23 % d'engagement, ce n'est pas très faible ? »",
    "Non : sur Facebook, la moyenne internationale est de 0,15 % (Socialinsider, janvier 2026). Nos abonnés réagissent bien ; ce qui manque, c'est la fréquence et la croissance de l'audience.",
  ],
  [
    "« Pourquoi Orange ? Nous ne sommes pas un opérateur. »",
    "On ne copie pas leur budget, on copie leur méthode : une signature unique, la vidéo courte, des jeux liés au service, le service client sur WhatsApp, et la formation des jeunes. Pour notre métier, on regarde aussi Advans (microfinance), Forvis Mazars (conseil) et l'IUC (formation).",
  ],
  [
    "« Combien cela va coûter ? »",
    "Répondre avec la proposition commerciale : un forfait mensuel qui couvre tout le plan (publications, vidéos, modération, rapport mensuel). Le budget publicitaire est à part, il ne démarre qu'au mois 5, sur 2 offres, avec un montant test fixé ensemble et mesuré en coût par contact. Pour la négociation, suivre la fiche personnelle.",
  ],
  [
    "« Quels résultats pouvez-vous garantir ? »",
    "Les moyens sont garantis : le rythme de publication, la charte, la réponse sous 24 h. Les résultats sont mesurés chaque mois dans ce tableau de bord, avec des objectifs ajustés au mois 3 et au mois 6 si nécessaire.",
  ],
  [
    "« Et si ça ne marche pas ? »",
    "Le plan a des jalons datés : à la fin du mois 3, vous voyez sur le tableau de bord si le rythme, les vidéos et les délais de réponse sont tenus. C'est le moment naturel pour décider de continuer.",
  ],
  [
    "« Pourquoi ne pas tout faire tout de suite ? »",
    "Sponsoriser des pages incohérentes (coordonnées différentes, comptes inactifs) gaspille le budget. Les fondations du mois 1 rendent chaque franc dépensé ensuite efficace.",
  ],
  [
    "« Qui va produire les vidéos ? »",
    "Des formats simples, tournés au téléphone : conseils de 30 secondes par les experts, coulisses, témoignages. Les collaborateurs et les apprenants volontaires participent (programme ambassadeurs).",
  ],
  [
    "« Et les commentaires, la satisfaction ? »",
    `100 % de recommandation sur ${k.ratedCount} avis Facebook notés. En revanche, ${k.comments} commentaires pour ${k.measured} publications mesurées, soit moins de 2 par publication, et trop peu de commentaires publics lisibles pour mesurer une tonalité : on ne l'affirme donc pas. C'est un axe du plan : faire parler la communauté et publier des témoignages.`,
  ],
];

const bar = (v: number, max: number, color: string) =>
  `<span class="bar"><span style="width:${Math.max((v / max) * 100, 1.5)}%;background:${color}"></span></span>`;

const COLORS: Record<string, string> = { CGA: "#2a78d6", CFP: "#eb6834", GATHE: "#1baf7a", GROUPE: "#4a3aa7" };
const maxPub = Math.max(...byEntity.map((e) => e.k.published));
const maxFol = Math.max(...byEntity.map((e) => e.k.followers));

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Guide de présentation — Audit digital Broad Range Consulting Group</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #1b1b1b; font-size: 10.5pt; line-height: 1.5; margin: 0; }
  h1, h2, h3 { line-height: 1.2; margin: 0; }
  h2 { font-size: 16pt; color: #3b1760; margin: 0 0 3mm; padding-top: 1mm; }
  h3 { font-size: 11.5pt; margin: 5mm 0 2mm; }
  p { margin: 0 0 2.5mm; }
  .page { break-after: page; }
  .flow + section, .flow { margin-top: 8mm; }
  h2, h3 { break-after: avoid; }
  .muted { color: #6b6a66; }
  .small { font-size: 9pt; }
  .cover { height: 263mm; display: flex; flex-direction: column; justify-content: space-between; padding: 14mm; border-radius: 6mm; color: #fff;
    background: linear-gradient(135deg, #2e1150 0%, #5b2a86 55%, #7b3fae 100%); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cover h1 { font-size: 30pt; margin-top: 6mm; }
  .cover .eyebrow { letter-spacing: .18em; text-transform: uppercase; font-size: 9pt; opacity: .8; }
  .cover .lead { font-size: 13pt; opacity: .9; margin-top: 5mm; max-width: 150mm; }
  .cover .meta { font-size: 10.5pt; opacity: .9; }
  .cover .box { background: rgba(255,255,255,.12); border-radius: 4mm; padding: 5mm 6mm; margin-top: 8mm; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; }
  th { text-align: left; font-size: 8.5pt; color: #6b6a66; font-weight: 600; border-bottom: 1.2px solid #c3c2b7; padding: 1.8mm 2mm; }
  td { border-bottom: 1px solid #e6e5df; padding: 2mm; vertical-align: top; }
  tr { break-inside: avoid; }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .card { border: 1px solid #e1e0d9; border-radius: 3mm; padding: 4mm 5mm; margin: 3mm 0; break-inside: avoid; }
  .key { background: #efe8f6; border: none; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; }
  .tile { border: 1px solid #e1e0d9; border-radius: 3mm; padding: 3mm 4mm; break-inside: avoid; }
  .tile b { display: block; font-size: 17pt; font-weight: 600; margin-top: 1mm; }
  .bar { display: inline-block; width: 100%; height: 3mm; }
  .bar span { display: block; height: 100%; border-radius: 0 1mm 1mm 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .dot { display: inline-block; width: 2.5mm; height: 2.5mm; border-radius: 50%; margin-right: 1.5mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .tag { display: inline-block; font-size: 8pt; font-weight: 700; color: #fff; border-radius: 1mm; padding: .3mm 1.8mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .critical { background: #d03b3b; } .warning { background: #c2410c; } .good { background: #0a8a0a; }
  .say { font-style: italic; }
  .phase { border-top: 1.2mm solid; padding-top: 2mm; }
  ul { margin: 0 0 2mm; padding-left: 5mm; } li { margin-bottom: 1mm; }
  .check li { list-style: none; margin-left: -5mm; } .check li::before { content: "☐  "; }
</style></head><body>

<section class="page">
  <div class="cover">
    <div>
      <div class="eyebrow">Broad Range Consulting Group · CGA · CFP · Gathe Finance</div>
      <h1>Audit de la présence digitale<br>et stratégie sur 9 mois</h1>
      <p class="lead">Guide de présentation à la Direction Générale : déroulé minuté, chiffres à maîtriser, preuves, plan d'action et réponses aux questions.</p>
      <div class="box">
        <div class="meta"><b>Présentation à :</b> Mme Paule Diane HIMSTA, Direction Générale</div>
        <div class="meta"><b>Présenté par :</b> ${PRESENTER}</div>
        <div class="meta"><b>Durée :</b> 20 minutes + questions</div>
        <div class="meta"><b>Support :</b> ${SITE}</div>
      </div>
    </div>
    <div class="meta">Données relevées le ${formatDate(data.generatedAt)} · document interne</div>
  </div>
</section>

<section class="page">
  <h2>1. Le message à faire passer</h2>
  <div class="card key">
    <p style="font-size:12pt;margin:0"><b>« Le groupe publie des contenus de qualité que son audience apprécie, mais de façon dispersée et irrégulière. Avec une organisation de groupe, un rythme tenu et la méthode des meilleures marques du Cameroun, nous pouvons multiplier la visibilité en 9 mois et la transformer en clients. »</b></p>
  </div>
  <h3>Les 3 idées à laisser en tête</h3>
  <ol>
    <li><b>La qualité est là</b> : engagement médian de ${pct(k.engagementRate)} par publication, au-dessus du repère Facebook (0,15 %), et 100 % de recommandation sur ${k.ratedCount} avis Facebook notés.</li>
    <li><b>L'organisation manque</b> : 10 comptes, 3 identités différentes, des canaux à l'abandon, au moins ${k.last12} publications seulement en 12 mois.</li>
    <li><b>Le plan est concret et mesurable</b> : 3 phases, des contenus définis pour chaque entité, des jalons à M1, M3, M6 et M9, 6 objectifs chiffrés suivis chaque mois dans le tableau de bord.</li>
  </ol>

  <h3>Déroulé minuté (20 minutes)</h3>
  <table>
    <tr><th style="width:17mm">Temps</th><th style="width:34mm">Partie</th><th style="width:42mm">À l'écran</th><th>Ce que vous dites</th></tr>
    ${TIMELINE.map((r) => `<tr><td class="num">${r.t}</td><td><b>${r.part}</b></td><td class="small">${r.show}</td><td class="small say">${esc(r.say)}</td></tr>`).join("")}
  </table>
  <p class="small muted">Conseil : laissez la PDG cliquer elle-même sur une entité du comparatif ; elle s'approprie les chiffres. La stratégie est le cœur : gardez-lui ses 5 minutes 30, quitte à écourter les chiffres.</p>
</section>

<section class="page">
  <h2>2. Les chiffres à connaître par cœur</h2>
  <div class="grid3">
    <div class="tile">Publications recensées<b>${n(k.published)}</b><span class="small muted">dont ${n(k.posts)} analysées une par une</span></div>
    <div class="tile">Abonnés cumulés<b>${n(k.followers)}</b><span class="small muted">10 comptes additionnés</span></div>
    <div class="tile">Interactions<b>${n(k.interactions)}</b><span class="small muted">${n(k.reactions)} réactions · ${n(k.comments)} comm. · ${n(k.shares)} partages</span></div>
    <div class="tile">Engagement médian<b>${pct(k.engagementRate)}</b><span class="small muted">repère Facebook : 0,15 %</span></div>
    <div class="tile">Vues vidéo<b>${n(k.views)}</b><span class="small muted">dont 75 200 sur une seule vidéo du CFP</span></div>
    <div class="tile">12 derniers mois<b>≥ ${k.last12}</b><span class="small muted">publications, ≈ ${n(k.postsPerMonth, 1)} par mois</span></div>
  </div>

  <h3>Définitions : savoir répondre « comment avez-vous calculé ? »</h3>
  <table>
    <tr><th style="width:42mm">Indicateur</th><th>Définition</th></tr>
    <tr><td><b>Publications recensées</b></td><td>Publications collectées une par une (${n(k.posts)}), plus celles qu'une plateforme affiche au compteur sans les montrer : Instagram affiche 179 publications pour le CFP et 119 pour Gathe, mais sans connexion n'en montre que 12.</td></tr>
    <tr><td><b>Engagement médian</b></td><td>Pour chaque publication : (réactions + commentaires + partages) ÷ abonnés de la page. On retient la valeur du milieu. La moyenne (${pct(k.engagementMean)}) est gonflée par une seule vidéo virale ; la médiane ne l'est pas.</td></tr>
    <tr><td><b>12 derniers mois</b></td><td>Octobre 2025 à septembre 2026. C'est un minimum : on n'a pas vu toutes les publications Instagram.</td></tr>
    <tr><td><b>Satisfaction</b></td><td>« Recommandé par 100 % » affiché par Facebook : CGA 5 avis, CFP 8 avis (13 avis notés ; Gathe a 1 avis sans note). Très peu de commentaires écrits : la tonalité n'est pas mesurable, on ne l'affirme pas.</td></tr>
    <tr><td><b>Présence depuis ${k.since}</b></td><td>Création de la page Facebook du CGA (7 décembre 2017). CFP : août 2019. Gathe : mai 2021. YouTube : mars 2021.</td></tr>
  </table>

  <h3>Par entité</h3>
  <table>
    <tr><th>Entité</th><th style="width:22mm">Publications</th><th style="width:38mm"></th><th style="width:20mm">Abonnés</th><th style="width:38mm"></th><th style="width:22mm">Engagement</th></tr>
    ${byEntity.map((e) => `<tr><td><span class="dot" style="background:${COLORS[e.id]}"></span><b>${e.label}</b></td><td class="num">${n(e.k.published)}</td><td>${bar(e.k.published, maxPub, COLORS[e.id])}</td><td class="num">${n(e.k.followers)}</td><td>${bar(e.k.followers, maxFol, COLORS[e.id])}</td><td class="num">${pct(e.k.engagementRate)}</td></tr>`).join("")}
  </table>
  <p class="small muted">« Comptes communs » : YouTube, X et la fiche Maligah, au nom de Broad Range Consulting Group. Les totaux des entités s'additionnent exactement au total du groupe (vérifié par script).</p>
</section>

<section class="page">
  <h2>3. Les constats et leurs preuves</h2>
  <p>Chaque constat affiché sur le site est ici avec la preuve à montrer si la PDG la demande. Les captures pub-XX sont sur votre ordinateur, dans <i>Docs/publications-facebook-blog</i> : ayez-les aussi sur votre téléphone.</p>
  ${insights
    .map(
      (i) => `<div class="card"><span class="tag ${i.level}">${i.level === "critical" ? "PRIORITÉ" : i.level === "warning" ? "À AMÉLIORER" : "POINT FORT"}</span> <b>${esc(i.title)}</b>
      <p class="small" style="margin:1.5mm 0">${esc(i.detail)}</p>
      <p class="small" style="margin:0"><b>Action :</b> ${esc(i.action)}</p>
      ${EVIDENCE[i.title] ? `<p class="small muted" style="margin:1mm 0 0"><b>Preuve :</b> ${esc(EVIDENCE[i.title])}</p>` : ""}</div>`,
    )
    .join("")}
</section>

<section class="flow">
  <h2>4. Les références : Orange Cameroun et les meilleurs du marché</h2>
  <h3>Le marché (DataReportal, « Digital 2026: Cameroon », données d'octobre 2025)</h3>
  <div class="grid3">
    <div class="tile">Internautes<b>${n(market("Utilisateurs d'internet")?.value ?? null, 1)} M</b><span class="small muted">41,9 % de la population</span></div>
    <div class="tile">Audience Facebook<b>${n(market("Audience publicitaire Facebook")?.value ?? null, 1)} M</b><span class="small muted">1er réseau du pays</span></div>
    <div class="tile">Membres LinkedIn<b>${n(market("Audience publicitaire LinkedIn (membres)")?.value ?? null, 1)} M</b><span class="small muted">les décideurs, cible du CGA</span></div>
  </div>

  <h3>Pourquoi Orange Cameroun est la référence</h3>
  <p>${n(linkedin("Orange") ?? null)} abonnés LinkedIn et 112 k sur Instagram (relevés le 28 sept. 2026) ; plus de 14 millions d'abonnés mobiles revendiqués pour ses 25 ans (mars 2025). Ce qui fait leur force, et ce que nous en retenons :</p>
  <table>
    <tr><th style="width:50%">Ce que fait Orange</th><th>Ce que nous appliquons chez BRC</th></tr>
    ${strategy.orangeLessons.map((l) => `<tr><td class="small">${esc(l.orange)}</td><td class="small"><b>${esc(l.brc)}</b></td></tr>`).join("")}
  </table>

  <h3>Une référence par métier (à citer si la PDG dit « nous ne sommes pas Orange »)</h3>
  <table>
    <tr><th>Référence</th><th style="width:22mm">Pour</th><th style="width:26mm">LinkedIn</th><th>À copier</th></tr>
    ${benchmark.references
      .filter((r) => r !== orange && r.practices.length && !r.name.includes("contre-exemple"))
      .map((r) => {
        const li = r.accounts.find((a) => a.platform === "LinkedIn")?.followers;
        return `<tr><td><b>${esc(r.name)}</b></td><td class="small">${r.relevance === "GATHE" ? "Gathe Finance" : r.relevance === "GROUPE" ? "Groupe" : r.relevance}</td><td class="num small">${typeof li === "number" ? n(li) : "—"}</td><td class="small">${esc(r.practices[0].title)}</td></tr>`;
      })
      .join("")}
  </table>
  <div class="card small"><b>À ne pas affirmer :</b> le chiffre d'environ 31,7 millions d'abonnés Facebook qu'on voit pour « Orange » correspond à la page mondiale, pas au Cameroun. Aucun prix marketing d'Orange Cameroun n'a pu être vérifié. Les abonnés TikTok, YouTube et X d'Orange Cameroun n'ont pas été vérifiés. Revérifiez les compteurs la veille : ils changent chaque jour.</div>
</section>

<section class="page">
  <h2>5. La stratégie sur 9 mois</h2>
  <div class="card key"><b>Ambition.</b> ${esc(strategy.ambition)}</div>
  <div class="grid3">
    ${strategy.phases
      .map(
        (p, i) => `<div class="phase" style="border-color:${["#2a78d6", "#eb6834", "#1baf7a"][i]}"><span class="small muted">Mois ${p.months[0]} à ${p.months[1]}</span><h3 style="margin:.5mm 0 1.5mm">${i + 1}. ${p.name}</h3><p class="small">${esc(p.goal)}</p><ul class="small">${p.deliverables.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>`,
      )
      .join("")}
  </div>

  <h3>Ce que nous publierons, entité par entité</h3>
  <div class="grid2">
    ${strategy.pillars
      .map(
        (p) => `<div class="card" style="margin:0;border-left:1.2mm solid ${COLORS[p.entity]}"><b>${ENTITIES.find((e) => e.id === p.entity)?.label}</b><ul class="small" style="margin-top:1mm">${p.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`,
      )
      .join("")}
  </div>

  <div style="break-inside: avoid">
  <h3>Mois par mois</h3>
  <table>
    <tr><th style="width:12mm">Mois</th><th>Réalisations</th></tr>
    ${MONTHS.map(([m, d]) => `<tr><td><b>${m}</b></td><td class="small">${d}</td></tr>`).join("")}
  </table>
  </div>
</section>

<section class="flow">
  <h2>6. Objectifs chiffrés et pilotage</h2>
  <table>
    <tr><th>Indicateur</th><th style="width:22mm">Aujourd'hui</th><th style="width:22mm">Objectif M9</th><th style="width:48mm"></th></tr>
    ${strategy.targets
      .map((t) => {
        const max = Math.max(t.current, t.target);
        return `<tr><td><b>${esc(t.kpi)}</b><br><span class="small muted">${esc(t.note)}</span></td><td class="num">${t.currentLabel}</td><td class="num"><b>${t.targetLabel}</b></td><td>${bar(t.current, max, "#c3c2b7")}<div style="height:1.2mm"></div>${bar(t.target, max, "#5b2a86")}</td></tr>`;
      })
      .join("")}
  </table>
  <p class="small">${strategy.unmeasured.map(esc).join(". ")}.</p>

  <h3>Ce que la PDG verra, étape par étape</h3>
  <table>
    ${strategy.milestones.map((m) => `<tr><td style="width:26mm"><b>Fin du mois ${m.month}</b></td><td class="small">${m.items.map(esc).join(" · ")}</td></tr>`).join("")}
  </table>

  <h3>Semaine type (rythme éditorial proposé)</h3>
  <table>
    ${WEEK.map(([d, c]) => `<tr><td style="width:24mm"><b>${d}</b></td><td class="small">${c}</td></tr>`).join("")}
  </table>

  <div class="grid2">
    <div><h3>Ce que le groupe met à disposition</h3>
      <ul class="small">${strategy.requirements.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>
    <div><h3>Risques anticipés</h3>
      <ul class="small">${strategy.risks.map((r) => `<li><b>${esc(r.risk)}</b> : ${esc(r.answer)}</li>`).join("")}</ul></div>
  </div>

  <h3>Pilotage</h3>
  <ul class="small">${strategy.governance.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
</section>

<section class="flow">
  <h2>7. Questions probables et réponses</h2>
  ${FAQ.map(([q, a]) => `<div class="card"><p style="margin:0 0 1mm"><b>${esc(q)}</b></p><p class="small" style="margin:0">${esc(a)}</p></div>`).join("")}
</section>

<section>
  <h2>8. Préparation : la veille et le jour J</h2>
  <div class="grid2">
    <div>
      <h3>La veille</h3>
      <ul class="check small">
        <li>Ouvrir ${SITE} et vérifier que la dernière version est en ligne.</li>
        <li>Revérifier les compteurs d'abonnés d'Orange et des références (ils changent chaque jour).</li>
        <li>Vérifier la date de la dernière publication Facebook du CGA (${formatDate(byEntity[0].k.last)} dans l'audit).</li>
        <li>Mettre sur le téléphone les captures citées en preuve (pub-8, 30, 35, 47, 50, 62, 71, 76, 83, 90, 95, 99 à 102, 107).</li>
        <li>Répéter une fois à voix haute avec un chronomètre : 20 minutes.</li>
        <li>Imprimer la proposition commerciale en 2 exemplaires (dossier <i>Docs/prive</i>).</li>
        <li>Imprimer ce guide (ou l'avoir sur une tablette).</li>
      </ul>
    </div>
    <div>
      <h3>Le jour J</h3>
      <ul class="check small">
        <li>Ordinateur chargé, connexion Internet testée (prévoir le partage de connexion du téléphone).</li>
        <li>Ouvrir le site dans un navigateur plein écran (F11), onglet « Groupe » sélectionné.</li>
        <li>Avoir l'export PDF du site en secours (bouton « Imprimer / exporter en PDF »).</li>
        <li>Commencer par le message clé, finir par la demande.</li>
        <li>Noter ses questions et y répondre par écrit dans les 24 h.</li>
      </ul>
    </div>
  </div>
  <h3>Ce que l'audit ne prétend pas</h3>
  <p class="small">Tous les chiffres viennent de données publiques relevées le ${formatDate(data.generatedAt)}. L'historique complet de Facebook, Instagram et LinkedIn n'était pas visible sans connexion : les volumes sont donc des minimums, et c'est dit sur le site. Le dire avant qu'on vous le demande renforce la crédibilité.</p>
  <p class="small muted" style="margin-top:8mm">Guide généré automatiquement à partir des données du tableau de bord (pnpm guide) : chaque chiffre est identique à celui affiché sur le site.</p>
</section>
</body></html>`;

const outDir = join(process.cwd(), "Docs", "guide");
mkdirSync(outDir, { recursive: true });
const htmlPath = join(outDir, "guide-presentation.html");
const pdfPath = join(outDir, "Guide-presentation-audit-digital-BRC.pdf");
writeFileSync(htmlPath, html);

const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => existsSync(p));
if (!chrome) {
  console.log(`HTML écrit : ${htmlPath} (Chrome introuvable, PDF non généré)`);
} else {
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    `file:///${htmlPath.replace(/\\/g, "/")}`,
  ]);
  console.log(`PDF écrit : ${pdfPath}`);
}
