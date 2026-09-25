import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq, desc } from "drizzle-orm";
import { RetroRoom, type Env } from "./room";
import { createDb, ensureTablesExist, retrospectives, columns, cards, votes, actionItems, tickets } from "./db";
import { TemplateTypeSchema, CreateTicketSchema } from "@ci-retro/types";

export { RetroRoom };

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  console.error("Hono server error:", err);
  return c.json(
    {
      error: err.message || "Internal Server Error",
      stack: err.stack,
    },
    500
  );
});

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Upgrade"],
  })
);

// Automatická inicializace D1 schématu při prvním requestu
app.use("*", async (c, next) => {
  if (c.env?.DB) {
    await ensureTablesExist(c.env.DB);
  }
  await next();
});

// Health check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "ci-retro-server",
    timestamp: new Date().toISOString(),
  });
});

// Seznam retrospektiv (Historie / Dashboard)
app.get("/api/retrospectives", async (c) => {
  const db = createDb(c.env.DB);
  const allRetros = await db
    .select()
    .from(retrospectives)
    .orderBy(desc(retrospectives.createdAt))
    .limit(50);

  return c.json({ retrospectives: allRetros });
});

// Získání detailu retrospektivy včetně sloupců a karet
app.get("/api/retrospectives/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const retro = await db.query.retrospectives.findFirst({
    where: eq(retrospectives.id, id),
    with: {
      columns: {
        orderBy: (columns, { asc }) => [asc(columns.sortOrder)],
      },
    },
  });

  if (!retro) {
    return c.json({ error: "Retrospektiva nebyla nalezena" }, 404);
  }

  return c.json({ retrospective: retro });
});

// Vytvoření nové retrospektivy se zvolenou šablonou
app.post("/api/retrospectives", async (c) => {
  const body = await c.req.json<{
    title: string;
    templateType?: string;
    maxVotesPerUser?: number;
  }>();

  const title = body.title?.trim() || "Nová retrospektiva";
  const templateType = TemplateTypeSchema.safeParse(body.templateType).success
    ? (body.templateType as any)
    : "WENT_WELL_TO_IMPROVE";
  const maxVotes = body.maxVotesPerUser ?? 5;

  const retroId = crypto.randomUUID();
  const now = new Date().toISOString();

  const db = createDb(c.env.DB);

  // 1. Zápis retrospektivy do D1
  await db.insert(retrospectives).values({
    id: retroId,
    title,
    phase: "BRAINSTORMING",
    templateType,
    maxVotesPerUser: maxVotes,
    cardsBlurred: true,
    timerEndsAt: null,
    timerDurationSecs: 300,
    createdAt: now,
  });

  // 2. Definice sloupců podle zvolené šablony
  const templateColumnsMap: Record<string, Array<{ title: string; color: string }>> = {
    WENT_WELL_TO_IMPROVE: [
      { title: "Co se povedlo (Went well)", color: "#10b981" },
      { title: "Co zlepšit (To improve)", color: "#f43f5e" },
      { title: "Akční kroky (Action items)", color: "#6366f1" },
    ],
    MAD_SAD_GLAD: [
      { title: "Mad (Hněv / Frustrace)", color: "#f43f5e" },
      { title: "Sad (Smutek / Zklamání)", color: "#f59e0b" },
      { title: "Glad (Radost / Úspěch)", color: "#10b981" },
    ],
    START_STOP_CONTINUE: [
      { title: "Start (Začít dělat)", color: "#10b981" },
      { title: "Stop (Přestat dělat)", color: "#f43f5e" },
      { title: "Continue (Pokračovat)", color: "#3b82f6" },
    ],
    FOUR_LS: [
      { title: "Liked (Líbilo se)", color: "#10b981" },
      { title: "Learned (Naučili jsme se)", color: "#3b82f6" },
      { title: "Lacked (Chybělo nám)", color: "#f59e0b" },
      { title: "Longed for (Přáli bychom si)", color: "#8b5cf6" },
    ],
    CUSTOM: [
      { title: "Sloupec 1", color: "#6366f1" },
      { title: "Sloupec 2", color: "#10b981" },
    ],
  };

  const selectedCols = templateColumnsMap[templateType] || templateColumnsMap.WENT_WELL_TO_IMPROVE;

  const columnInserts = selectedCols.map((col, idx) => ({
    id: crypto.randomUUID(),
    retrospectiveId: retroId,
    title: col.title,
    color: col.color,
    sortOrder: idx,
  }));

  await db.insert(columns).values(columnInserts);

  return c.json(
    {
      id: retroId,
      title,
      templateType,
      columns: columnInserts,
      createdAt: now,
    },
    201
  );
});

