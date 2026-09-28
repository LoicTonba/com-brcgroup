import type { Entity } from "@/lib/types";
import { ENTITIES, formatNumber } from "@/lib/metrics";

export const ENTITY_COLOR: Record<Entity, string> = {
  CGA: "var(--e-cga)",
  CFP: "var(--e-cfp)",
  GATHE: "var(--e-gathe)",
  GROUPE: "var(--e-groupe)",
};

export function Legend({ entities }: { entities: Entity[] }) {
  if (entities.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {entities.map((e) => (
        <li key={e} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: ENTITY_COLOR[e] }}
          />
          {ENTITIES.find((x) => x.id === e)?.label}
        </li>
      ))}
    </ul>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * p;
}

/** Stacked columns: one column per label, stacked by entity. */
export function StackedColumns({
  rows,
  entities,
  height = 200,
}: {
  rows: [string, Record<Entity, number>][];
  entities: Entity[];
  height?: number;
}) {
  const totals = rows.map(([, r]) => entities.reduce((a, e) => a + r[e], 0));
  const max = niceMax(Math.max(0, ...totals));
  const ticks = [0, max / 2, max];
  if (!rows.length) return <Empty />;
  return (
    <div className="flex gap-2">
      <div
        className="num flex flex-col-reverse justify-between text-right text-[11px] text-muted"
        style={{ height }}
      >
        {ticks.map((t) => (
          <span key={t} className="-my-1.5 leading-3">
            {formatNumber(t)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div
          className="relative flex items-end gap-0.5 border-b"
          style={{ height, borderColor: "var(--axis)", minWidth: rows.length * 34 }}
        >
          {ticks.slice(1).map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t"
              style={{ bottom: `${(t / max) * 100}%`, borderColor: "var(--grid)" }}
            />
          ))}
          {rows.map(([label, r], i) => (
            <div
              key={label}
              tabIndex={0}
              className="tip-host relative flex h-full flex-1 flex-col items-center justify-end outline-none"
            >
              <span className="num mb-1 text-[11px] text-ink-2">
                {totals[i] ? totals[i] : ""}
              </span>
              <div
                className="flex w-full max-w-6 flex-col-reverse gap-0.5 overflow-hidden rounded-t"
                style={{ height: `${(totals[i] / max) * 100}%` }}
              >
                {entities
                  .filter((e) => r[e] > 0)
                  .map((e) => (
                    <div
                      key={e}
                      style={{ flexGrow: r[e], background: ENTITY_COLOR[e] }}
                    />
                  ))}
              </div>
              <div className="tip">
                <strong>{label}</strong> · {totals[i]} publication
                {totals[i] > 1 ? "s" : ""}
                {entities.length > 1 &&
                  entities
                    .filter((e) => r[e] > 0)
                    .map((e) => (
                      <div key={e}>
                        {ENTITIES.find((x) => x.id === e)?.label} : {r[e]}
                      </div>
                    ))}
              </div>
            </div>
          ))}
        </div>
        <div
          className="num mt-1.5 flex gap-0.5 text-[11px] text-muted"
          style={{ minWidth: rows.length * 34 }}
        >
          {rows.map(([label]) => (
            <span key={label} className="flex-1 text-center">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Horizontal bar list — one series, one colour. */
export function BarList({
  items,
  color = "var(--seq)",
  format = (v: number) => formatNumber(v),
  unit = "",
}: {
  items: { label: string; value: number; hint?: string; color?: string }[];
  color?: string;
  format?: (v: number) => string;
  unit?: string;
}) {
  if (!items.length) return <Empty />;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it) => (
        <li
          key={it.label}
          tabIndex={0}
          className="tip-host grid grid-cols-[minmax(84px,34%)_1fr_auto] items-center gap-3 text-sm outline-none"
        >
          <span className="truncate text-ink-2">{it.label}</span>
          <span className="h-3.5">
            <span
              className="block h-full rounded-r"
              style={{
                width: `${Math.max((it.value / max) * 100, 1.5)}%`,
                background: it.color ?? color,
              }}
            />
          </span>
          <span className="num text-right text-ink">{format(it.value)}</span>
          <span className="tip">
            {it.label} : {format(it.value)}
            {unit}
            {it.hint ? ` · ${it.hint}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Part-to-whole bar (sentiment, coverage). Status colours carry meaning here. */
export function SplitBar({
  parts,
}: {
  parts: { label: string; value: number; color: string }[];
}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return <Empty text="Aucun commentaire analysé" />;
  return (
    <div>
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded">
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div
              key={p.label}
              tabIndex={0}
              className="tip-host"
              style={{ flexGrow: p.value, background: p.color }}
            >
              <span className="tip">
                {p.label} : {p.value} ({Math.round((p.value / total) * 100)} %)
              </span>
            </div>
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: p.color }}
            />
            {p.label}{" "}
            <span className="num text-ink">
              {Math.round((p.value / total) * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Empty({ text = "Pas de données pour ce périmètre" }) {
  return (
    <p className="rounded-lg border border-dashed border-grid px-4 py-8 text-center text-sm text-muted">
      {text}
    </p>
  );
}
