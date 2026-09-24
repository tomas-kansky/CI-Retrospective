# Analýza aktuální implementace a návrh zlepšení (CI Retrospective)

Tento dokument hodnotí stav aplikace po dokončení Fáze 1 (Projektová kostra, Monorepo, D1 databáze, Drizzle ORM a Hono API) a navrhuje konkrétní architektonická, bezpečnostní i UX vylepšení před zahájením Fáze 2.

---

## 1. Souhrnné zhodnocení aktuálního stavu

* **Co funguje skvěle**:
  * **Čisté monorepo**: Sdílený balíček `@ci-retro/types` eliminuje duplicitu typů mezi React frontendem a Cloudflare Workers backendem.
  * **Typově bezpečná databáze**: Cloudflare D1 v kombinaci s Drizzle ORM a automatickými migracemi poskytuje robustní základ bez runtime overheadu.
  * **Lokální emulace**: Miniflare v rámci Wrangleru umožňuje plnohodnotný vývoj a testování bez nutnosti placených cloudových účtů.
  * **Designový systém**: Moderní glassmorphic layout s podporou světlého a tmavého režimu a Google fontem Plus Jakarta Sans.

---

## 2. Navrhovaná zlepšení (Kategorie a konkrétní řešení)

### A. Výkon & Cloudflare Edge architektura

#### 1. Využití WebSocket Hibernation API v Durable Objects
* **Současný stav**: Durable Object drží spojení v paměti a běží po celou dobu, co je klient připojen.
* **Problém**: Pokud je na tabuli připojeno 15 lidí a zrovna nikdo nepíše, Cloudflare počítá GB-sekundy aktivního výpočetního času.
* **Zlepšení**: Využít moderní **WebSocket Hibernation API** (`this.ctx.acceptWebSocket(ws, tags)`).
* **Přínos**:
  * Cloudflare uspí proces Durable Objectu do paměťové hibernace, když po síti neproudí data (nulová spotřeba CPU/GB-s).
  * V okamžiku příchodu zprávy se DO okamžitě probudí za < 1 ms.
  * Umožňuje hromadný broadcast všem připojeným klientům přes `this.ctx.getWebSockets()`.

#### 2. Dvoustupňová perzistence (DO SQLite + D1 Debounced Flush)
* **Současný stav**: Zápisy retrospektiv a sloupců probíhají přímo do centrální D1 databáze.
* **Problém**: Během aktivního brainstormingu a hlasování vznikají stovky drobných mutací za minutu. Přímý zápis každé mutace do D1 by mohl narážet na limity zápisů nebo způsobovat zbytečnou I/O režii.
* **Zlepšení**:
  * **Stupeň 1 (Real-time)**: Každá změna karty nebo hlas se okamžitě zapíše do lokálního SQLite uvnitř Durable Objectu (`this.ctx.storage.sql`). Odezva je okamžitá (< 2 ms).
  * **Stupeň 2 (Archiv & Historie)**: Durable Object provádí debounced synchronizaci do centrální D1 databáze (např. po 15 sekundách nečinnosti nebo při změně fáze).
* **Přínos**: Aplikace zvládne neomezený počet hlasů a drag-and-drop událostí bez latence a s minimálním počtem D1 zápisů.

---

### B. Bezpečnost a zamezení ovlivňování týmu (Anti-bias & Security)

#### 3. Bezpečný Server-Side Blur (Ochrana proti čtení karet přes DevTools)
* **Současný stav**: Maskování karet je plánováno jako stav `cardsBlurred: true`.
* **Riziko**: Pokud by se maskování provádělo pouze v CSS (`filter: blur(...)`), technicky zdatný účastník by mohl otevřít nástroje pro vývojáře (F12) a přečíst si karty kolegů ještě před fází odhalení.
* **Zlepšení**:
  * Ve fázi `BRAINSTORMING` při zapnutém `cardsBlurred: true` server v Durable Objectu při vysílání stavu nahradí text karet ostatních účastníků za zástupný symbol (např. `••••••••••••`).
  * Plný text své vlastní karty obdrží pouze její autor (ověřeno přes `authorSessionId`).
  * Teprve ve fázi `GROUPING` / `VOTING` facilitátor odemkne karty a server rozešle nezkreslený obsah všem.
