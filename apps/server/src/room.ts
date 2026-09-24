import { DurableObject } from "cloudflare:workers";
import type { RetrospectiveState } from "@ci-retro/types";

export interface Env {
  RETRO_ROOM: DurableObjectNamespace<RetroRoom>;
  DB: D1Database;
}

export class RetroRoom extends DurableObject {
  private sessions = new Map<WebSocket, { id: string; name: string }>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname.endsWith("/health")) {
      return new Response(JSON.stringify({ status: "ok", activeConnections: this.sessions.size }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Pro Task 2.1 – WebSocket protokol
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.sessions.delete(ws);
  }
}
