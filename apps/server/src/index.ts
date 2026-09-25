import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq, desc } from "drizzle-orm";
import { RetroRoom, type Env } from "./room";
import { createDb, ensureTablesExist, retrospectives, columns, cards, votes, actionItems } from "./db";
import { TemplateTypeSchema } from "@ci-retro/types";

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
