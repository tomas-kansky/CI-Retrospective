# Analýza a architektonický návrh ticketového systému (Nahlásit chybu)

Tento dokument obsahuje detailní analýzu a návrh implementace ticketového systému pro aplikaci **CI Retrospective**. Systém umožní uživatelům i testerům přímo z uživatelského rozhraní nahlásit chybu nebo námět na vylepšení, automaticky sesbírat technický kontext a zapsat ticket do strukturovaného `.md` souboru v repozitáři, se kterým lze následně efektivně pracovat (vývojáři i AI agenti).

---

## 1. Cíle a požadavky

### Hlavní cíle:
1. **Snadná dostupnost pro uživatele**: Tlačítko `Nahlásit chybu` (nebo 🐛 ikona) viditelné jak na nástěnce retrospektivy, tak na hlavní stránce.
2. **Automatický sběr telemetrie**: Minimalizace nutnosti ručního vypisování verze prohlížeče, ID místnosti, aktuální fáze či chyb z konzole.
3. **Zápis do repozitáře ve formátu Markdown (`.md`)**: Každý ticket jako samostatný `.md` soubor na standardizovaném místě v repozitáři s YAML hlavičkou pro snadné strojové i lidské čtení.
4. **Pracovní workflow pro řešení chyb**: Umožnit vývojářům a AI asistentům (Antigravity, Claude atd.) ticket přečíst, analyzovat, implementovat opravu a označit jej jako vyřešený.

---

## 2. Umístění a formát souborů v repozitáři

### 2.1 Doporučené umístění: `docs/tickets/`
V repozitáři vytvoříme vyhrazenou složku:
```
docs/
├── tickets/
│   ├── README.md                     <-- Automaticky nebo ručně udržovaný přehled ticketů
│   ├── BUG-20260925-001-drag-card.md <-- Konkrétní tickety
│   ├── BUG-20260925-002-timer.md
│   └── templates/
│       └── ticket_template.md        <-- Šablona pro tickety
├── bug_reports.md                    <-- Stávající historický log chyb
└── ticket_system_analysis.md         <-- Tato analýza
```

#### Proč samostatné soubory namísto jednoho velkého souboru?
- **Žádné merge konflikty**: Když dva testeři nahlásí chybu ve stejný den, nedojde ke kolizi v gitu.
- **Přehlednost a modularita**: Každý bug má vlastní historii změn (`git log docs/tickets/BUG-001.md`).
- **Snadná práce pro AI agenty**: AI agent může dostat za úkol: *„Vyřeš ticket `docs/tickets/BUG-20260925-001-drag-card.md`“*. Agent si přečte přesně jeden soubor a nemusí prohledávat stostránkový dokument.
- **Podpora tagů a metadat**: YAML frontmatter umožňuje filtrování podle stavu (`open`, `in_progress`, `resolved`, `closed`) i priority (`low`, `medium`, `high`, `critical`).

---

### 2.2 Standardizovaný formát ticketu (`.md` šablona)

Každý ticket bude mít strukturu:

```markdown
---
id: "BUG-20260925-001"
title: "Karta se při přetažení na jinou kartu nesloučila do skupiny"
type: "bug" # bug | feature | enhancement | ux
status: "open" # open | in_progress | resolved | closed
priority: "high" # low | medium | high | critical
createdAt: "2026-09-25T21:40:00.000Z"
author:
  name: "Anonymní Pelikán"
  sessionId: "d290f1ee-6c54-4b01-90e6-d701748f0851"
environment:
  roomId: "retro-team-alpha"
  phase: "GROUPING"
  cardsBlurred: false
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
  screen: "1920x1080"
  theme: "dark"
---

# BUG-20260925-001: Karta se při přetažení na jinou kartu nesloučila do skupiny

## 📝 Popis problému
Při pokusu o přetažení myšlenky z jednoho sloupce na kartu v sousedním sloupci došlo k vrácení karty na původní pozici namísto jejího sloučení.

## 🔁 Kroky k reprodukci
1. Přepnout tabuli do fáze `2. Seskupování`.
2. Uchopit kartu "Pomalé CI buildy" ve sloupci 1.
3. Přetáhnout ji nad kartu "Testy padají na timeout" ve sloupci 2.
4. Pustit myš.

## ⚠️ Očekávané vs. reálné chování
- **Očekávané**: Karta se měla vnořit jako podkarta do cílové karty a vytvořit skupinu.
- **Reálné**: Karta se vrátila na původní místo, skupina nevznikla.

## 💻 Technický kontext a telemetrie
- **Místnost**: `retro-team-alpha`
- **Fáze**: `GROUPING`
- **Zachycené chyby v konzoli (posledních 5)**:
```json
[
  {
    "time": "2026-09-25T21:39:58.120Z",
    "message": "Uncaught TypeError: Cannot read property 'parentCardId' of undefined",
    "source": "BoardView.tsx:508"
  }
]
```

## 🛠️ Návrh řešení & Historie oprav
*(Tuto sekci vyplňuje vývojář nebo AI agent při řešení)*
- **Příčina**: ...
- **Oprava**: Commit `fix: ...`
- **Ověření**: ...
```

