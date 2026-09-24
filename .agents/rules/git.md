# Pravidla pro Git a verzování

1. **Konvenční commity (Conventional Commits)**:
   - Každá commit zpráva MUSÍ striktně dodržovat formát: `<type>: <popisek>`
   - Typické prefixy: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`, `perf`.

2. **Automatický push po každém commitu (Mandatory Push)**:
   - Po KAŽDÉM provedeném commitu okamžitě proveď `git push` na vzdálený repozitář na GitHubu (`origin main`).
