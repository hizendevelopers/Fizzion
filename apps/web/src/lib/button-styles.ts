export const buttonStyles = {
  primary:
    "group inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff4e45_0%,#f40009_46%,#b30009_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(244,0,9,0.26)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(244,0,9,0.32)] disabled:translate-y-0 disabled:opacity-60",
  secondary:
    "group inline-flex items-center justify-center gap-2 rounded-full border border-border bg-[linear-gradient(180deg,#ffffff_0%,#fff6f4_100%)] px-4 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-red/30 hover:bg-panel-soft hover:shadow-[var(--shadow-card)]",
  dark:
    "group inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#251315_0%,#2f1418_56%,#1b0d12_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-dark)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(19,10,11,0.42)]",
  select:
    "h-10 rounded-full border border-border bg-[linear-gradient(180deg,#ffffff_0%,#fff7f5_100%)] px-4 text-sm text-foreground shadow-[var(--shadow-soft)] outline-none transition duration-300 focus:border-brand-red focus:shadow-[0_0_0_4px_rgba(244,0,9,0.08)]",
} as const;
