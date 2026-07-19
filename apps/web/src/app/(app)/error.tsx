"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-[32px] border border-error/20 bg-error-soft p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-error">Application error</p>
      <h1 className="mt-3 text-2xl font-semibold text-foreground">Something interrupted this workspace.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{error.message}</p>
      <button
        className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-white"
        onClick={() => reset()}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}

