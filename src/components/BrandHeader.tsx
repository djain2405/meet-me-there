import Link from "next/link";

type Props = {
  badge?: string;
  showNav?: boolean;
};

export function BrandHeader({ badge, showNav = true }: Props) {
  return (
    <header className="border-b border-peach/80 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="group flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-coral to-sun text-lg shadow-sm"
          >
            👋
          </span>
          <span className="text-lg font-bold text-teal-dark group-hover:text-teal">
            Meet Me There
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {badge ? (
            <span className="hidden rounded-full bg-lavender px-3 py-1 text-xs font-bold text-teal-dark sm:inline">
              {badge}
            </span>
          ) : null}
          {showNav ? (
            <Link
              href="/admin/login"
              className="text-sm font-medium text-muted hover:text-ink"
            >
              For organizers
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
