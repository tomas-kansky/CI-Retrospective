# Návrh architektury a analýza proveditelnosti: Retro Board (EasyRetro alternativa) na Cloudflare

Tento dokument obsahuje detailní analýzu proveditelnosti, architektonický návrh, datový model a technologický stack pro moderní real-time aplikaci na agilní retrospektivy (inspirováno [EasyRetro.io](https://easyretro.io/)) s plným využitím ekosystému **Cloudflare**.

---

## 1. Manažerské shrnutí a analýza proveditelnosti (Feasibility Study)

### 1.1 Verdikt proveditelnosti: **100% PROVEDITELNÉ** (Vysoká vhodnost)
Implementace retrospektivní aplikace na platformě Cloudflare je nejen plně proveditelná, ale představuje v současnosti **technologicky i nákladově nejefektivnější řešení na trhu**. 

Cloudflare eliminuje nutnost spravovat klasické virtuální servery (VPS), kontejnerové clustery (Kubernetes) nebo platit drahé managed servery pro WebSockets a Redis.

### 1.2 Porovnání tradiční architektury vs. Cloudflare Serverless Edge

| Aspekt | Tradiční architektura (Node.js/Redis/VPS) | Cloudflare Edge Architektura (Workers/DO/D1) | Výhoda Cloudflare |
| :--- | :--- | :--- | :--- |
| **Real-time WebSockets** | Dedikovaný Node.js/Go server + Redis Pub/Sub | **Cloudflare Durable Objects** (stateful edge rooms) | Nulová správa instancí, room-based škálování |
| **Globální latence** | 100–250 ms (podle polohy datacentra) | **< 30 ms** (kód běží na 300+ edge uzlech po celém světě) | Blesková odezva při psaní a hlasování |
| **Perzistence a DB** | PostgreSQL na AWS RDS / Supabase | **Cloudflare D1** (Serverless SQLite) + DO SQLite | Nulové poplatky za idle čas, těsná integrace |
| **Hosting Frontendu** | Vercel / Netlify / S3 + CloudFront | **Cloudflare Pages / Workers Assets** | Neomezený bandwidth zdarma, 1 klik deploy |
| **Počáteční náklady** | $15–$50 / měsíc (i bez provozu) | **0 $ / měsíc** (ve Free tieru) | Ideální pro MVP i růst |

### 1.3 Finanční a kapacitní limity (Free Tier vs. Paid Tier)

* **Cloudflare Workers & Pages**:
  * *Free tier:* 100 000 requestů/den, neomezený Pages bandwidth.
  * *Paid ($5/měsíc):* 10 milionů requestů v ceně ($0.50 za další milion).
* **Cloudflare Durable Objects (DO)**:
  * *Free tier:* 1 milion požadavků/měsíc, 400 000 GB-sekund compute, 5 GB storage.
  * *Chování:* Jedna retrospektivní místnost běží jako jeden Durable Object pouze po dobu trvání schůzky (cca 45–60 min).
* **Cloudflare D1 (SQLite DB)**:
  * *Free tier:* 5 000 000 čtení/den, 100 000 zápisů/den, 5 GB kapacity.
  * *Kapacita:* Pro tisíce uložených retrospektiv a stovek týmů je Free tier více než dostačující pro první měsíce až roky provozu.

---

## 2. Funkční specifikace (Inspirace EasyRetro)

Aplikace pokrývá klíčové procesy agilní retrospektivy rozdělené do několika fází:

```mermaid
flowchart LR
    A[1. Příprava & Šablona] --> B[2. Tvorba karet / Brainstorming]
    B --> C[3. Seskupování & Hlasování]
    C --> D[4. Diskuze & Časovač]
    D --> E[5. Action Items & Export]
```

### Klíčové moduly:
1. **Board & Šablony**:
   * Přednastavené šablony: *Went Well / To Improve / Action Items*, *Mad / Sad / Glad*, *Start / Stop / Continue*, *4Ls (Liked, Learned, Lacked, Longed for)*, *Sailboat*.
   * Možnost vytvářet a upravovat vlastní sloupce (včetně barev a limitů).
2. **Karty & Anonymita**:
   * Přidávání karet pod jménem nebo plně anonymně.
   * **Blur / Maskování karet**: Text karet je skrytý, dokud facilitátor neodemkne fázi odhalení (zabraňuje ovlivňování týmu během brainstormingu).
3. **Seskupování (Card Grouping)**:
   * Drag-and-drop sloučení podobných myšlenek do jedné skupiny s jedním hlavním tématem.
4. **Hlasovací systém (Voting)**:
   * Nastavitelný počet hlasů na účastníka (např. 3–5 hlasů).
   * Zamezení hlasování o vlastních kartách (volitelné).
   * Přehledné řazení karet v reálném čase podle počtu obdržených hlasů.
5. **Facilitátorské nástroje & Synchronizovaný časovač**:
   * Synchronizovaný countdown timer viditelný pro všechny připojené členy.
   * Řízení fází facilitátorem (Zápis -> Hlasování -> Diskuze -> Hotovo).
6. **Správa a historie retrospektiv**:
   * Dashboard týmů: ukládání minulých retrospektiv, možnost kdykoliv otevřít archiv.
   * Sledování a přenášení nedokončených **Action Items** do další retrospektivy.
   * Exporty: CSV, Markdown, PDF, webhook do Slacku nebo Jira.

---

## 3. Technologická architektura

Architektura staví na principu **Edge Actor Pattern** pomocí Cloudflare Durable Objects pro real-time synchronizaci a **Serverless SQLite (D1)** pro perzistentní data.

```mermaid
flowchart TD
    subgraph Klienti ["Prohlížeče uživatelů"]
        U1["Facilitátor (React UI)"]
        U2["Člen týmu A (React UI)"]
        U3["Člen týmu B (React UI)"]
    end

    subgraph CF ["Cloudflare Edge Network"]
        CDN["Cloudflare Pages / Assets<br/>(SPA Bundle, HTML/JS/CSS)"]
        Router["Cloudflare Worker (Hono REST API)"]
        
        subgraph RealtimeLayer ["Real-time stavová vrstva"]
            DO["Durable Object (Room Actor)<br/>• WebSockets Hub<br/>• Synchronizovaný stav boardu<br/>• Synchronizovaný Timer<br/>• Atomické hlasování"]
        end

        subgraph StorageLayer ["Perzistentní úložiště"]
            D1[("Cloudflare D1<br/>(Relační SQLite DB:<br/>Uživatelé, Týmy, Boardy, Karty, Úkoly)")]
            R2[("Cloudflare R2<br/>(Exporty PDF, Avatary)")]
            KV[("Cloudflare KV<br/>(Cache, Session tokens)")]
        end
    end

    U1 -->|HTTPS| CDN
    U2 -->|HTTPS| CDN
    U3 -->|HTTPS| CDN

    U1 <-->|WebSocket wss://| DO
    U2 <-->|WebSocket wss://| DO
    U3 <-->|WebSocket wss://| DO

    U1 -->|REST API| Router
    Router --> D1
    DO -->|Zápis při ukončení / Periodický snapshot| D1
    Router <--> KV
    DO -.->|Export souborů| R2
```

### 3.1 Proč Durable Objects (nebo PartyKit)?
U kolaborativních tabulí potřebujete:
1. **Nulovou latenci**: Změny v textu, přesun karet a kliknutí na hlasování se musí okamžitě promítnout ostatním.
2. **Konzistenci bez kolizí (Race Conditions)**: Pokud má účastník limit 5 hlasů a klikne 5x rychle za sebou, server musí garantovat, že nepřekročí limit. Durable Object je **jednovláknový stavový proces (actor)**, který zaručuje sekvenční a atomické zpracování zpráv bez potřeby distribuovaných zámků v databázi.
3. **Efektivitu perzistence**: Během aktivní 45minutové retrospektivy se udělají stovky drobných změn (hýbání myší, psaní, přetahování). Durable Object drží stav v paměti / lokálním SQLite v rámci DO a do hlavní databáze D1 provádí debounced/batch snapshoty. Tím se šetří limity zápisů do hlavní DB.

> [!TIP]
> **PartyKit** je open-source knihovna přímo pod křídly Cloudflare, která abstrakci nad Durable Objects a WebSockets zjednodušuje na jednotky řádků kódu (metody `onConnect`, `onMessage`, `broadcast`). Lze ji nasadit přímo na váš Cloudflare účet.

---

## 4. Datový model (Cloudflare D1)

Relační schéma navržené pro **Cloudflare D1** pomocí **Drizzle ORM**:

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ TEAMS : contains
    TEAMS ||--o{ TEAM_MEMBERS : has
    USERS ||--o{ TEAM_MEMBERS : belongs_to
    TEAMS ||--o{ RETROSPECTIVES : owns
    RETROSPECTIVES ||--o{ COLUMNS : contains
    COLUMNS ||--o{ CARDS : contains
    CARDS ||--o{ VOTES : receives
    USERS ||--o{ VOTES : casts
    RETROSPECTIVES ||--o{ ACTION_ITEMS : generates
    USERS ||--o{ ACTION_ITEMS : assigned_to

    ORGANIZATIONS {
        text id PK
        text name
        text slug
        datetime created_at
    }

    USERS {
        text id PK
        text email
        text name
        text avatar_url
        datetime created_at
    }

    RETROSPECTIVES {
        text id PK
        text team_id FK
        text title
        text status "DRAFT | ACTIVE | DISCUSSED | ARCHIVED"
        text template_type
        integer max_votes_per_user
        boolean cards_blurred
        text access_code
        datetime scheduled_at
        datetime closed_at
    }

    COLUMNS {
        text id PK
        text retrospective_id FK
        text title
        text color
        integer sort_order
    }

    CARDS {
        text id PK
        text column_id FK
        text parent_card_id "Grouped with"
        text author_id FK "Null if anonymous"
        text content
        integer sort_order
        datetime created_at
    }

    VOTES {
        text id PK
        text card_id FK
        text user_id FK
        datetime created_at
    }

    ACTION_ITEMS {
        text id PK
        text retrospective_id FK
        text assignee_id FK
        text description
        text status "OPEN | IN_PROGRESS | DONE"
        datetime due_date
    }
```

---

## 5. Doporučený technologický stack

| Vrstva | Doporučená technologie | Alternativa | Důvod volby |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React + Vite (SPA)** na Cloudflare Pages | Next.js (OpenNext) / SvelteKit | Maximální rychlost buildu, čisté oddělení API, 100% kompatibilita s Cloudflare Pages CDN. |
| **Styling & UI** | **Vanilla CSS + CSS Modules** nebo **Tailwind CSS** + **Radix UI** | Shadcn/UI | Moderní, čisté komponenty, přístupnost (a11y), snadný Dark Mode. |
| **Drag and Drop** | **@dnd-kit/core** | react-beautiful-dnd | Moderní, přístupná knihovna pro přetahování karet a sloupců s plynulou animací. |
| **Realtime Engine** | **Cloudflare Durable Objects / PartyKit** | Standalone Worker WebSockets | Nativní podpora WebSockets na Edge, atomický stav místnosti, nulová režie. |
| **Edge API Router** | **Hono** (na Cloudflare Workers) | Itty-router | Neuvěřitelně lehký (~12KB), typově bezpečný, nejpopulárnější router pro Cloudflare. |
| **ORM & Schéma** | **Drizzle ORM + D1** | Prisma (edge client) | Nativní podpora Cloudflare D1, nulový overhead, type-safe SQL dotazy a migrace. |
| **Autentizace** | **Better-Auth** nebo **Auth.js / Clerk** | Supabase Auth / Magic link | Jednoduché přihlášení (Google/GitHub/Magic link) + anonymní hostující relace (Guest PIN). |

---

## 6. Bezpečnost a řízení přístupů

1. **Hostující (Guest) přístup bez nutnosti registrace**:
   * Podobně jako v EasyRetro může facilitátor vytvořit odkaz s unikátním tokenem nebo PIN kódem.
   * Účastníci zadají pouze své jméno (nebo zůstanou anonymní) a obdrží podepsaný JWT token v `sessionStorage`.
2. **Autorizace v Durable Object**:
   * Každé WebSocket spojení při úvodním handshake ověří token.
   * Facilitátorská práva (spuštění timeru, odemčení karet, uzavření retro) jsou striktně validována na straně serveru.
3. **GDPR a šifrování**:
   * Data retrospektiv jsou uložena v Cloudflare D1 v EU regionech (lze nastavit lokalizaci dat).

---

## 7. Fázový plán realizace (Implementation Roadmap)

```mermaid
gantt
    title Plán implementace Retro aplikace
    dateFormat  YYYY-MM-DD
    section Fáze 1: Core MVP
    Nastavení projektu (Vite + Cloudflare Workers + D1)   :a1, 2026-10-01, 3d
    Durable Objects / PartyKit real-time propojení        :a2, after a1, 4d
    Board UI, sloupce a přidávání karet                   :a3, after a2, 4d
    Hlasování a real-time synchronizace stavu             :a4, after a3, 3d
    Ukládání do D1 a archivace tabulí                     :a5, after a4, 3d
    section Fáze 2: Facilitace & UX
    Synchronizovaný timer a blur/maskování karet          :b1, after a5, 3d
    Seskupování karet (Merge/Group drag-and-drop)         :b2, after b1, 4d
    Přednastavené šablony (Mad/Sad/Glad atd.)             :b3, after b2, 2d
    section Fáze 3: Týmy & Action Items
    Autentizace (Google/GitHub + Guest režim)             :c1, after b3, 4d
    Dashboard týmů, správa minulých retrospektiv          :c2, after c1, 4d
    Správa Action Items a jejich přenos                   :c3, after c2, 3d
    section Fáze 4: Exporty & Produkce
    Exporty do Markdown/CSV/PDF                           :d1, after c3, 3d
    Zabezpečení, CI/CD pipeline, nasazení na produkci     :d2, after d1, 3d
```

### Detaily fází:
* **Fáze 1 (MVP)**: Funkční real-time tabule, přidávání/mazání karet, hlasování, ukládání do Cloudflare D1 přes odkaz.
* **Fáze 2 (Facilitátorské nástroje)**: Skrytí karet před hlasováním, odpočet času, slučování karet do skupin, šablony.
* **Fáze 3 (Uživatelské účty a týmy)**: Přihlašování, organizace, historie retrospektiv v čase, modul akčních úkolů.
* **Fáze 4 (Exporty a integrace)**: Generování výstupů pro vedení týmu, webhooky (Slack), automatický deployment přes GitHub Actions na Cloudflare.
