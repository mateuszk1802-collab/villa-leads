import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Villa Leads</h1>
        <p className="mb-6 text-sm text-stone-500">Zaloguj się, aby zobaczyć swoje leady.</p>
        <LoginForm />
      </div>
    </main>
  );
}
