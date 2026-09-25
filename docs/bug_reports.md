# Záznam chyb a jejich analýza (Bug Log)

Tento dokument eviduje nahlášené chyby z produkčního testování na `ci-retrospective.tomas-kansky.workers.dev`, jejich příčiny a návrhy řešení.

---

## 🐛 Bug #1: Přidání karty se po kliknutí na "Uložit" neprojeví a konzole nehlásí chybu

* **Popis**: Uživatel klikne na `+ Přidat kartu`, napíše text, klikne na `Uložit`, ale karta se do sloupce nepřidá a v konzoli se nezobrazí žádná chyba.
* **Analýza příčiny**:
  1. **Absence optimistické aktualizace (Optimistic UI)**: V hooku `useRetroRoom.ts` funkce `addCard` pouze odeslala zprávu přes WebSocket, ale lokální stav `state.cards` neaktualizovala optimisticky. Pokud WebSocket nebyl ve stavu `OPEN` nebo pokud server neodpověděl, UI tiše selhalo.
  2. **Detekce `roomId` na serveru**: V `apps/server/src/room.ts` se `roomId` parsoval přes `url.pathname.split("/")[3]`. Pokud URL na produkci nemělo přesně tento počet lomítek (nebo chyběl query parametr), `roomId` spadl na `"default"`, což v D1 nenašlo retrospektivu a WebSocket handshake selhal.
* **Řešení**:
  - Implementovat okamžitou optimistickou aktualizaci v `useRetroRoom.ts` (karta se okamžitě zobrazí v UI).
  - Předávat `roomId` explicitně jak v cestě, tak v query parametru `?roomId=${roomId}`.
  - V `apps/server/src/room.ts` robustně extrahovat `roomId` z URL parametrů a uložit do persistentního úložiště DO a attachmentu socketu.
* **Status**: ✅ **Opraveno**

---

## 🐛 Bug #2: Při kliknutí na tlačítko Timeru se odpočet nespustí

* **Popis**: Kliknutí na tlačítko "Play" v hlavičce tabule nespustí synchronizovaný časovač.
* **Analýza příčiny**:
  - Spuštění timeru záviselo výhradně na serverové zprávě `TIMER_CONTROL` přes WebSocket. Při výpadku nebo zpoždění WebSocketu se lokální `secondsLeft` neaktivoval.
  - V `apps/server/src/room.ts` se při hibernaci Durable Objectu mohl ztratit načtený stav v paměti (`if (!this.state) return;` tiše ignoroval zprávy).
* **Řešení**:
  - Lokální okamžitý start odpočtu v UI s následnou synchronizací se serverem.
  - V `apps/server/src/room.ts` automaticky obnovit stav z D1/storage při příchozí zprávě po hibernaci.
  - Zajištěn flush `timerEndsAt` a `timerDurationSecs` do databáze D1.
* **Status**: ✅ **Opraveno**

---

## 🐛 Bug #3: Časovač nelze upravit na vlastní délku

* **Popis**: Časovač je pevně nastaven na 5 minut (300 sekund) a uživatel nemá možnost zvolit jinou délku (např. 2 minuty pro bleskový brainstorming nebo 10 minut pro diskuzi).
* **Analýza příčiny**:
  - V `BoardView.tsx` bylo volání `controlTimer("START", 300)` natvrdo nakódováno na hodnotu 300 s. Chyběl ovládací prvek nebo dialog pro výběr délky.
* **Řešení**:
  - Přidán interaktivní vysouvací panel / dropdown pro volbu délky časovače přímo v hlavičce tabule:
    - Rychlé předvolby: **1 min**, **3 min**, **5 min**, **10 min**, **15 min**, **25 min**.
    - Možnost zadat **vlastní počet minut** přes číselné pole formuláře s tlačítkem `Nastavit`.
    - Tlačítko **+1m** pro pohotové prodloužení probíhající diskuze facilitátorem.
    - Zobrazení zvolené délky v reálném čase před spuštěním odpočtu.
* **Status**: ✅ **Implementováno a vyřešeno**