// ==========================================
// TICKETOVÝ SYSTÉM & HLÁŠENÍ CHYB
// ==========================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function toBase64Utf8(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateTicketMarkdown(t: typeof tickets.$inferSelect): string {
  let consoleErrorsFormatted = "[]";
  if (t.consoleErrors) {
    try {
      const parsed = JSON.parse(t.consoleErrors);
      consoleErrorsFormatted = JSON.stringify(parsed, null, 2);
    } catch {
      consoleErrorsFormatted = t.consoleErrors;
    }
  }

  return `---
id: "${t.id}"
title: "${t.title.replace(/"/g, '\\"')}"
type: "${t.type}"
status: "${t.status}"
priority: "${t.priority}"
createdAt: "${t.createdAt}"
author:
  name: "${t.authorName.replace(/"/g, '\\"')}"
  sessionId: "${t.authorSessionId}"
environment:
  roomId: "${t.roomId || ""}"
  phase: "${t.phase || ""}"
  userAgent: "${(t.userAgent || "").replace(/"/g, '\\"')}"
  screen: "${t.screenResolution || ""}"
---

# ${t.id}: ${t.title}

## 📝 Popis problému
${t.description}

${t.stepsToReproduce ? `## 🔁 Kroky k reprodukci\n${t.stepsToReproduce}\n` : ""}
${t.expectedBehavior || t.actualBehavior ? `## ⚠️ Očekávané vs. reálné chování
- **Očekávané**: ${t.expectedBehavior || "Neuvedeno"}
- **Reálné**: ${t.actualBehavior || "Neuvedeno"}
` : ""}
## 💻 Technický kontext a telemetrie
- **Místnost**: \`${t.roomId || "N/A"}\`
- **Fáze**: \`${t.phase || "N/A"}\`
- **Uživatel**: ${t.authorName} (${t.authorSessionId})
- **Prohlížeč**: \`${t.userAgent || "N/A"}\`
- **Rozlišení**: \`${t.screenResolution || "N/A"}\`
- **Chyby v konzoli**:
\`\`\`json
${consoleErrorsFormatted}
\`\`\`

## 🛠️ Návrh řešení & Historie oprav
*(Tuto sekci doplňuje řešitel při opravě)*
- **Příčina**: 
- **Změny**: 
- **Commit**: 
`;
}

async function commitTicketToGitHub(
  env: Env,
  filePath: string,
  contentStr: string,
  commitMessage: string
): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
  if (!env.GITHUB_TOKEN) {
    return { success: false, error: "GITHUB_TOKEN is not configured" };
  }

  const owner = env.GITHUB_OWNER || "tomas-kansky";
  const repo = env.GITHUB_REPO || "CI-Retrospective";
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "CI-Retrospective-App",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: toBase64Utf8(contentStr),
        branch: "main",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("GitHub API commit error:", res.status, errText);
      return { success: false, error: `GitHub API error (${res.status}): ${errText}` };
    }

    const json = (await res.json()) as any;
    const commitUrl = json?.commit?.html_url || `https://github.com/${owner}/${repo}/blob/main/${filePath}`;
    return { success: true, commitUrl };
  } catch (err: any) {
    console.error("Failed to commit to GitHub:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// Seznam všech ticketů
app.get("/api/tickets", async (c) => {
  const db = createDb(c.env.DB);
  const allTickets = await db
    .select()
    .from(tickets)
    .orderBy(desc(tickets.createdAt))
    .limit(100);

  return c.json({ tickets: allTickets });
});

// Detail ticketu včetně vygenerovaného Markdownu
app.get("/api/tickets/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const found = await db.query.tickets.findFirst({
    where: eq(tickets.id, id),
  });

  if (!found) {
    return c.json({ error: "Ticket nebyl nalezen" }, 404);
  }

  const markdown = generateTicketMarkdown(found);
  return c.json({ ticket: found, markdown });
});

