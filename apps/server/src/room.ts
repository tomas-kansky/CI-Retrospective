import { DurableObject } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import {
  type RetrospectiveState,
  type Card,
  type Vote,
  type ActionItem,
  type Column,
  type UserSession,
  type ClientMessage,
  type ServerMessage,
  ClientMessageSchema,
} from "@ci-retro/types";
import { createDb, ensureTablesExist, retrospectives, columns, cards, votes, actionItems } from "./db";

export interface Env {
  RETRO_ROOM: DurableObjectNamespace<RetroRoom>;
  DB: D1Database;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
}

interface SocketAttachment {
  roomId?: string;
  userId: string;
  name: string;
  avatarColor: string;
  isFacilitator: boolean;
  typingColumnId?: string;
  lastSeen?: number;
}

export class RetroRoom extends DurableObject<Env> {
  private state: RetrospectiveState | null = null;
  private isLoadedFromDb = false;
  private isDirty = false;
  private isFlushing = false;
  private persistTimeout: any = null;
  private presenceBroadcastTimeout: any = null;
  private roomId: string | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Načte počáteční stav tabule z centrální D1 databáze, pokud ještě není v paměti
   */
  private async ensureStateLoaded(roomIdParam?: string): Promise<RetrospectiveState> {
    if (this.state && this.isLoadedFromDb) {
      return this.state;
    }

    const roomId = roomIdParam || this.roomId || (await this.ctx.storage.get<string>("roomId"));
    if (!roomId) {
      throw new Error("Room ID is required to load retrospective state");
    }
    this.roomId = roomId;
    await this.ctx.storage.put("roomId", roomId);

    await ensureTablesExist(this.env.DB);
    const db = createDb(this.env.DB);

    // 1. Dotaz na retrospektivu s relacemi
    const retro = await db.query.retrospectives.findFirst({
      where: eq(retrospectives.id, roomId),
      with: {
        columns: {
          orderBy: (col, { asc }) => [asc(col.sortOrder)],
        },
        actionItems: true,
      },
    });

    if (!retro) {
      throw new Error(`Retrospective ${roomId} not found in D1`);
    }

    // 2. Dotaz na karty a hlasy pro sloupce retrospektivy

    // Všechny karty pro všechny sloupce retrospektivy
    const columnIds = retro.columns.map((c) => c.id);
    let loadedCards: Card[] = [];
    let loadedVotes: Vote[] = [];

    if (columnIds.length > 0) {
      const filteredCards = await db
        .select()
        .from(cards)
        .where(inArray(cards.columnId, columnIds));
      loadedCards = filteredCards.map((c) => ({
        id: c.id,
        columnId: c.columnId,
        parentCardId: c.parentCardId,
        authorSessionId: c.authorSessionId,
        authorName: c.authorName,
        content: c.content,
        color: c.color || undefined,
        sortOrder: c.sortOrder,
        createdAt: c.createdAt,
      }));

      if (loadedCards.length > 0) {
        const filteredVotes = await db
          .select({
            id: votes.id,
            cardId: votes.cardId,
            userSessionId: votes.userSessionId,
            voteType: votes.voteType,
            createdAt: votes.createdAt,
          })
          .from(votes)
          .innerJoin(cards, eq(votes.cardId, cards.id))
          .where(inArray(cards.columnId, columnIds));
        loadedVotes = filteredVotes.map((v) => ({
          id: v.id,
          cardId: v.cardId,
          userSessionId: v.userSessionId,
          voteType: (v.voteType as "UP" | "DOWN") || "UP",
          createdAt: v.createdAt,
        }));
      }
    }

    this.state = {
      id: retro.id,
      title: retro.title,
      phase: retro.phase as any,
      templateType: retro.templateType as any,
      maxVotesPerUser: retro.maxVotesPerUser,
      cardsBlurred: Boolean(retro.cardsBlurred),
      timerEndsAt: retro.timerEndsAt,
      timerDurationSecs: retro.timerDurationSecs,
      columns: retro.columns.map((c) => ({
        id: c.id,
        title: c.title,
        color: c.color,
        sortOrder: c.sortOrder,
      })),
      cards: loadedCards,
      votes: loadedVotes,
      actionItems: retro.actionItems.map((a) => ({
        id: a.id,
        retrospectiveId: a.retrospectiveId,
        text: a.text,
        assignee: a.assignee || undefined,
        status: a.status as any,
        dueDate: a.dueDate || undefined,
        createdAt: a.createdAt,
      })),
    };

    this.isLoadedFromDb = true;
    return this.state;
  }

