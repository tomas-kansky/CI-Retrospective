# CI Retrospective

> Moderní, rychlá a kolaborativní real-time aplikace pro agilní retrospektivy (alternativa k EasyRetro) běžící kompletně na serverless edge infrastruktuře **Cloudflare**.

## 🚀 Klíčové vlastnosti

- **Real-time kolaborace bez zpoždění**: Blesková synchronizace karet, hlasů a časovače díky Cloudflare Durable Objects a WebSockets.
- **Přednastavené i vlastní šablony**: Went Well / To Improve, Mad / Sad / Glad, 4Ls, Lean Coffee a další.
- **Anonymita & Maskování karet (Blur)**: Skrytí nápadů před fází odhalení pro zamezení zkreslení v týmu.
- **Hlasovací systém**: Férové hlasování s nastavitelným limitem hlasů na účastníka.
- **Seskupování témat (Grouping)**: Plynulé slučování souvisejících myšlenek pomocí drag-and-drop.
- **Archiv & Action Items**: Ukládání retrospektiv, sledování akčních kroků a jejich přenášení mezi sprinty.

## 🛠️ Architektura a Tech Stack

- **Hosting & Frontend**: [Cloudflare Pages](https://pages.cloudflare.com/) + React (Vite)
- **Real-time Engine**: [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) / [PartyKit](https://partykit.io/)
- **API & Routing**: [Cloudflare Workers](https://workers.cloudflare.com/) + [Hono](https://hono.dev/)
- **Databáze**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (Serverless SQLite) + [Drizzle ORM](https://orm.drizzle.team/)

Podrobnou analýzu proveditelnosti, architekturu a datový model najdete v dokumentu:
👉 [docs/architecture_and_feasibility.md](docs/architecture_and_feasibility.md)

## 📄 Licence

MIT
