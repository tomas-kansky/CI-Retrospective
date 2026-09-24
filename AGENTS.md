# Instrukce pro vývoj a workflow (Agent Guidelines)

## 1. Zákaz automatického testování po implementaci (No End-of-Task Browser/E2E Testing)
- Automatické testování v prohlížeči (např. spouštění browser subagenta, screenshotování stránek a procházení webu) na konci každé implementace NENÍ ŽÁDOUCÍ a je zakázáno.
- Jakmile je implementace či požadovaná úprava kódu/obsahu dokončena a uložena, okamžitě předej výsledek uživateli bez spouštění zbytečných ověřovacích browser subagentů.
- Testování v prohlížeči či spouštění validačních subagentů prováděj VÝHRADNĚ tehdy, pokud o to uživatel explicitně požádá.

## 2. Dokumentace a analýzy
- Veškeré analýzy, specifikace, architektonické návrhy a související dokumenty ukládej do složky `docs/` v kořeni projektu.

## 3. Formátování Git commitů (Conventional Commits)
- Každá commit zpráva MUSÍ striktně dodržovat formát: `<type>: <popisek>`
- Typické prefixy: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`.

## 4. Automatický push po každém commitu
- Po KAŽDÉM commitu musí následovat `git push` do vzdáleného repozitáře na GitHubu.
