import { FizZionLogo } from "@/components/brand/fizzion-logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(176,0,32,0.10),transparent_24%),linear-gradient(180deg,#fbfbfa_0%,#f7f7f5_100%)] px-4 py-10">
      <div className="absolute start-8 top-8 flex items-center gap-3">
        <FizZionLogo className="h-10" />
        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          Built by Hizen for Coca-Cola Iraq
        </span>
      </div>
      {children}
    </main>
  );
}

