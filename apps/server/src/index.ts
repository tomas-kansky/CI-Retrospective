import { Hono } from "hono";
import { cors } from "hono/cors";
import { RetroRoom, type Env } from "./room";

export { RetroRoom };

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Upgrade"],
  })
);

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "ci-retro-server",
    timestamp: new Date().toISOString(),
  });
});

// Směrování požadavků a WebSocket spojení do příslušného Durable Objectu pro danou místnost
app.all("/api/room/:roomId/*", async (c) => {
  const roomId = c.req.param("roomId");
  if (!roomId) {
    return c.text("Room ID is required", 400);
  }

  const id = c.env.RETRO_ROOM.idFromName(roomId);
  const room = c.env.RETRO_ROOM.get(id);

  return room.fetch(c.req.raw);
});

export default app;
