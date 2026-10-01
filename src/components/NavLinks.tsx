"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/today", label: "Dziś", match: (p: string) => p.startsWith("/today") },
  { href: "/leads", label: "Leady", match: (p: string) => p === "/leads" || /^\/leads\/(?!new)/.test(p) },
  { href: "/pipeline", label: "Pipeline", match: (p: string) => p.startsWith("/pipeline") },
  { href: "/leads/new", label: "+ Dodaj", match: (p: string) => p === "/leads/new" },
  { href: "/settings", label: "Ustawienia", match: (p: string) => p.startsWith("/settings") },
];

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] leading-5 font-semibold text-white">
      {count}
    </span>
  );
}

export function NavLinks({ variant, todayCount }: { variant: "top" | "bottom"; todayCount: number }) {
  const pathname = usePathname();
  if (variant === "top") {
    return (
      <nav className="hidden gap-1 md:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              l.match(pathname) ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {l.label}
            {l.href === "/today" && <Badge count={todayCount} />}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`py-3 text-center text-xs font-medium ${
            l.match(pathname) ? "text-stone-900" : "text-stone-500"
          }`}
        >
          {l.label}
          {l.href === "/today" && <Badge count={todayCount} />}
        </Link>
      ))}
    </nav>
  );
}
