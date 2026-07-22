"use client";

import { useState } from "react";

type Props = {
  alt: string;
  className?: string;
  src: string | null;
  title: string;
};

export function ImageLightbox({ alt, className, src, title }: Props) {
  const [open, setOpen] = useState(false);

  if (!src) {
    return (
      <div className="px-4 py-8 text-center text-xs text-muted-foreground">
        {title} is not available
      </div>
    );
  }

  return (
    <>
      <button
        className="group block w-full text-left"
        onClick={() => setOpen(true)}
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={alt}
          className={className ?? "h-full min-h-56 w-full object-cover transition duration-300 group-hover:scale-[1.01]"}
          src={src}
        />
      </button>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand-red/30 hover:text-brand-red"
          onClick={() => setOpen(true)}
          type="button"
        >
          Full view
        </button>
        <a
          className="rounded-full border border-border bg-panel-soft px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand-red/30 hover:text-brand-red"
          href={src}
          rel="noreferrer"
          target="_blank"
        >
          Open in new tab
        </a>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-7xl overflow-hidden rounded-[1.8rem] border border-white/15 bg-neutral-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-white/65">Click outside or close to return</p>
              </div>
              <button
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto bg-black p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={alt} className="mx-auto h-auto max-w-full rounded-[1rem]" src={src} />
            </div>
          </div>
          <button
            aria-label="Close full-view screenshot"
            className="absolute inset-0 -z-10"
            onClick={() => setOpen(false)}
            type="button"
          />
        </div>
      ) : null}
    </>
  );
}
