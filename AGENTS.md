# Instrukce pro vývoj a workflow (Agent Guidelines)

Tento dokument je primárním rozcestníkem pro AI agenty pracující v repozitáři **CI Retrospective**.

---

## 🗺️ Rychlá orientace v projektu (Quick Architecture Summary)

> **Kompletní systémový a architektonický přehled:** Přečtěte si [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md) pro podrobný popis celého systému, stavového automatu a toku dat.
> **Podrobný operativní runbook:** Přečtěte si [docs/OPERATIONAL_GUIDE.md](docs/OPERATIONAL_GUIDE.md) pro konkrétní postupy a recepty.

### 1. Co je tento projekt?
Real-time webová aplikace pro týmové retrospektivy postavená na serverless technologiích Cloudflare (Workers, Durable Objects, D1 SQLite).

### 2. Struktura monorepa:
- **`apps/web/`** – React (Vite) frontend:
  - `src/components/BoardView.tsx` – hlavní plocha tabule, sloupce, karty, drag & drop seskupování.
  - `src/hooks/useRetroRoom.ts` – WebSocket hook, synchronizace stavu, presence heartbeat každé 3 minuty.
  - `src/utils/names.ts` – generátor vtipných anonymních zvířat (styl Google Docs).
  - `src/App.tsx` – dashboard, správa retrospektiv.
- **`apps/server/`** – Cloudflare Workers backend:
  - `src/room.ts` – třída `RetroRoom` (Durable Object pro real-time WebSockets, server-side blur maskování).
  - `src/index.ts` – Hono REST API server (`/api/retrospectives`, `/api/room/:roomId`).
  - `src/db/schema.ts` & `src/db/index.ts` – Drizzle ORM schéma a D1 SQLite databáze.
- **`packages/types/`** – sdílené TypeScript typy a Zod schémata (`ClientMessage`, `ServerMessage`, `RetrospectiveState`).
- **`docs/`** – veškerá dokumentace, analýzy a hlášené tickety v `docs/tickets/`.

### 3. Rychlý rozcestník souborů:
| Chci upravit... | Soubor: |
|---|---|
| UI tabule / Drag & Drop | `apps/web/src/components/BoardView.tsx` |
| WebSocket klienta & reconnect | `apps/web/src/hooks/useRetroRoom.ts` |
| Serverovou logiku místnosti / stav | `apps/server/src/room.ts` |
| REST API endpointy | `apps/server/src/index.ts` |
| Databázové schéma D1 | `apps/server/src/db/schema.ts` |
| Sdílené typy zpráv | `packages/types/src/index.ts` |

---

## ⚡ Operativní body pro agenty (Agent Operational Checklist)

Každý agent by měl při řešení úkolů postupovat podle těchto bodů:

### 1. Před začátkem práce:
- Zkontroluj `git status` a poslední commity.
- Ujisti se, zda neměníš sdílené typy (`packages/types`) – pokud ano, začni vždy v nich.

### 2. Během implementace (Klíčové pasti a pravidla):
- **Cloudflare Hibernation**: V `apps/server/src/room.ts` se Durable Object uspává – vždy zajisti načtení stavu přes `ensureStateLoaded()` při každé příchozí zprávě.
- **Žádné plošné `ws.close()`**: Neodpojuj aktivní spojení, vyvolává to rušivý reconnect u klientů.
- **Server-Side Blur**: Ve fázi `BRAINSTORMING` nikdy neposílej text cizích karet neanonymizovaný; maskování `••••••••••••` musí dělat server.
- **Optimistic UI**: Akce na frontendu (přidání karty, přesun, hlas) musí okamžitě aktualizovat lokální stav `state` v Reactu před odpovědí serveru.
- **Styling**: Projekt používá **Vanilla CSS** s proměnnými v `apps/web/src/index.css`. Nepoužívej Tailwind utility třídy.

### 3. Před odevzdáním práce:
- **Typová kontrola**: VŽDY spusť `npm run typecheck --workspaces`.
- **Commit**: Dodrž formát `<type>: <popisek>`.
- **Automatický push**: Ihned po commitu spusť `git push origin main`.
- **Žádné browser testy**: Okamžitě předej výsledek uživateli.

---

## 🚨 Závazná pravidla pro vývoj (Mandatory Rules)

### 1. Zákaz automatického testování po implementaci (No End-of-Task Browser/E2E Testing)
- **Automatické testování v prohlížeči (např. spouštění browser subagenta, screenshotování stránek a procházení webu) na konci každé implementace NENÍ ŽÁDOUCÍ a je ZAKÁZÁNO.**
- Jakmile je implementace či požadovaná úprava kódu/obsahu dokončena a uložena, **okamžitě předej výsledek uživateli** bez spouštění zbytečných ověřovacích browser subagentů.
- Testování v prohlížeči či spouštění validačních subagentů prováděj **VÝHRADNĚ tehdy, pokud o to uživatel explicitně požádá**.

### 2. Dokumentace a analýzy
- Veškeré analýzy, specifikace, architektonické návrhy a související dokumenty ukládej do složky `docs/` v kořeni projektu.

### 3. Formátování Git commitů (Conventional Commits)
- Každá commit zpráva MUSÍ striktně dodržovat formát: `<type>: <popisek>`
- Typické prefixy: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`.
- Příklady:
  - `feat: add card grouping`
  - `fix: timer countdown sync`
  - `docs: update system overview`

### 4. Automatický push po každém commitu
- Po KAŽDÉM commitu musí následovat `git push` do vzdáleného repozitáře na GitHubu (`git push origin main`).
