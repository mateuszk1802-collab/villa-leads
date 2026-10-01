import Link from "next/link";
import { signOut } from "@/app/actions";
import { NavLinks } from "@/components/NavLinks";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/leads" className="text-lg font-semibold tracking-tight">
            Villa Leads
          </Link>
          <NavLinks variant="top" />
          <form action={signOut}>
            <button type="submit" className="text-sm text-stone-500 hover:text-stone-900">
              Wyloguj
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 sm:pb-10">{children}</main>
      <NavLinks variant="bottom" />
    </>
  );
}
