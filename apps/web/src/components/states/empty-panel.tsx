import Link from "next/link";

import { buttonStyles } from "@/lib/button-styles";

type EmptyPanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyPanel({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyPanelProps) {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,248,254,0.96))] p-6 shadow-[var(--shadow-card)]">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">{eyebrow}</p> : null}
      <div className="mt-5 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[radial-gradient(circle_at_30%_30%,#fff_0%,#ffd9de_40%,#f40009_100%)] shadow-[0_18px_36px_rgba(244,0,9,0.18)]">
          <span className="h-4 w-4 rounded-full bg-white/90" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {actionHref && actionLabel ? (
        <Link
          className={`${buttonStyles.primary} mt-6 h-11`}
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