  /**
   * HTTP a WebSocket Upgrade handler
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    let roomId = url.searchParams.get("roomId");
    if (!roomId) {
      const parts = url.pathname.split("/").filter(Boolean);
      const roomIdx = parts.indexOf("room");
      if (roomIdx !== -1 && parts[roomIdx + 1]) {
        roomId = parts[roomIdx + 1];
      }
    }
    if (!roomId) {
      roomId = "default";
    }

    // 1. WebSocket Upgrade handshake
    if (request.headers.get("Upgrade") === "websocket") {
      const userId = url.searchParams.get("userId") || crypto.randomUUID();
      const userName = url.searchParams.get("userName") || "Anonym";
      const avatarColor = url.searchParams.get("avatarColor") || "#6366f1";
      const isFacilitatorParam = url.searchParams.get("isFacilitator");
      const isFacilitator = isFacilitatorParam !== "false";

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Použití WebSocket Hibernation API: Cloudflare uspí DO při nečinnosti!
      const attachment: SocketAttachment = {
        roomId,
        userId,
        name: userName,
        avatarColor,
        isFacilitator,
        lastSeen: Date.now(),
      };

      this.ctx.acceptWebSocket(server, [userId]);
      server.serializeAttachment(attachment);

      try {
        // Zajistíme načtení stavu
        await this.ensureStateLoaded(roomId);

        // Odešleme klientovi synchronizovaný stav (s ohledem na bezpečný blur)
        this.sendStateToSocket(server, attachment);

        // Oznámíme ostatním nového uživatele v místnosti
        this.broadcastPresence();
      } catch (err: any) {
        console.error(`Chyba při načítání stavu místnosti ${roomId}:`, err);
        this.sendError(server, `Chyba při načítání stavu: ${err?.message || err}`);
      }

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // 2. Health & stavový endpoint
    if (url.pathname.endsWith("/health") || url.pathname.endsWith("/status")) {
      const activeSockets = this.ctx.getWebSockets();
      return new Response(
        JSON.stringify({
          status: "ok",
          activeConnections: activeSockets.length,
          roomId,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Not found", { status: 404 });
  }

  /**
   * Příchozí WebSocket zpráva od klienta (vyvoláno automaticky z Hibernation API)
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;

    try {
      const parsed = JSON.parse(message);
      const validation = ClientMessageSchema.safeParse(parsed);

      if (!validation.success) {
        this.sendError(ws, "Neplatný formát zprávy");
        return;
      }

      const clientMsg = validation.data;
      const attachment = ws.deserializeAttachment() as SocketAttachment;

      // Aktualizujeme čas poslední aktivity socketu
      if (attachment) {
        attachment.lastSeen = Date.now();
        ws.serializeAttachment(attachment);
      }

      // Pokud DO proběhl hibernací a stav není v paměti, načteme ho z D1/storage
      if (!this.state) {
        const targetRoomId = attachment?.roomId || this.roomId || (await this.ctx.storage.get<string>("roomId"));
        if (targetRoomId) {
          try {
            await this.ensureStateLoaded(targetRoomId);
          } catch (e: any) {
            console.error("Chyba při obnově stavu po hibernaci:", e);
          }
        }
      }

      if (!this.state) {
        this.sendError(ws, "Místnost není inicializována");
        return;
      }

      switch (clientMsg.type) {
        case "JOIN": {
          attachment.name = clientMsg.payload.name;
          attachment.avatarColor = clientMsg.payload.avatarColor;
          attachment.isFacilitator = clientMsg.payload.isFacilitator;
          ws.serializeAttachment(attachment);
          this.broadcastPresence();
          break;
        }

        case "ADD_CARD": {
          const newCard: Card = {
            id: clientMsg.payload.id || crypto.randomUUID(),
            columnId: clientMsg.payload.columnId,
            parentCardId: null,
            authorSessionId: clientMsg.payload.isAnonymous ? "anonymous" : attachment.userId,
            authorName: clientMsg.payload.isAnonymous ? "Anonym" : attachment.name,
            content: clientMsg.payload.content.trim().slice(0, 255),
            sortOrder: this.state.cards.length,
            createdAt: new Date().toISOString(),
          };

          this.state.cards.push(newCard);
          this.broadcastState();
          this.scheduleD1Flush();
          break;
        }

        case "UPDATE_CARD": {
          const card = this.state.cards.find((c) => c.id === clientMsg.payload.cardId);
          if (!card) {
            this.sendError(ws, "Karta nenalezena");
            return;
          }
          // Pouze autor nebo facilitátor může upravit kartu
          if (card.authorSessionId !== attachment.userId && !attachment.isFacilitator) {
            this.sendError(ws, "Nemáte oprávnění upravit tuto kartu");
            return;
          }
          card.content = clientMsg.payload.content.trim().slice(0, 255);
          this.broadcastState();
          this.scheduleD1Flush();
          break;
        }

        case "DELETE_CARD": {
          const cardIndex = this.state.cards.findIndex((c) => c.id === clientMsg.payload.cardId);
          if (cardIndex === -1) return;

          const card = this.state.cards[cardIndex];
          if (card.authorSessionId !== attachment.userId && !attachment.isFacilitator) {
            this.sendError(ws, "Nemáte oprávnění smazat tuto kartu");
            return;
          }

          const deletedId = card.id;
          // Pokud měla karta seskupené podkarty, uvolníme je, aby nezmizely
          this.state.cards.forEach((c) => {
            if (c.parentCardId === deletedId) {
              c.parentCardId = null;
            }
          });

          // Odstraníme kartu a její hlasy
          this.state.cards.splice(cardIndex, 1);
          this.state.votes = this.state.votes.filter((v) => v.cardId !== deletedId);

          this.broadcastState();

          // Okamžité vymazání z D1 (zabrání znovuoživení po probuzení z hibernace)
          try {
            const db = createDb(this.env.DB);
            await db.delete(votes).where(eq(votes.cardId, deletedId));
            await db.delete(cards).where(eq(cards.id, deletedId));
          } catch (d1Err) {
            console.error(`Chyba při okamžitém mazání karty ${deletedId} z D1:`, d1Err);
          }

          this.scheduleD1Flush();
          break;
        }

        case "MOVE_CARD": {
          const card = this.state.cards.find((c) => c.id === clientMsg.payload.cardId);
          if (card) {
            // Pokud byla karta podkartou a je přesunuta do jiného sloupce, oddělí se ze skupiny
            if (card.parentCardId && card.columnId !== clientMsg.payload.targetColumnId) {
              card.parentCardId = null;
            }
            card.columnId = clientMsg.payload.targetColumnId;
            card.sortOrder = clientMsg.payload.newSortOrder;

            // Pokud má karta podřízené karty, přesuneme je do stejného sloupce
            this.state.cards.forEach((c) => {
              if (c.parentCardId === card.id) {
                c.columnId = clientMsg.payload.targetColumnId;
              }
            });

            this.broadcastState();
            this.scheduleD1Flush();
          }
          break;
        }

        case "GROUP_CARDS": {
          // Sloučení jedné karty pod druhou (seskupení myšlenek)
          const source = this.state.cards.find((c) => c.id === clientMsg.payload.sourceCardId);
          const target = this.state.cards.find((c) => c.id === clientMsg.payload.targetCardId);
          if (source && target && source.id !== target.id) {
            // Pokud je cílová karta už sama podkartou, spojíme se s její hlavní mateřskou kartou
            const rootTargetId = target.parentCardId || target.id;
            if (source.id !== rootTargetId) {
              source.parentCardId = rootTargetId;
              source.columnId = target.columnId;

              // Pokud měl zdroj potomky, přesuneme je do stejné mateřské skupiny
              this.state.cards.forEach((c) => {
                if (c.parentCardId === source.id) {
                  c.parentCardId = rootTargetId;
                  c.columnId = target.columnId;
                }
              });

              this.broadcastState();
              this.scheduleD1Flush();
            }
          }
          break;
        }

        case "UNGROUP_CARD": {
          const card = this.state.cards.find((c) => c.id === clientMsg.payload.cardId);
          if (card) {
            card.parentCardId = null;
            this.broadcastState();
            this.scheduleD1Flush();
          }
          break;
        }

        case "CAST_VOTE": {
          const voteType = clientMsg.payload.voteType || "UP";
          const existingVoteIndex = this.state.votes.findIndex(
            (v) =>
              v.cardId === clientMsg.payload.cardId &&
              v.userSessionId === attachment.userId
          );

          if (existingVoteIndex !== -1) {
            const existing = this.state.votes[existingVoteIndex];
            if ((existing.voteType || "UP") === voteType) {
              return;
            } else {
              existing.voteType = voteType;
              this.broadcastState();
              this.scheduleD1Flush();
              return;
            }
          }

          // Atomická kontrola limitu hlasů na serveru
          const currentVotes = this.state.votes.filter(
            (v) => v.userSessionId === attachment.userId
          );

          if (currentVotes.length >= this.state.maxVotesPerUser) {
            this.sendError(ws, `Vyčerpali jste limit ${this.state.maxVotesPerUser} hlasů.`);
            return;
          }

          const newVote: Vote = {
            id: crypto.randomUUID(),
            cardId: clientMsg.payload.cardId,
            userSessionId: attachment.userId,
            voteType: voteType,
            createdAt: new Date().toISOString(),
          };

          this.state.votes.push(newVote);
          this.broadcastState();
          this.scheduleD1Flush();
          break;
        }

        case "REMOVE_VOTE": {
          const voteIndex = this.state.votes.findIndex(
            (v) =>
              v.cardId === clientMsg.payload.cardId &&
              v.userSessionId === attachment.userId &&
              (!clientMsg.payload.voteType || (v.voteType || "UP") === clientMsg.payload.voteType)
          );

          if (voteIndex !== -1) {
            const removedVote = this.state.votes[voteIndex];
            this.state.votes.splice(voteIndex, 1);
            this.broadcastState();

            try {
              const db = createDb(this.env.DB);
              await db.delete(votes).where(eq(votes.id, removedVote.id));
            } catch (err) {
              console.error("Chyba při okamžitém mazání hlasu z D1:", err);
            }

            this.scheduleD1Flush();
          }
          break;
        }

        case "SET_PHASE": {
          this.state.phase = clientMsg.payload.phase;
          // Pokud přecházíme z brainstormingu do čtení nebo hlasování, automaticky odemkneme karty
          if (clientMsg.payload.phase !== "BRAINSTORMING") {
            this.state.cardsBlurred = false;
          }
          this.broadcastState();
          this.scheduleD1Flush();
          break;
        }

        case "TOGGLE_BLUR": {
          this.state.cardsBlurred = clientMsg.payload.blurred;
          this.broadcastState();
          this.scheduleD1Flush();
          break;
        }

        case "TIMER_CONTROL": {
          const action = clientMsg.payload.action;
          const duration = clientMsg.payload.durationSecs || this.state.timerDurationSecs || 300;

          if (action === "START") {
            this.state.timerDurationSecs = duration;
            this.state.timerEndsAt = Date.now() + duration * 1000;
          } else if (action === "PAUSE" || action === "RESET") {
            this.state.timerEndsAt = null;
          } else if (action === "ADD_MINUTE") {
            if (this.state.timerEndsAt) {
              this.state.timerEndsAt += 60 * 1000;
            } else {
              this.state.timerEndsAt = Date.now() + 60 * 1000;
            }
          }

          this.broadcastState();
          this.scheduleD1Flush();
          break;
        }

        case "ADD_ACTION_ITEM": {
          const item: ActionItem = {
            id: crypto.randomUUID(),
            retrospectiveId: this.state.id,
            text: clientMsg.payload.text.trim(),
            assignee: clientMsg.payload.assignee,
            status: "OPEN",
            dueDate: clientMsg.payload.dueDate,
            createdAt: new Date().toISOString(),
          };
          this.state.actionItems.push(item);
          this.broadcastState();
          this.scheduleD1Flush();
          break;
        }

        case "UPDATE_ACTION_ITEM": {
          const item = this.state.actionItems.find((a) => a.id === clientMsg.payload.id);
          if (item) {
            item.status = clientMsg.payload.status;
            this.broadcastState();
            this.scheduleD1Flush();
          }
          break;
        }

        case "TYPING_STATUS": {
          const newColumnId = clientMsg.payload.isTyping
            ? clientMsg.payload.columnId
            : undefined;

          // Broadcast přítomnosti provádíme pouze tehdy, pokud se stav psaní pro daného uživatele změnil
          if (attachment.typingColumnId !== newColumnId) {
            attachment.typingColumnId = newColumnId;
            ws.serializeAttachment(attachment);
            this.broadcastPresence();
          }
          break;
        }

        case "CLEANUP_PRESENCE": {
          // Automatické/vyžádané pročištění: ukončíme pouze neaktivní zombie spojení (> 15 minut)
          // a uzavřená spojení, aniž bychom odpojovali živé účastníky (i v pozadí prohlížeče)
          const sockets = this.ctx.getWebSockets();
          const now = Date.now();
          const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

          for (const s of sockets) {
            if (s === ws) continue;

            if (s.readyState !== 1) {
              try {
                s.close();
              } catch {}
              continue;
            }

            try {
              const att = s.deserializeAttachment() as SocketAttachment;
              if (att && att.lastSeen && now - att.lastSeen > INACTIVITY_TIMEOUT_MS) {
                try {
                  s.close(4000, "Presence cleanup: Inactivity timeout");
                } catch {}
              }
            } catch {}
          }
          this.schedulePresenceBroadcast(10000);
          break;
        }
      }
    } catch (err: any) {
      this.sendError(ws, "Chyba při zpracování zprávy: " + err.message);
    }
  }

  /**
   * Klient se odpojil (vyvoláno z Hibernation API)
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Odložíme broadcast přítomnosti o 10s, aby při F5 nebo krátkém reconnectu počet lidí necukal (např. 4 -> 3 -> 4)
    this.schedulePresenceBroadcast(10000);
    const remaining = this.ctx.getWebSockets().filter((s) => s !== ws && s.readyState === 1);
    if (remaining.length === 0 && (this.isDirty || this.persistTimeout)) {
      if (this.persistTimeout) {
        clearTimeout(this.persistTimeout);
        this.persistTimeout = null;
      }
      // Poslední klient se odpojil a existují neuložené změny - okamžitě uložíme stav do D1, než DO usne
      this.ctx.waitUntil(this.flushToD1());
    }
  }

  /**
   * Chyba WebSocket spojení
   */
  async webSocketError(ws: WebSocket, error: any) {
    this.schedulePresenceBroadcast(10000);
  }