---

## 3. Technická architektura zápisu (Jak dostat `.md` do repozitáře)

Aplikace běží ve dvou různých prostředích:
1. **Lokální vývoj (`localhost:5173` / `localhost:8787`)**: Zde má Node.js / Vite přímý přístup k lokálnímu disku a souborovému systému repozitáře.
2. **Produkční nasazení (`Cloudflare Workers + D1`)**: Edge runtime Cloudflare Workers je bezstavový V8 sandbox a **nemá** přímý diskový přístup k lokálnímu Git repozitáři na počítači vývojáře.

Aby systém fungoval spolehlivě v obou světech, navrhujeme **Hybridní architekturu (D1 + GitHub API / Lokální disk)**:

```
[ Uživatel v UI ]
       │ Klikne na "Nahlásit chybu" a odešle formulář
       ▼
[ Frontend: BugReportModal.tsx ]
       │ Automaticky připojí telemetrii (prohlížeč, fáze, roomId, chyby z konzole)
       │ POST /api/tickets
       ▼
[ Backend: Hono server (Cloudflare Worker) ]
       │
       ├─► 1. Uloží záznam do Cloudflare D1 databáze (tabulka `tickets`)
       │      (Okamžitá perzistence, 100% dostupnost, historie pro in-app zobrazení)
       │
       ├─► 2. Pokud běží LOKÁLNĚ (dev mode):
       │      Zavolá lokální endpoint / Vite middleware -> zapíše soubor přímo do `docs/tickets/BUG-xxx.md`.
       │
       └─► 3. Pokud běží na PRODUKCI:
              A) GitHub API integrace: Pomocí tokenu (`GITHUB_TOKEN` v Cloudflare Secrets)
                 provede commit nového `.md` souboru přímo do repozitáře na GitHubu
                 (přes GitHub REST API: `PUT /repos/:owner/:repo/contents/docs/tickets/...`).
              B) Nebo vytvoří GitHub Issue / exportuje soubor ke stažení.
```

### Porovnání variant implementace:

| Varianta | Popis | Výhody | Nevýhody |
|---|---|---|---|
| **Varianta 1: D1 + Lokální auto-zápis (Doporučeno pro MVP)** | Zápis do D1 tabulky `tickets` + v dev módu zápis přímo do `docs/tickets/*.md`. Na produkci možnost stáhnout `.md` soubor přímo tlačítkem. | Jednoduché, žádné závislosti na externích tokenech, funguje offline i lokálně ihned. | Na produkci vyžaduje buď GitHub token, nebo stažení souboru. |
| **Varianta 2: Přímý GitHub API Commit** | Server odešle request na GitHub REST API (`/repos/.../contents/docs/tickets/BUG-xxx.md`) a soubor se ihned commitne do gitu. | `.md` soubor je v repozitáři okamžitě po odeslání z produkce. | Vyžaduje nastavení GitHub Personal Access Tokenu s právem zápisu do repozitáře. |
| **Varianta 3: D1 Databáze + CLI Sync skript (`npm run tickets:sync`)** | Tickety se ukládají do D1. Vývojář jedním příkazem `npm run tickets:sync` stáhne všechny nové tickety z D1 a vygeneruje z nich `.md` soubory v `docs/tickets/`. | Extrémně čisté, bezpečné, bez tokenů v prohlížeči, funguje s existujícím D1. | Zápis do gitu proběhne až po spuštění příkazu. |

### Doporučené řešení (Kombinace 1 + 2):
- **Primární úložiště**: Tabulka `tickets` v Cloudflare D1 (poskytuje okamžitou odezvu a evidenci v databázi).
- **Zápis do souboru**:
  - Pokud je nastaven `GITHUB_TOKEN` (např. v `.dev.vars` nebo Cloudflare Secrets), server vytvoří soubor `docs/tickets/BUG-...md` přes GitHub API.
  - V lokálním prostředí zápis do složky `docs/tickets/`.
  - V UI modálu po odeslání nabídnout tlačítko: **„Zkopírovat Markdown“** a **„Stáhnout .md soubor“** pro případ, že uživatel chce soubor okamžitě přiložit ručně.

---

## 4. Návrh databázového schématu (Cloudflare D1)

Do `apps/server/src/db/schema.ts` přidáme tabulku `tickets`:

