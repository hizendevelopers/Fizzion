export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-red via-[#ea1d24] to-brand-red-deep px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(244,0,9,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(244,0,9,0.30)] disabled:translate-y-0 disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:bg-panel-soft",
  dark:
    "inline-flex items-center justify-center rounded-full bg-sidebar px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-dark)] transition duration-200 hover:-translate-y-0.5 hover:bg-brand-red-deep",
  select:
    "h-10 rounded-full border border-border bg-white px-4 text-sm text-foreground shadow-[var(--shadow-soft)] outline-none transition duration-200 focus:border-brand-red",
} as const;

