#!/usr/bin/env node

/**
 * sync-tickets.js
 * Stáhne všechny tickety z D1 databáze a zajistí, že existují jako .md soubory v docs/tickets/
 * 
 * Použití:
 *   npm run tickets:sync
 *   API_URL=https://moje-domena.workers.dev npm run tickets:sync
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const ticketsDir = path.join(rootDir, "docs", "tickets");

const API_URL = process.env.API_URL || "https://ci-retrospective.tomas-kansky.workers.dev";

async function main() {
  console.log(`📡 Stahuji evidenci ticketů z: ${API_URL}/api/tickets ...`);

  if (!fs.existsSync(ticketsDir)) {
    fs.mkdirSync(ticketsDir, { recursive: true });
  }

  let response;
  try {
    response = await fetch(`${API_URL}/api/tickets`);
  } catch (err) {
    console.error(`❌ Nelze se spojit se serverem na ${API_URL}:`, err.message);
    console.log(`💡 Zkontrolujte, zda běží lokální server nebo máte připojení k internetu.`);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`❌ Server vrátil chybu ${response.status}: ${await response.text()}`);
    process.exit(1);
  }

  const data = await response.json();
  const tickets = data.tickets || [];

  console.log(`📋 Nalezeno ${tickets.length} ticketů v databázi.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const ticket of tickets) {
    const filename = ticket.filePath
      ? path.basename(ticket.filePath)
      : `${ticket.id}.md`;
    const targetFile = path.join(ticketsDir, filename);

    // Stáhneme vygenerovaný markdown pro daný ticket
    try {
      const detailRes = await fetch(`${API_URL}/api/tickets/${ticket.id}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        const markdown = detailData.markdown;

        if (markdown) {
          const exists = fs.existsSync(targetFile);
          fs.writeFileSync(targetFile, markdown, "utf-8");
          if (!exists) {
            console.log(`  ➕ Vytvořen nový soubor: docs/tickets/${filename}`);
            createdCount++;
          } else {
            updatedCount++;
          }
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Chyba při stahování detailu pro ${ticket.id}:`, err.message);
    }
  }

  console.log(`\n✅ Hotovo! Vytvořeno nových souborů: ${createdCount}, ověřeno existujících: ${updatedCount}`);
}

main().catch((err) => {
  console.error("Neošetřená chyba:", err);
  process.exit(1);
});
