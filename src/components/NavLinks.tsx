"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/leads", label: "Leady", match: (p: string) => p === "/leads" || /^\/leads\/(?!new)/.test(p) },
  { href: "/pipeline", label: "Pipeline", match: (p: string) => p.startsWith("/pipeline") },
  { href: "/leads/new", label: "+ Dodaj", match: (p: string) => p === "/leads/new" },
];

export function NavLinks({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  if (variant === "top") {
    return (
      <nav className="hidden gap-1 sm:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              l.match(pathname) ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`py-3 text-center text-sm font-medium ${
            l.match(pathname) ? "text-stone-900" : "text-stone-500"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