// Vytvoření nového ticketu (D1 perzistence + automatický commit na GitHub)
app.post("/api/tickets", async (c) => {
  const body = await c.req.json();
  const validation = CreateTicketSchema.safeParse(body);

  if (!validation.success) {
    return c.json(
      { error: "Neplatná data ticketu", details: validation.error.format() },
      400
    );
  }

  const data = validation.data;
  const now = new Date().toISOString();
  const dateCompact = now.slice(0, 10).replace(/-/g, "");
  const randSuffix = Math.floor(100 + Math.random() * 900);
  const ticketId = `BUG-${dateCompact}-${randSuffix}`;

  const slug = slugify(data.title) || "ticket";
  const filePath = `docs/tickets/${ticketId}-${slug}.md`;

  const newTicket = {
    id: ticketId,
    title: data.title.trim(),
    type: data.type,
    status: "open",
    priority: data.priority,
    description: data.description.trim(),
    stepsToReproduce: data.stepsToReproduce?.trim() || null,
    expectedBehavior: data.expectedBehavior?.trim() || null,
    actualBehavior: data.actualBehavior?.trim() || null,
    authorName: data.authorName,
    authorSessionId: data.authorSessionId,
    roomId: data.roomId || null,
    phase: data.phase || null,
    userAgent: data.userAgent || null,
    screenResolution: data.screenResolution || null,
    consoleErrors: data.consoleErrors || null,
    githubCommitUrl: null as string | null,
    filePath,
    createdAt: now,
    resolvedAt: null as string | null,
  };

  // 1. Zápis do D1 databáze
  const db = createDb(c.env.DB);
  await db.insert(tickets).values(newTicket);

  // 2. Vygenerování Markdown obsahu
  const markdown = generateTicketMarkdown(newTicket);

  // 3. Pokus o automatický commit do GitHub repozitáře
  let committedToGithub = false;
  let commitUrl: string | undefined;

  if (c.env.GITHUB_TOKEN) {
    const commitRes = await commitTicketToGitHub(
      c.env,
      filePath,
      markdown,
      `docs: report ticket ${ticketId} - ${data.title}`
    );

    if (commitRes.success) {
      committedToGithub = true;
      commitUrl = commitRes.commitUrl;

      if (commitUrl) {
        await db
          .update(tickets)
          .set({ githubCommitUrl: commitUrl })
          .where(eq(tickets.id, ticketId));
        newTicket.githubCommitUrl = commitUrl;
      }
    }
  }

  return c.json(
    {
      success: true,
      ticket: newTicket,
      markdown,
      filePath,
      committedToGithub,
      githubCommitUrl: commitUrl,
      needsManualSync: !committedToGithub,
    },
    201
  );
});

// Směrování požadavků a WebSocket spojení do příslušného Durable Objectu pro danou místnost
app.all("/api/room/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  if (!roomId) return c.text("Room ID is required", 400);

  const id = c.env.RETRO_ROOM.idFromName(roomId);
  const room = c.env.RETRO_ROOM.get(id);

  const url = new URL(c.req.url);
  url.searchParams.set("roomId", roomId);
  const newReq = new Request(url.toString(), c.req.raw);

  return room.fetch(newReq);
});

app.all("/api/room/:roomId/*", async (c) => {
  const roomId = c.req.param("roomId");
  if (!roomId) return c.text("Room ID is required", 400);

  const id = c.env.RETRO_ROOM.idFromName(roomId);
  const room = c.env.RETRO_ROOM.get(id);

  const url = new URL(c.req.url);
  url.searchParams.set("roomId", roomId);
  const newReq = new Request(url.toString(), c.req.raw);

  return room.fetch(newReq);
});

export default app;
