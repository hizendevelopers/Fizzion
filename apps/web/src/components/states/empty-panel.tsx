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
    <div className="rounded-[1.6rem] border border-[#E4E7EC] bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">{eyebrow}</p> : null}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[radial-gradient(circle_at_30%_30%,#fff_0%,#ffe1e4_42%,#f40009_100%)] shadow-[0_14px_28px_rgba(244,0,9,0.14)]">
          <span className="h-3.5 w-3.5 rounded-full bg-white/90" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {actionHref && actionLabel ? (
        <Link className={`${buttonStyles.primary} mt-6 h-11`} href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