* **Přínos**: 100% férový brainstorming bez psychologického zkreslení (tzv. anchoring bias).

#### 4. Validace API vstupů přes `@hono/zod-validator`
* **Současný stav**: V `apps/server/src/index.ts` validujeme tělo požadavku částečně manuálně.
* **Zlepšení**: Zavedení middleware `zValidator("json", Schema)` přímo z Hono ekosystému s využitím existujících schémat z `@ci-retro/types`.
* **Přínos**: Automatická ochrana proti nevalidním payloadům a striktní typová kontrola na úrovni HTTP routeru.

---

### C. UX & Kolaborativní funkce (Inspirace EasyRetro)

#### 5. URL Routing místností (Shareable Room Link)
* **Současný stav**: Aplikace zobrazuje seznam retrospektiv i aktivní tabuli na jedné URL adrese.
* **Zlepšení**:
  * Zavést jednoduchý routing:
    * `/`: Dashboard s historií a tlačítkem "Nová retrospektiva".
    * `/board/:id`: Samostatná celoobrazovková stránka konkrétní retrospektivy.
  * Tlačítko **"Kopírovat odkaz pro tým"** v horní liště tabule (zkopíruje přímý odkaz včetně případného PIN kódu).
* **Přínos**: Facilitátor pošle odkaz do Slacku/Teams a všichni se jedním klikem připojí do stejné místnosti.

#### 6. Detekce přítomnosti & Indikátor psaní ("Typing presence")
* **Zlepšení**:
  * V hlavičce tabule zobrazovat avatary všech aktuálně připojených lidí (Live presence).
  * V patičce každého sloupce zobrazovat drobný indikátor: *"Petr právě píše myšlenku..."*.
* **Přínos**: Tým má pocit živého prostoru a ví, zda ještě někdo dopisuje nápady.

#### 7. Zvuková a vizuální signalizace časovače (Audio FX)
* **Zlepšení**:
  * Po vypršení synchronizovaného odpočtu přehrát jemný gong/zvukový signál pomocí Web Audio API (nevyžaduje stahování velkých audio souborů).
* **Přínos**: Účastníci, kteří mají otevřené jiné okno, okamžitě zaregistrují konec fáze psaní/hlasování.

---

### D. Vývojářský komfort (DX)

#### 8. Souběžné spouštění přes `concurrently`
* **Současný stav**: Pro spuštění celého stacku je potřeba pustit `npm run dev:server` v jednom okně a `npm run dev:web` v druhém.
* **Zlepšení**: Přidat balíček `concurrently` a upravit root skript `"dev": "concurrently -k -n \"server,web\" -c \"magenta,cyan\" \"npm run dev:server\" \"npm run dev:web\""`.
* **Přínos**: Vývojář napíše `npm run dev` a má okamžitě běžící oba servery s přehlednými barevnými logy v jediném okně terminálu.

---

## 3. Doporučený plán zapracování zlepšení

| Priorita | Zlepšení | Fáze realizace |
| :--- | :--- | :--- |
| 🔴 **Vysoká** | Souběžné spouštění `concurrently` pro root `npm run dev` | Okamžitě (před Taskem 2.1) |
| 🔴 **Vysoká** | WebSocket Hibernation API v Durable Objects | Fáze 2 (Task 2.1) |
| 🔴 **Vysoká** | URL Routing místností (`/board/:id`) & Sdílecí odkaz | Fáze 2 & 3 |
| 🟡 **Střední** | Bezpečný Server-Side Blur (skrývání textu na backendu) | Fáze 2 (Task 2.2) |
| 🟡 **Střední** | Dvoustupňová perzistence (DO SQLite -> D1 Snapshot) | Fáze 2 (Task 2.3) |
| 🟢 **Doplňková**| Web Audio API časovač & Typing indikátory | Fáze 3 & 4 |
