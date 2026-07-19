import Link from "next/link";

type AuthCardProps = {
  title: string;
  description: string;
  footerHref?: string;
  footerLabel?: string;
  children: React.ReactNode;
  actionSlot?: React.ReactNode;
};

export function AuthCard({
  title,
  description,
  footerHref,
  footerLabel,
  children,
  actionSlot,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/95 p-8 shadow-[0_28px_80px_rgba(17,17,17,0.08)] backdrop-blur">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-8 space-y-4">{children}</div>
      {actionSlot}
      {footerHref && footerLabel ? (
        <Link className="mt-4 inline-flex text-sm font-medium text-brand-red" href={footerHref}>
          {footerLabel}
        </Link>
      ) : null}
    </div>
  );
}
