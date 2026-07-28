import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
};

function BaseIcon({
  children,
  className,
  viewBox = "0 0 24 24",
}: IconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </BaseIcon>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </BaseIcon>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3.5 2" />
    </BaseIcon>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M6.5 16.5h11" />
      <path d="M8 16.5v-5.3A4 4 0 0 1 12 7a4 4 0 0 1 4 4.2v5.3" />
      <path d="M10.3 18.5a2 2 0 0 0 3.4 0" />
    </BaseIcon>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
    </BaseIcon>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="4" y="6" width="16" height="14" rx="3" />
      <path d="M8 3.5v5" />
      <path d="M16 3.5v5" />
      <path d="M4 10h16" />
    </BaseIcon>
  );
}

export function FilterIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </BaseIcon>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
      <path d="m18.2 4 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </BaseIcon>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="m9 7 8 5-8 5V7Z" />
    </BaseIcon>
  );
}

export function StopIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="7.5" y="7.5" width="9" height="9" rx="1.8" />
    </BaseIcon>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M12 15V5" />
      <path d="m8.5 8.5 3.5-3.5 3.5 3.5" />
      <path d="M5 18.5h14" />
    </BaseIcon>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M6.5 9.5A7 7 0 0 1 18 11" />
      <path d="M17.5 14.5A7 7 0 0 1 6 13" />
    </BaseIcon>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M5.5 7.5h13" />
      <path d="M9.5 7.5V5.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7" />
      <path d="m7.5 7.5.8 11a1.5 1.5 0 0 0 1.5 1.4h4.4a1.5 1.5 0 0 0 1.5-1.4l.8-11" />
    </BaseIcon>
  );
}

export function ScanIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M4.5 8V5.5h2.5" />
      <path d="M19.5 8V5.5H17" />
      <path d="M4.5 16v2.5h2.5" />
      <path d="M19.5 16v2.5H17" />
      <path d="M7 12h10" />
    </BaseIcon>
  );
}

export function TvIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="4" y="6" width="16" height="11" rx="3" />
      <path d="m10 20 2-3 2 3" />
    </BaseIcon>
  );
}

export function SocialIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <circle cx="7" cy="12" r="2.5" />
      <circle cx="17" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
      <path d="m9.2 10.8 5.6-2.6" />
      <path d="m9.2 13.2 5.6 2.6" />
    </BaseIcon>
  );
}

export function OohIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="4" y="6" width="16" height="10" rx="2.5" />
      <path d="M7.5 16v3" />
      <path d="M16.5 16v3" />
      <path d="M9.5 20h5" />
    </BaseIcon>
  );
}

export function WebIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="M3.5 9h17" />
      <path d="M9.5 5v14" />
    </BaseIcon>
  );
}

export function CreativeIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M5 17 12 5l7 12" />
      <path d="M8 14h8" />
    </BaseIcon>
  );
}

export function CampaignIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M5 8.5h14" />
      <path d="M8 5.5v6" />
      <path d="M16 5.5v6" />
      <rect x="5" y="11" width="14" height="8" rx="2.5" />
    </BaseIcon>
  );
}

export function BrandIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M6.5 8.5 12 4l5.5 4.5v7L12 20l-5.5-4.5v-7Z" />
      <path d="M9.5 12h5" />
    </BaseIcon>
  );
}

export function ReportIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M7 18V9" />
      <path d="M12 18V6" />
      <path d="M17 18v-4" />
    </BaseIcon>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M12 5v9" />
      <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
      <path d="M5 18.5h14" />
    </BaseIcon>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M12 4 20 18H4L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </BaseIcon>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M12 4 19 7v5c0 4.5-2.8 7.2-7 8-4.2-.8-7-3.5-7-8V7l7-3Z" />
    </BaseIcon>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="m7 10 5 5 5-5" />
    </BaseIcon>
  );
}