  /**
   * Odeslání stavu jednomu konkrétnímu klientovi
   */
  private sendStateToSocket(ws: WebSocket, _attachment: SocketAttachment) {
    if (!this.state) return;

    const clientState: RetrospectiveState = {
      ...this.state,
      cardsBlurred: false,
    };

    const msg: ServerMessage = {
      type: "SYNC_STATE",
      payload: clientState,
    };

    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Socket může být v procesu uzavírání
    }
  }

  /**
   * Broadcast stavu všem aktivním připojeným klientům
   */
  private broadcastState() {
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as SocketAttachment;
      this.sendStateToSocket(ws, attachment);
    }
  }

  /**
   * Naplánuje odložený broadcast přítomnosti (zabraňuje blikání počtu lidí při krátkém výpadku/F5)
   */
  private schedulePresenceBroadcast(delayMs = 10000) {
    if (this.presenceBroadcastTimeout) {
      return;
    }
    this.presenceBroadcastTimeout = setTimeout(() => {
      this.presenceBroadcastTimeout = null;
      this.broadcastPresence();
    }, delayMs);
  }

  /**
   * Broadcast seznamu přítomných a indikátorů psaní
   */
  private broadcastPresence() {
    if (this.presenceBroadcastTimeout) {
      clearTimeout(this.presenceBroadcastTimeout);
      this.presenceBroadcastTimeout = null;
    }
    const sockets = this.ctx.getWebSockets();
    const userMap = new Map<string, UserSession>();
    const typingUsers: Array<{ userId: string; columnId?: string }> = [];
    const now = Date.now();
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

    for (const ws of sockets) {
      // Filtrujeme pouze aktivní otevřená spojení
      if (ws.readyState !== 1) {
        continue;
      }

      const att = ws.deserializeAttachment() as SocketAttachment;
      if (att && att.userId) {
        // Kontrola nečinnosti: pokud je spojení neaktivní déle než časový limit, vynecháme ze zobrazení
        if (att.lastSeen && now - att.lastSeen > INACTIVITY_TIMEOUT_MS) {
          continue;
        }

        // Deduplikace podle userId - každý uživatel se v seznamu objeví pouze jednou!
        userMap.set(att.userId, {
          id: att.userId,
          name: att.name,
          avatarColor: att.avatarColor,
          isAnonymous: false,
          isFacilitator: att.isFacilitator,
        });

        if (att.typingColumnId) {
          typingUsers.push({ userId: att.userId, columnId: att.typingColumnId });
        }
      }
    }

    const users = Array.from(userMap.values());
    const msg: ServerMessage = {
      type: "PRESENCE_UPDATE",
      payload: {
        users,
        typingUsers,
      },
    };

    const payloadStr = JSON.stringify(msg);
    for (const ws of sockets) {
      if (ws.readyState === 1) {
        try {
          ws.send(payloadStr);
        } catch {}
      }
    }
  }

  private sendError(ws: WebSocket, message: string) {
    const msg: ServerMessage = {
      type: "ERROR",
      payload: { message },
    };
    try {
      ws.send(JSON.stringify(msg));
    } catch {}
  }

  /**
   * Debounced synchronizace stavu tabule do centrální D1 databáze
   */
  private scheduleD1Flush() {
    this.isDirty = true;
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }

    this.persistTimeout = setTimeout(async () => {
      this.persistTimeout = null;
      this.ctx.waitUntil(this.flushToD1());
    }, 2000);
  }

  /**
   * Uloží aktuální stav místnosti z paměti do Cloudflare D1 (pouze skutečné změny)
   */
  private async flushToD1() {
    if (!this.state || !this.isDirty || this.isFlushing) return;

    this.isFlushing = true;
    this.isDirty = false;

    try {
      const db = createDb(this.env.DB);

      // 1. Update základních metadat retrospektivy
      await db
        .update(retrospectives)
        .set({
          phase: this.state.phase,
          cardsBlurred: this.state.cardsBlurred,
          timerEndsAt: this.state.timerEndsAt,
          maxVotesPerUser: this.state.maxVotesPerUser,
        })
        .where(eq(retrospectives.id, this.state.id));

      // 2. Synchronizace karet a hlasů
      const columnIds = this.state.columns.map((c) => c.id);

      if (columnIds.length > 0) {
        // A. Získáme pouze karty této retrospektivy, které jsou aktuálně v D1
        const retroDbCards = await db
          .select()
          .from(cards)
          .where(inArray(cards.columnId, columnIds));
        const dbCardsMap = new Map(retroDbCards.map((c) => [c.id, c]));
        const currentCardIds = new Set(this.state.cards.map((c) => c.id));

        // B. Smažeme z D1 všechny karty (a jejich hlasy), které byly smazány v aplikaci
        const cardsToDelete = retroDbCards.filter((c) => !currentCardIds.has(c.id));
        for (const cardToDelete of cardsToDelete) {
          try {
            await db.delete(votes).where(eq(votes.cardId, cardToDelete.id));
            await db.delete(cards).where(eq(cards.id, cardToDelete.id));
          } catch (e) {
            console.error(`Chyba při mazání karty ${cardToDelete.id} z D1:`, e);
          }
        }

        // C. Uložíme pouze nové nebo skutečně změněné karty
        for (const card of this.state.cards) {
          const existing = dbCardsMap.get(card.id);
          if (
            existing &&
            existing.columnId === card.columnId &&
            (existing.parentCardId ?? null) === (card.parentCardId ?? null) &&
            existing.content === card.content &&
            existing.sortOrder === card.sortOrder
          ) {
            continue;
          }

          await db
            .insert(cards)
            .values({
              id: card.id,
              columnId: card.columnId,
              parentCardId: card.parentCardId,
              authorSessionId: card.authorSessionId,
              authorName: card.authorName,
              content: card.content,
              color: card.color,
              sortOrder: card.sortOrder,
              createdAt: card.createdAt,
            })
            .onConflictDoUpdate({
              target: cards.id,
              set: {
                columnId: card.columnId,
                parentCardId: card.parentCardId,
                content: card.content,
                sortOrder: card.sortOrder,
              },
            });
        }

        // D. Synchronizace hlasů pouze pro tuto retrospektivu
        const retroDbVotes = await db
          .select({
            id: votes.id,
            cardId: votes.cardId,
            userSessionId: votes.userSessionId,
            voteType: votes.voteType,
            createdAt: votes.createdAt,
          })
          .from(votes)
          .innerJoin(cards, eq(votes.cardId, cards.id))
          .where(inArray(cards.columnId, columnIds));
        const dbVotesMap = new Map(retroDbVotes.map((v) => [v.id, v]));
        const currentVoteIds = new Set(this.state.votes.map((v) => v.id));

        // Smazat odebrané hlasy
        const votesToDelete = retroDbVotes.filter((v) => !currentVoteIds.has(v.id));
        for (const v of votesToDelete) {
          try {
            await db.delete(votes).where(eq(votes.id, v.id));
          } catch (e) {
            console.error(`Chyba při mazání hlasu ${v.id} z D1:`, e);
          }
        }

        // Vložit pouze nové nebo změněné hlasy
        for (const vote of this.state.votes) {
          const existing = dbVotesMap.get(vote.id);
          const normalizedType = vote.voteType || "UP";
          if (existing && (existing.voteType || "UP") === normalizedType) {
            continue;
          }

          await db
            .insert(votes)
            .values({
              id: vote.id,
              cardId: vote.cardId,
              userSessionId: vote.userSessionId,
              voteType: normalizedType,
              createdAt: vote.createdAt,
            })
            .onConflictDoUpdate({
              target: votes.id,
              set: {
                voteType: normalizedType,
              },
            });
        }
      }

      // 3. Synchronizace úkolů (Action items)
      const dbActionItems = await db
        .select()
        .from(actionItems)
        .where(eq(actionItems.retrospectiveId, this.state.id));
      const dbActionItemsMap = new Map(dbActionItems.map((a) => [a.id, a]));
      const currentActionItemIds = new Set(this.state.actionItems.map((a) => a.id));

      // Smazat odebrané akční úkoly
      const actionItemsToDelete = dbActionItems.filter((a) => !currentActionItemIds.has(a.id));
      for (const item of actionItemsToDelete) {
        try {
          await db.delete(actionItems).where(eq(actionItems.id, item.id));
        } catch (e) {
          console.error(`Chyba při mazání akčního úkolu ${item.id} z D1:`, e);
        }
      }

      // Vložit / aktualizovat pouze nové nebo změněné úkoly
      for (const item of this.state.actionItems) {
        const existing = dbActionItemsMap.get(item.id);
        if (
          existing &&
          existing.text === item.text &&
          (existing.assignee ?? null) === (item.assignee ?? null) &&
          existing.status === item.status &&
          (existing.dueDate ?? null) === (item.dueDate ?? null)
        ) {
          continue;
        }

        await db
          .insert(actionItems)
          .values({
            id: item.id,
            retrospectiveId: item.retrospectiveId,
            text: item.text,
            assignee: item.assignee,
            status: item.status,
            dueDate: item.dueDate,
            createdAt: item.createdAt,
          })
          .onConflictDoUpdate({
            target: actionItems.id,
            set: {
              text: item.text,
              assignee: item.assignee,
              status: item.status,
              dueDate: item.dueDate,
            },
          });
      }
    } catch (err) {
      console.error("Chyba při ukládání snapshotu do D1:", err);
    } finally {
      this.isFlushing = false;
    }
  }
}
