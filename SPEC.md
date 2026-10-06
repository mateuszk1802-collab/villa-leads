# Villa Leads — specyfikacja

Narzędzie do pozyskiwania klientów dla usługi: krótkie, filmowe wideo reklamowe dla
luksusowych obiektów noclegowych (wille, duże domy z przestronnymi wnętrzami), robione
wyłącznie z istniejących zdjęć, bez nagrywania na miejscu. Cena ok. 500 USD.

Rynek docelowy: USA — firmy zarządzające luksusowymi willami na wynajem krótkoterminowy
oraz właściciele dużych willi.

## Założenia

- Aplikacja działa w 100% za darmo: tylko darmowe plany Vercel i Supabase, **bez płatnych API**
  w wersji podstawowej. Dodatki opcjonalne: wyszukiwarka Google Places (funkcja 9, w darmowym
  limicie Google) i pisanie maili przez Claude API (funkcja 10, płatne za użycie, ok. 1–2 centy za maila).
- Jeden użytkownik (właściciel aplikacji).
- Interfejs po polsku, wygodny na telefonie. Generowane maile po angielsku.
- Wszystkie klucze tylko w zmiennych środowiskowych — nigdy w kodzie ani w repo. Plik `.env.example`.
- Aplikacja **nigdy nie wysyła maili sama**.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Hosting: Vercel (plan Hobby, deploy z tego repo)
- Supabase (plan Free): baza danych Postgres + logowanie (e-mail + hasło)

## Funkcje

### 1. Baza leadów
Pola: nazwa firmy/obiektu, typ (firma zarządzająca / właściciel), lokalizacja, strona www,
e-mail, telefon, link do oferty (np. Airbnb — wklejany ręcznie), liczba obiektów (jeśli znana),
czy mają już wideo na stronie (tak / nie / nie wiem), notatki.

### 2. Etapy (pipeline)
Nowy → Sprawdzony → Demo zrobione → Wysłano → Follow-up 1 → Follow-up 2 → Odpowiedź →
Klient / Odmowa.
Widok listy z filtrami + widok kanban.

### 3. Dodawanie leadów z listy adresów www
Pole, w które wklejam jeden lub wiele adresów www (każdy w nowej linii). Aplikacja tworzy
z nich leady (bez duplikatów — porównanie po domenie) i od razu uruchamia wzbogacanie (funkcja 4).

### 4. Wzbogacanie
Dla leada z www aplikacja pobiera publiczną stronę główną i podstronę kontaktową firmy,
wyciąga publiczny e-mail i sprawdza, czy strona zawiera wideo (YouTube / Vimeo / `<video>`).
Zasady:
- tylko publiczne strony firm,
- szanuj `robots.txt`,
- maks. 1 zapytanie na sekundę,
- NIE pobieraj niczego z airbnb.com, vrbo.com ani booking.com.

### 5. Generator wiadomości (bez API)
- Przycisk „Kopiuj prompt dla Claude” — składa gotowe polecenie po angielsku z danymi leada,
  moimi notatkami (np. co widać na ich zdjęciach), etapem (pierwszy kontakt / follow-up 1 /
  follow-up 2) i wymaganiami: maks. 120 słów, temat maila, ton osobisty, stopka CAN-SPAM
  z Ustawień (moje dane + zdanie o możliwości wypisania się).
- Pole „Wklej gotowego maila” — zapisuje temat i treść przy leadzie i pokazuje przyciski
  „Kopiuj” i „Otwórz w poczcie”.
- Moje dane i stopka edytowalne w Ustawieniach.

Strategia: pierwszy kontakt proponuje darmowe demo (15–20 s z ich zdjęć) bez ceny; follow-up może raz
wspomnieć cenę dla pierwszych klientów (domyślnie $250, zwykła $500, edytowalne w Ustawieniach).
Maile nigdy nie zawierają wymyślonych klientów, wyników ani doświadczenia.

### 6. Wysyłka ręczna
Przyciski „Kopiuj” i „Otwórz w poczcie” (`mailto:`). Po kliknięciu „Wysłałem” aplikacja zapisuje
datę i przesuwa etap. Aplikacja NIGDY nie wysyła maili sama.

### 7. Przypomnienia
Lista „Do zrobienia dziś”: leady, którym minęły 4 dni od wysłania (→ follow-up 1) oraz 7 dni
od follow-upu 1 (→ follow-up 2).

### 8. Lista „Nie kontaktować”
Jeśli ktoś się wypisał, oznaczam go, a aplikacja blokuje przygotowanie do niego wiadomości.

### 9. Wyszukiwarka Google Places (dodana później, opcjonalna)
Region + hasło (domyślne: „luxury vacation rental management”, „luxury villa rentals”). Wyniki: nazwa,
adres, www, ocena. Zaznaczone firmy dodaje do bazy (bez duplikatów po domenie / miejscu w Google)
i od razu uruchamia wzbogacanie. Korzysta z darmowego miesięcznego limitu Google (1000 wyszukiwań);
wymaga konta rozliczeniowego Google, a limit dzienny w Google Cloud gwarantuje koszt 0 zł.
Bez klucza API aplikacja działa normalnie, bez tej zakładki.

### 10. Claude pisze maile (dodane później, opcjonalne)
Gdy ustawiony jest klucz `ANTHROPIC_API_KEY`: przycisk „Napisz maila (Claude)” przy leadzie i „Przygotuj
wszystkie follow-upy” na liście „Do zrobienia dziś”. Model `claude-sonnet-5-5`, ten sam prompt co przy
kopiowaniu (plus fragment strony firmy). Wynik zapisuje się jako szkic — aplikacja nadal nigdy nie wysyła
maili sama. Płatne z konta Claude API (ok. 1–2 centy za maila). Bez klucza działa wersja z kopiowaniem.

## Plan pracy

| Etap | Zakres |
|------|--------|
| 1 | Baza leadów + pipeline (lista z filtrami, kanban) + logowanie + deploy na Vercel |
| 2 | Generator wiadomości: Ustawienia (moje dane, stopka), „Kopiuj prompt dla Claude”, „Wklej gotowego maila”, Kopiuj / Otwórz w poczcie / Wysłałem |
| 3 | Dodawanie leadów z listy adresów www + wzbogacanie (e-mail, wykrywanie wideo) |
| 4 | „Do zrobienia dziś” (przypomnienia) + lista „Nie kontaktować” |
| 5 | Wyszukiwarka firm Google Places (opcjonalna, w darmowym limicie) |
| 6 | Claude pisze maile przez API (opcjonalne, płatne za użycie) |

Po każdym etapie: pull request z krótkim opisem po polsku i czekanie na akceptację.
