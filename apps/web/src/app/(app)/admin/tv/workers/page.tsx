export default function AdminTvWorkersPage() {
  return (
    <div className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
      <h1 className="text-3xl font-semibold text-foreground">TV Workers</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Recorder, validator, ad-break detector, creative matcher, AI classifier, clip generator, and
        retention workers are designed for ECS deployment with queue-backed orchestration.
      </p>
    </div>
  );
}
