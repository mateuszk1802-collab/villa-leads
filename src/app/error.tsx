"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-xl font-semibold">Coś poszło nie tak</h1>
      <p className="mb-4 text-sm break-words text-stone-600">{error.message}</p>
      <button onClick={reset} className="btn">
        Spróbuj ponownie
      </button>
    </main>
  );
}