```typescript
export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(), // např. "BUG-20260925-001"
  title: text("title").notNull(),
  type: text("type").notNull().default("bug"), // bug | feature | enhancement
  status: text("status").notNull().default("open"), // open | in_progress | resolved | closed
  priority: text("priority").notNull().default("medium"), // low | medium | high | critical
  description: text("description").notNull(),
  stepsToReproduce: text("steps_to_reproduce"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  authorName: text("author_name").notNull(),
  authorSessionId: text("author_session_id").notNull(),
  roomId: text("room_id"),
  phase: text("phase"),
  userAgent: text("user_agent"),
  screenResolution: text("screen_resolution"),
  consoleErrors: text("console_errors"), // JSON string
  filePath: text("file_path"), // "docs/tickets/BUG-20260925-001.md"
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});
```

---

## 5. UI/UX Návrh: Tlačítko a formulář „Nahlásit chybu“

### 5.1 Umístění tlačítka
1. **Hlavička nástěnky (`BoardView.tsx`)**:
   - Mezi ovládacími prvky vpravo (vedle tlačítka Sdílet a Export):
   - Tlačítko se symbolem `Bug` (červeno-oranžový akcent) a textem `Nahlásit chybu`.
2. **Hlavička Dashboardu (`App.tsx`)**:
   - V pravém horním rohu vedle přepínače tmavého/světlého režimu.

### 5.2 Modální dialog (`BugReportModal.tsx`)
Modální okno bude obsahovat:
- **Záhlaví**: 🐛 Nahlásit chybu / Zpětnou vazbu
- **Pole formuláře**:
  - **Název chyby / Co se stalo** *(povinné, input text)*
  - **Typ hlášení** *(přepínač: 🐛 Chyba / 💡 Nápad na vylepšení / 🎨 Vzhled)*
  - **Závažnost** *(Nízká / Střední / Vysoká / Blokující)*
  - **Podrobný popis & kroky** *(textarea)*
  - **Rozbalovací sekce „Automaticky zjištěné technické údaje“**:
    - ID místnosti & aktuální fáze
    - Jméno uživatele
    - Verze prohlížeče a rozlišení obrazovky
    - Přepínač: *„Přiložit nedávné chyby z konzole (doporučeno)“*
- **Patička**:
  - Tlačítko `Zrušit`
  - Tlačítko `Odeslat hlášení` (uloží do systému, vygeneruje `.md`)

### 5.3 Automatický sběr chyb z konzole (Error Buffer)
V `apps/web/src/main.tsx` zavedeme jednoduchý globální zachytávač:
```typescript
const errorBuffer: Array<{ time: string; message: string; source?: string }> = [];

window.addEventListener("error", (event) => {
  errorBuffer.push({
    time: new Date().toISOString(),
    message: event.message,
    source: `${event.filename}:${event.lineno}`,
  });
  if (errorBuffer.length > 10) errorBuffer.shift(); // udržíme max 10 posledních chyb
});
```
Tento buffer se pak automaticky přiloží k odesílanému ticketu, což radikálně zjednodušuje diagnostiku!

---

## 6. Workflow práce s tickety v repozitáři

Jakmile soubor vznikne v `docs/tickets/`:

1. **Čtení a triage**:
   - Vývojář nebo AI otevře `docs/tickets/`.
   - Všechny nevyřešené tickety mají `status: "open"`.
2. **Přiřazení a řešení**:
   - Stav se změní na `status: "in_progress"`.
   - Vývojář/AI provede potřebné změny v kódu.
3. **Uzavření ticketu**:
   - Do spodní sekce `## 🛠️ Návrh řešení & Historie oprav` se doplní vysvětlení a hash commitu.
   - V hlavičce se nastaví `status: "resolved"` a datum vyřešení.
   - Provede se commit např. `fix: resolve issue BUG-20260925-001 (card grouping)`.

---

## 7. Doporučený plán implementace

1. **Fáze 1: Datový model & Šablona**
   - Vytvoření složky `docs/tickets/` a vzorové šablony `docs/tickets/templates/ticket_template.md`.
   - Přidání tabulky `tickets` do D1 schématu (`schema.ts` a `ensureTablesExist`).
2. **Fáze 2: Backend API**
   - Přidání endpointu `POST /api/tickets`:
     - Vygeneruje unikátní ID ticketu (`BUG-YYYYMMDD-XXX`).
     - Uloží data do D1.
     - Sestaví formátovaný Markdown text.
     - Pokud běží lokálně nebo s GitHub tokenem, zapíše soubor do `docs/tickets/`.
     - Vrátí vytvořený ticket i samotný markdown text v odpovědi.
   - Přidání endpointu `GET /api/tickets` (seznam ticketů) a `GET /api/tickets/:id.md` (export konkrétního ticketu).
3. **Fáze 3: Frontend komponenta & Telemetrie**
   - Implementace globálního zachytávače chyb konzole.
   - Vytvoření komponenty `BugReportModal.tsx`.
   - Přidání tlačítka `Nahlásit chybu` do `BoardView.tsx` a `App.tsx`.
   - Oznámení (toast) po úspěšném odeslání s možností zkopírovat markdown.
