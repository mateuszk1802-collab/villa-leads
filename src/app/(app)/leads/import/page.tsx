import Link from "next/link";
import { ImportForm } from "@/components/ImportForm";

// Wzbogacanie kilku stron może chwilę potrwać
export const maxDuration = 60;

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/leads" className="text-sm text-stone-500 hover:text-stone-900">
        ← Leady
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Dodaj leady z adresów www</h1>
        <p className="text-sm text-stone-500">
          Duplikaty (ta sama domena) są pomijane automatycznie.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
