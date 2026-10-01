import Link from "next/link";
import { PlacesSearch } from "@/components/PlacesSearch";
import { placesApiKey } from "@/lib/places";

// Dodanie wielu firm uruchamia sprawdzanie ich stron (1 zapytanie na sekundę)
export const maxDuration = 60;

export default function SearchPage() {
  const configured = Boolean(placesApiKey());
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/leads" className="text-sm text-stone-500 hover:text-stone-900">
        ← Leady
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Szukaj firm w Google</h1>
        <p className="text-sm text-stone-500">
          Wyniki z Map Google. Zaznacz firmy i dodaj — aplikacja od razu poszuka e-maili i wideo na
          ich stronach. Duplikaty (ta sama domena) są oznaczone.
        </p>
      </div>
      {configured ? (
        <PlacesSearch />
      ) : (
        <div className="card space-y-2 p-4 text-sm sm:p-6">
          <p className="font-medium">Wyszukiwarka nie jest jeszcze skonfigurowana.</p>
          <p className="text-stone-600">
            Dodaj w Vercel zmienną <code className="rounded bg-stone-100 px-1">GOOGLE_PLACES_API_KEY</code>{" "}
            (typ Secret) i zrób Redeploy. Instrukcja krok po kroku jest w README. Do tego czasu możesz{" "}
            <Link href="/leads/import" className="underline">
              wkleić adresy www ręcznie
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
