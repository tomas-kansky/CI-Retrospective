# 🎫 Evidence chyb a požadavků (Tickets)

Tato složka slouží k evidenci hlášení chyb a požadavků na vylepšení vytvořených přes tlačítko **„Nahlásit chybu“** v aplikaci CI Retrospective.

Každý ticket je uložen jako samostatný soubor ve formátu `.md` s YAML frontmatter hlavičkou pro snadné strojové zpracování (vývojáři, CI skripty i AI asistenti).

---

## 📂 Struktura složky
```
docs/tickets/
├── README.md               <-- Tento přehled
├── templates/
│   └── ticket_template.md  <-- Vzorová šablona pro tvorbu ticketu
└── BUG-*.md                <-- Jednotlivé evidované tickety
```

## 🏷️ Životní cyklus ticketu
1. **`status: open`** – Nově nahlášená chyba čekající na zpracování.
2. **`status: in_progress`** – Chyba je v řešení (vývojář nebo AI agent provádí analýzu a kódové změny).
3. **`status: resolved`** – Oprava je naimplementována, otestována a commitnuta do gitu.
4. **`status: closed`** – Ticket je definitivně uzavřen.

---

## 📋 Seznam evidovaných ticketů
| ID | Typ | Název | Priorita | Stav | Vytvořeno |
|---|---|---|---|---|---|
| [BUG-20260925-120](BUG-20260925-120-test.md) | 🐛 Chyba | Test | Střední | `open` | 2026-09-25 |
