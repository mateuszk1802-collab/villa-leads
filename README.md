# Villa Leads

Narzędzie do pozyskiwania klientów na filmowe wideo dla luksusowych willi.
Pełna specyfikacja: [SPEC.md](SPEC.md).

Stack (100% darmowy): Next.js + TypeScript + Tailwind, hosting Vercel (Hobby), Supabase (Free).

## Uruchomienie — krok po kroku

### 1. Supabase (baza + logowanie)
1. Załóż konto na [supabase.com](https://supabase.com) → **New project** (plan Free). Zapisz hasło do bazy.
2. W projekcie: **SQL Editor → New query** → wklej całą zawartość pliku
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Authentication → Sign In / Providers → Email**: wyłącz **Allow new users to sign up**
   (aplikacja ma tylko jednego użytkownika — Ciebie).
4. **Authentication → Users → Add user → Create new user**: wpisz swój e-mail i hasło,
   zaznacz **Auto Confirm User**. Tymi danymi będziesz się logować.
5. **Project Settings → API Keys** (oraz **Data API**): skopiuj
   - *Project URL* → to będzie `NEXT_PUBLIC_SUPABASE_URL`
   - klucz *anon public* albo *publishable* → to będzie `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Vercel (hosting)
1. Załóż konto na [vercel.com](https://vercel.com) (plan Hobby) i zaloguj się przez GitHub.
2. **Add New → Project** → wybierz repo `villa-leads` → **Import**.
3. W **Environment Variables** dodaj obie zmienne z kroku 1.5 jako typ **Config**
   (nie „Secret” — zmienne `NEXT_PUBLIC_…` nie mogą być sekretami) → **Deploy**.
4. Po każdej zmianie zmiennych: **Deployments → … → Redeploy**.
5. Po kilku minutach dostaniesz adres aplikacji (np. `villa-leads.vercel.app`).

Każdy pull request dostaje też własny podgląd (link „Preview” w komentarzu Vercela pod PR).

### Aktualizacja bazy po nowym etapie
Gdy nowa wersja zmienia bazę, wklej ponownie **cały** plik `supabase/schema.sql`
w SQL Editor → **Run** (skrypt można uruchamiać wielokrotnie, nie kasuje danych).

## Jak przygotować maila (Etap 2)
1. **Ustawienia** → uzupełnij swoje dane i adres pocztowy (stopka CAN-SPAM).
2. Na stronie leada wybierz typ maila → **Kopiuj prompt dla Claude** → **Otwórz Claude** → wklej.
3. Odpowiedź Claude wklej w pole **Treść** (temat rozpozna się sam) → **Zapisz maila**.
4. **Otwórz w poczcie** (albo Kopiuj) → wyślij ze swojej skrzynki → kliknij **Wysłałem**.

## Dodawanie leadów z listy stron www (Etap 3)
**Leady → Wklej adresy www** → wklej adresy (każdy w nowej linii) → **Dodaj i sprawdź strony**.
Aplikacja tworzy leady (bez duplikatów po domenie) i dla każdego pobiera publiczną stronę główną
oraz kontaktową: szuka e-maila i sprawdza, czy jest wideo. Zasady: szanuje `robots.txt`,
maks. 1 zapytanie na sekundę, nic nie pobiera z airbnb.com, vrbo.com ani booking.com.
Pojedynczego leada sprawdzisz przyciskiem **Sprawdź stronę** na jego stronie.

## Przypomnienia i „Nie kontaktować” (Etap 4)
- **Dziś** (pierwsza zakładka, liczba w kółku): leady, którym minęły 4 dni od wysłania
  (czas na follow-up 1) i 7 dni od follow-upu 1 (czas na follow-up 2), plus „W najbliższych dniach”.
- Na stronie leada: **Wypisał się — nie kontaktować**. Taki lead znika z przypomnień, a przygotowanie
  wiadomości jest zablokowane. Lista: **Leady → Nie kontaktować**.

### Lokalnie (opcjonalnie, dla programisty)
```bash
cp .env.example .env.local   # uzupełnij wartości
npm install
npm run dev
```

## Bezpieczeństwo
- Klucze tylko w zmiennych środowiskowych (`.env.local` jest ignorowany przez git).
- Dane chronią reguły RLS w Supabase — każdy widzi wyłącznie swoje leady.
- Aplikacja nigdy nie wysyła maili sama.
