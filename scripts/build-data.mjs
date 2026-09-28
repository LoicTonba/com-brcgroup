// Merges the raw audit collections in Docs/audit/*.json into data/audit.json,
// the single normalized file the dashboard imports.
//   node scripts/build-data.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const auditDir = join(root, "Docs", "audit");
const COLLECTED_AT = "2026-09-28";
const ENTITIES = new Set(["CGA", "CFP", "GATHE", "GROUPE"]);

const read = (file) => {
  const p = join(auditDir, file);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
};
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const entityOf = (e, fallback) => (ENTITIES.has(e) ? e : fallback);

const THEMES = [
  ["humour", /humour|humoristique|m[èe]me|minion/i],
  ["temoignage", /t[ée]moign|avis client|merci [àa]|d[ée]couverte d'un (autre )?client|client(e)? (faisant|qui)|sci cliente|qui est cette/i],
  ["recrutement", /recrut|offre d'emploi|stage|poste|candidat/i],
  ["formation", /formation|rentr[ée]e|inscri|fili[èe]re|campus|dipl[ôo]m|[ée]tudiant|bts|cours/i],
  ["financement", /tontine|coop[ée]rative|cr[ée]dit|pr[êe]t|[ée]pargne|financ|gathe|argent|[ée]conomis|investi|caisse|membres solidaires|projets personnels/i],
  ["fiscalite", /imp[ôo]t|fisc|dsf|tva|patente|dgi|taxe|contribuable/i],
  ["comptabilite", /comptab|bilan|[ée]tats financiers|ohada/i],
  ["juridique", /juridi|statut|sarl|cr[ée]ation d'entreprise|rccm|notaire|formalis|immatricul|soci[ée]t[ée]|\bsci\b/i],
  ["voeux", /bonne ann[ée]e|joyeux|f[êe]te|no[ëe]l|voeux|vœux|tabaski|ramadan/i],
  ["evenement", /s[ée]minaire|atelier|conf[ée]rence|c[ée]r[ée]monie|salon|webinaire|remise/i],
  ["promotion", /promo|offre|r[ée]duction|gratuit|adh[ée]rez|pourquoi se former|nous joindre|tableau de bord de suivi/i],
  ["vie", /inside|coulisses|bureaux?|accueil|open space|collaborateur|[ée]quipe|soutenance|semaine de la jeunesse|apprenant|we are opened|dirigeante|mission du|transparence|ann[ée]e acad[ée]mique|formateurs/i],
  ["motivation", /motivation|lundi|dimanche|r[ée]ussi|r[êe]v|d[ée]cideras|ann[ée]e de progr[èe]s|loin ne signifie|ta r[ée]ponse/i],
];
// Fancy Unicode (𝗯𝗼𝗹𝗱, 𝙞𝙩𝙖𝙡𝙞𝙘) is common in posts; fold it to plain text.
const plain = (text) => (text ?? "").normalize("NFKC").replace(/‌/g, "");
// Collection placeholders were written in English; the dashboard is French.
const frenchTitle = (t) =>
  t
    .replace(/^\(reel, text not visible logged-out\)$/i, "(Reel sans texte visible)")
    .replace(/^\[paraphrase\]\s*/i, "(résumé) ");
const themeOf = (text = "") =>
  THEMES.find(([, re]) => re.test(plain(text)))?.[0] ?? "autre";

// "il y a 3 ans" / "il y a 2 mois" -> approximate YYYY or YYYY-MM
function fromRelative(rel) {
  const m = /(\d+)\s*(an|mois|semaine|jour)/i.exec(rel ?? "");
  if (!m) return null;
  const d = new Date(COLLECTED_AT);
  const n = Number(m[1]);
  if (/an/i.test(m[2])) return String(d.getFullYear() - n);
  if (/mois/i.test(m[2])) d.setMonth(d.getMonth() - n);
  else d.setDate(d.getDate() - n * (/semaine/i.test(m[2]) ? 7 : 1));
  return d.toISOString().slice(0, 7);
}

const FORMATS = { "flyer/image": "flyer", image: "flyer", "reel": "reel", short: "short" };
const formatOf = (f) => FORMATS[f] ?? f ?? "autre";

// Notes shown to the reader, in French (raw collection notes stay in Docs/audit)
const NOTE = {
  facebook:
    "Collecte sans connexion : historique complet non accessible, analyse des vidéos, reels et dernières publications.",
  instagram:
    "Collecte sans connexion : 12 publications les plus récentes analysées sur le total affiché par le profil.",
  linkedin: "Page publique : 10 dernières publications, commentaires non visibles.",
  x: "Compte peu actif : 5 publications visibles, dernière en mars 2022.",
  maligah:
    "Fiche annuaire non revendiquée : adresse (rue Jamot) différente de Facebook (rue Mermoz), entités non mentionnées.",
};

const sources = [];
const posts = [];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---- Social platforms (Facebook, Instagram, LinkedIn, X, Maligah)
// Logged-in re-collections (e.g. facebook-full.json) supersede the logged-out
// pass in social.json for the same platform + entity.
const fuller = ["facebook-full.json", "instagram-full.json", "linkedin-full.json", "x-full.json"]
  .flatMap((f) => read(f)?.sources ?? []);
const key = (s) => `${s.platform}:${s.entity}`;
const superseded = new Set(fuller.map(key));
const socialSources = [
  ...(read("social.json")?.sources ?? []).filter((s) => !superseded.has(key(s))),
  ...fuller,
];
for (const s of socialSources) {
  const entity = entityOf(s.entity, "GROUPE");
  const id = `${s.platform}-${slug(s.name || s.url)}`;
  const followers = num(s.followers) ?? num(s.pageLikes);
  sources.push({
    id,
    platform: s.platform,
    entity,
    name: s.name || s.url,
    url: s.url,
    followers,
    totalPosts: num(s.totalPosts),
    createdAt: s.createdAt ?? null,
    recommendation: num(s.rating?.count)
      ? { rate: num(s.rating.score), count: s.rating.count }
      : null,
    status: s.status ?? "partial",
    notes: fuller.includes(s) ? (s.notes ?? "") : (NOTE[s.platform] ?? ""),
  });
  (s.posts ?? []).forEach((p, i) => {
    posts.push({
      id: `${id}-${i}`,
      sourceId: id,
      platform: s.platform,
      entity,
      date: p.date ?? null,
      format: formatOf(p.format),
      theme: themeOf(p.text),
      title: frenchTitle(plain(p.text)).slice(0, 140) || "(sans texte)",
      reactions: num(p.reactions),
      comments: num(p.comments),
      shares: num(p.shares),
      views: num(p.views),
      sentiment: p.sentiment ?? null,
      hasCallToAction: null,
      quality: null,
      url: p.url ?? null,
      audience: followers,
    });
  });
}

// ---- Manual Facebook screenshots of the CGA page (Docs/publications-facebook-blog)
// Screenshots that repeat another one (pub-23 = pub-18, pub-24 = pub-20, pub-25 = pub-21)
const DUPLICATE_SCREENS = new Set(["pub-23.png", "pub-24.png", "pub-25.png"]);
const screens = [
  ...(read("facebook-screens-1.json") ?? []),
  ...(read("facebook-screens-2.json") ?? []),
].filter((s) => !DUPLICATE_SCREENS.has(s.file));
if (screens.length) {
  let page = sources.find(
    (s) => s.platform === "facebook" && /CGABroadRangeConsulting/i.test(s.url),
  );
  if (!page) {
    page = {
      id: "facebook-cga-broad-range-consulting",
      platform: "facebook",
      entity: "CGA",
      name: "CGA Broad Range Consulting",
      url: "https://web.facebook.com/CGABroadRangeConsulting",
      followers: null,
      totalPosts: null,
      createdAt: null,
      recommendation: null,
      status: "partial",
      notes: "",
    };
    sources.push(page);
  }
  page.notes = [page.notes, `${screens.length} visuels recensés par captures d'écran.`]
    .filter(Boolean)
    .join(" ");
  const scraped = posts.filter((p) => p.sourceId === page.id);
  for (const s of screens) {
    const entity = entityOf(s.entity, page.entity);
    // A screenshot and a scraped post with the same full date are the same publication.
    const twin =
      s.date?.length === 10 && scraped.find((p) => p.date === s.date && !p.merged);
    const base = {
      entity,
      format: s.format ?? "flyer",
      theme: s.theme && s.theme !== "autre" ? s.theme : themeOf(s.title),
      title: s.title ?? s.file,
      hasCallToAction: s.hasCallToAction ?? null,
      quality: num(Number(s.quality)),
    };
    if (twin) {
      Object.assign(twin, base, {
        merged: true,
        reactions: twin.reactions ?? num(s.reactions),
        comments: twin.comments ?? num(s.comments),
        shares: twin.shares ?? num(s.shares),
      });
      continue;
    }
    posts.push({
      id: `screen-${s.file}`,
      sourceId: page.id,
      platform: "facebook",
      date: s.date ?? null,
      reactions: num(s.reactions),
      comments: num(s.comments),
      shares: num(s.shares),
      views: null,
      sentiment: null,
      url: null,
      audience: page.followers,
      ...base,
    });
  }
}

// ---- YouTube
const yt = read("youtube.json");
if (yt) {
  const id = "youtube-broad-range-consulting-group";
  const subs = num(yt.channel?.subscribers);
  sources.push({
    id,
    platform: "youtube",
    entity: "GROUPE",
    name: yt.channel?.name ?? "Broad Range Consulting Group",
    url: "https://www.youtube.com/@broadrangeconsultinggroup8157",
    followers: subs,
    totalPosts: (yt.items?.length ?? 0) + (yt.posts?.length ?? 0),
    createdAt: yt.channel?.joined ?? null,
    recommendation: null,
    status: "ok",
    notes: "Chaîne complète : toutes les vidéos, shorts et posts communauté.",
  });
  for (const v of yt.items ?? []) {
    posts.push({
      id: `yt-${v.id}`,
      sourceId: id,
      platform: "youtube",
      entity: entityOf(v.entity, "GROUPE"),
      date: v.date ?? null,
      format: v.type === "short" ? "short" : "video",
      theme: themeOf(`${v.titlePlain ?? v.title} ${v.description ?? ""}`),
      title: plain(v.titlePlain ?? v.title),
      reactions: num(v.likes),
      comments: num(v.comments),
      shares: null,
      views: num(v.views),
      sentiment: null,
      hasCallToAction: null,
      quality: null,
      url: v.url ?? `https://www.youtube.com/watch?v=${v.id}`,
      audience: subs,
    });
  }
  (yt.posts ?? []).forEach((p, i) => {
    posts.push({
      id: `yt-post-${i}`,
      sourceId: id,
      platform: "youtube",
      entity: entityOf(p.entity, "GROUPE"),
      date: p.date ?? fromRelative(p.dateRelative),
      format: p.format ?? "texte",
      theme: themeOf(p.text),
      title: plain(p.text).slice(0, 140) || "(publication communauté)",
      reactions: num(p.likes),
      comments: num(p.comments),
      shares: null,
      views: null,
      sentiment: null,
      hasCallToAction: null,
      quality: null,
      url: p.url ?? null,
      audience: subs,
    });
  });
}

// Keep only the reliable part of approximate dates ("2026-02 (approx, 7 months ago)").
const cleanDate = (d) => /^\d{4}(-\d{2}(-\d{2})?)?/.exec(d ?? "")?.[0] ?? null;
for (const p of posts) {
  delete p.merged;
  p.date = cleanDate(p.date);
}
for (const s of sources) s.collected = posts.filter((p) => p.sourceId === s.id).length;

// ---- Qualitative findings written by hand during the audit
const findings = read("constats.json") ?? [];

const out = { generatedAt: COLLECTED_AT, sources, posts, findings };

// ---- Video showcase: the most viewed YouTube videos of each entity. Only the
// thumbnail ships with the page; the player loads when someone clicks.
const videos = [];
for (const entity of ENTITIES) {
  (yt?.items ?? [])
    .filter((v) => entityOf(v.entity, "GROUPE") === entity && v.views !== null)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .forEach((v) =>
      videos.push({
        id: v.id,
        entity,
        type: v.type,
        title: plain(v.titlePlain ?? v.title),
        date: v.date,
        duration: v.duration,
        views: v.views,
        likes: num(v.likes),
      }),
    );
}

// ---- Benchmark of Cameroonian references (sourced research, Docs/audit)
const benchmark = read("benchmark.json");
mkdirSync(join(root, "data"), { recursive: true });
writeFileSync(join(root, "data", "audit.json"), JSON.stringify(out, null, 1));
writeFileSync(join(root, "data", "videos.json"), JSON.stringify(videos, null, 1));
if (benchmark)
  writeFileSync(join(root, "data", "benchmark.json"), JSON.stringify(benchmark, null, 1));
if (!existsSync(join(root, "data", "media.json")))
  writeFileSync(join(root, "data", "media.json"), "[]\n");
console.log(`data/audit.json: ${sources.length} sources, ${posts.length} publications`);
for (const s of sources)
  console.log(
    `  ${s.status.padEnd(15)} ${s.platform.padEnd(9)} ${s.entity.padEnd(6)} ${String(s.followers ?? "-").padStart(6)} abonnés  ${posts.filter((p) => p.sourceId === s.id).length} pubs  ${s.name}`,
  );
