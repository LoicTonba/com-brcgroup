"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Entity } from "@/lib/types";
import { ENTITIES, THEME_LABEL, formatDate, formatNumber } from "@/lib/metrics";
import { ENTITY_COLOR } from "./charts";

export interface MediaItem {
  entity: Entity;
  src: string;
  alt: string;
  caption: string;
  theme: string;
  date: string | null;
  platform: string;
  pageUrl: string;
  width: number;
  height: number;
}

export interface VideoItem {
  id: string;
  entity: Entity;
  type: "video" | "short";
  title: string;
  date: string | null;
  duration: number | null;
  views: number;
  likes: number | null;
}

function EntityTag({ entity }: { entity: Entity }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
      <span
        className="inline-block size-2 shrink-0 rounded-full"
        style={{ background: ENTITY_COLOR[entity] }}
      />
      {ENTITIES.find((e) => e.id === entity)?.label}
    </span>
  );
}

/** Flyers actually published by each entity (optimised WebP, lazy-loaded). */
export function Gallery({ items }: { items: MediaItem[] }) {
  const [open, setOpen] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!items.length)
    return <p className="text-sm text-muted">Aucun visuel pour ce périmètre.</p>;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((m) => (
          <li key={m.src}>
            <button
              onClick={() => setOpen(m)}
              className="group block w-full text-left"
              aria-label={`Agrandir : ${m.caption}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-grid">
                <Image
                  src={m.src}
                  alt={m.alt}
                  fill
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-snug">{m.caption}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <EntityTag entity={m.entity} />
                <span>
                  {THEME_LABEL[m.theme] ?? m.theme}
                  {m.date && ` · ${formatDate(m.date)}`}
                </span>
              </p>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          className="no-print fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.caption}
        >
          <figure
            className="flex max-h-full max-w-3xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={open.src}
              alt={open.alt}
              width={open.width}
              height={open.height}
              className="max-h-[80vh] w-auto rounded-lg object-contain"
            />
            <figcaption className="mt-3 text-center text-sm text-white">
              {open.caption}
              <span className="block text-xs text-white/70">
                {ENTITIES.find((e) => e.id === open.entity)?.label} ·{" "}
                {open.platform === "instagram" ? "Instagram" : "Facebook"}
                {open.date && ` · ${formatDate(open.date)}`}
              </span>
            </figcaption>
            <button
              onClick={() => setOpen(null)}
              className="mt-3 rounded-lg bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
            >
              Fermer
            </button>
          </figure>
        </div>
      )}
    </>
  );
}

// Titles written in capitals read as shouting in a table of cards.
function tidyTitle(t: string) {
  const s = t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.!?)»]+$/gu, "").trim();
  const letters = s.replace(/[^\p{L}]/gu, "");
  const upper = letters.replace(/[^\p{Lu}]/gu, "");
  if (letters.length && upper.length / letters.length > 0.7) {
    const lower = s.toLocaleLowerCase("fr");
    return lower.charAt(0).toLocaleUpperCase("fr") + lower.slice(1);
  }
  return s;
}

function duration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

/** YouTube videos: thumbnail only until clicked, so the page stays light. */
export function Videos({ items }: { items: VideoItem[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (!items.length)
    return <p className="text-sm text-muted">Aucune vidéo pour ce périmètre.</p>;
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((v) => (
        <li key={v.id} className="min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            {playing === v.id ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
                title={v.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            ) : (
              <button
                onClick={() => setPlaying(v.id)}
                className="group absolute inset-0"
                aria-label={`Lire : ${tidyTitle(v.title)}`}
              >
                <Image
                  src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-14 place-items-center rounded-full bg-black/70 text-white ring-2 ring-white/70 transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
                {v.duration ? (
                  <span className="num absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">
                    {duration(v.duration)}
                  </span>
                ) : null}
              </button>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-snug font-medium">
            {tidyTitle(v.title)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <EntityTag entity={v.entity} />
            <span className="num">
              {formatNumber(v.views)} vues
              {v.likes !== null && ` · ${formatNumber(v.likes)} j'aime`}
              {v.date && ` · ${formatDate(v.date)}`}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}
