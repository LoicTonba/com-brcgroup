// Recomputes every KPI with the dashboard's own code and checks that entity
// and platform breakdowns add up to the group totals.
//   pnpm verify
import audit from "../data/audit.json";
import { buildInsights } from "../lib/insights";
import {
  ENTITIES,
  computeKpis,
  filterData,
  perPlatform,
  type Kpis,
} from "../lib/metrics";
import type { AuditData } from "../lib/types";

const data = audit as AuditData;
const group = computeKpis(data);

const ADDITIVE = [
  "published",
  "posts",
  "followers",
  "reactions",
  "comments",
  "shares",
  "views",
  "interactions",
  "last12",
] as const satisfies readonly (keyof Kpis)[];

const pick = (k: Kpis, keys: readonly (keyof Kpis)[]) =>
  Object.fromEntries(keys.map((key) => [key, k[key]]));

console.log("Groupe", {
  ...pick(group, ADDITIVE),
  ...pick(group, ["engagementRate", "engagementMean", "recommendation", "ratedCount", "since", "first", "last"]),
});

let failures = 0;
const check = (label: string, whole: number, parts: number) => {
  const ok = whole === parts;
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${whole}${ok ? "" : ` ≠ ${parts}`}`);
};

const entities = ENTITIES.map((e) => computeKpis(filterData(data, e.id)));
ENTITIES.forEach((e, i) => console.log(e.id, pick(entities[i], ADDITIVE)));
for (const key of ADDITIVE)
  check(`entités → ${key}`, group[key] ?? 0, entities.reduce((a, k) => a + (k[key] ?? 0), 0));

const platforms = perPlatform(data);
for (const key of ["posts", "followers", "interactions", "views"] as const)
  check(`plateformes → ${key}`, group[key], platforms.reduce((a, p) => a + p[key], 0));

console.log("\nConstats");
for (const i of buildInsights(data)) console.log(`- [${i.level}] ${i.title} — ${i.detail}`);

if (failures) {
  console.error(`\n${failures} incohérence(s)`);
  process.exit(1);
}
