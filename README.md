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

## Strategia maili: darmowe demo → płatny film
Pierwszy mail zawsze proponuje **darmowe krótkie demo** z ich zdjęć (albo daje link, jeśli w leadzie jest
„Link do demo”) i nie podaje ceny. Follow-up może raz wspomnieć cenę dla pierwszych klientów
(**Ustawienia → Cena dla pierwszych klientów**, domyślnie $250 zamiast $500). Claude nigdy nie wymyśla
klientów, wyników ani doświadczenia.

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

## Wyszukiwarka firm w Google (Etap 5, opcjonalna)
Korzysta z Google Places API. Darmowy limit: 1000 wyszukiwań miesięcznie (do 20 firm każde).
Google wymaga podpięcia karty, ale z limitem dziennym poniżej rachunek wynosi 0 zł.

1. [console.cloud.google.com](https://console.cloud.google.com) → zaloguj się → u góry **Select a project →
   New project** → nazwa `villa-leads` → **Create**.
2. **Billing** → podepnij kartę (wymagane przez Google, nawet przy darmowym limicie).
3. **APIs & Services → Library** → wyszukaj **Places API (New)** → **Enable**.
4. **APIs & Services → Credentials → Create credentials → API key** → skopiuj klucz.
   Kliknij klucz → **API restrictions → Restrict key → Places API (New)** → **Save**.
5. **Limit dzienny (ważne):** **APIs & Services → Places API (New) → Quotas** → znajdź
   „SearchTextRequest per day” (Text Search) → ołówek → ustaw np. **30** → **Save**.
   30 dziennie × 31 dni = 930 < 1000 darmowych, więc nie zapłacisz nic.
6. (Dla spokoju) **Billing → Budgets & alerts → Create budget** → kwota 1 USD → alert e-mail.
7. Vercel → **Settings → Environment Variables** → `GOOGLE_PLACES_API_KEY` = klucz, typ **Secret**
   → **Save** → **Deployments → … → Redeploy**.

Użycie: **Leady → Szukaj w Google** → region (np. „Scottsdale, AZ”) i hasło → **Szukaj** → zaznacz
firmy → **Dodaj zaznaczone**. Aplikacja od razu sprawdza ich strony (e-mail, wideo).

## Claude pisze maile sam (Etap 6, opcjonalny)
Przycisk **✨ Napisz maila (Claude)** przy leadzie i **Przygotuj wszystkie follow-upy** w zakładce **Dziś**.
Claude (model `claude-sonnet-5-5`) tylko pisze szkice — wysyłasz sam. Koszt: ok. 1–2 centy za maila,
płatne z doładowania konta API (abonament Claude Pro nie obejmuje API).

1. [console.anthropic.com](https://console.anthropic.com) → zaloguj się → **Billing** → doładuj np. 5 USD.
2. (Dla spokoju) **Limits / Spend limits** → ustaw miesięczny limit wydatków, np. 5 USD.
3. **API Keys → Create Key** → nazwa `villa-leads` → skopiuj klucz (pokazuje się tylko raz).
4. Vercel → **Settings → Environment Variables** → `ANTHROPIC_API_KEY` = klucz, typ **Secret**
   → **Save** → **Deployments → … → Redeploy**.
5. Supabase → wklej ponownie cały `supabase/schema.sql` → **Run** (nowa kolumna na fragment strony firmy).

Przy sprawdzaniu strony firmy aplikacja zapisuje krótki fragment tekstu ze strony głównej — Claude
używa go, żeby mail był bardziej osobisty. Dla starszych leadów kliknij **Sprawdź stronę** jeszcze raz.

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
