import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
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
}

interface SocketAttachment {
  roomId?: string;
  userId: string;
  name: string;
  avatarColor: string;
  isFacilitator: boolean;
  typingColumnId?: string;
}

export class RetroRoom extends DurableObject<Env> {
  private state: RetrospectiveState | null = null;
  private isLoadedFromDb = false;
  private persistTimeout: any = null;
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
      const dbCards = await db.select().from(cards);
      const filteredCards = dbCards.filter((c) => columnIds.includes(c.columnId));
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

      const cardIds = loadedCards.map((c) => c.id);
      if (cardIds.length > 0) {
        const dbVotes = await db.select().from(votes);
        const filteredVotes = dbVotes.filter((v) => cardIds.includes(v.cardId));
        loadedVotes = filteredVotes.map((v) => ({
          id: v.id,
          cardId: v.cardId,
          userSessionId: v.userSessionId,
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
      const isFacilitator = url.searchParams.get("isFacilitator") === "true";

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Použití WebSocket Hibernation API: Cloudflare uspí DO při nečinnosti!
      const attachment: SocketAttachment = {
        roomId,
        userId,
        name: userName,
        avatarColor,
        isFacilitator,
      };

      // Uzavřeme jakákoliv předchozí otevřená spojení se stejným userId (zamezí zaseknutým duplikátům)
      try {
        const oldSockets = this.ctx.getWebSockets(userId);
        for (const oldWs of oldSockets) {
          try {
            oldWs.close(1000, "Replaced by newer connection");
          } catch {}
        }
      } catch {}

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
            id: crypto.randomUUID(),
            columnId: clientMsg.payload.columnId,
            parentCardId: null,
            authorSessionId: clientMsg.payload.isAnonymous ? "anonymous" : attachment.userId,
            authorName: clientMsg.payload.isAnonymous ? "Anonym" : attachment.name,
            content: clientMsg.payload.content.trim(),
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
          card.content = clientMsg.payload.content.trim();
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
              v.userSessionId === attachment.userId
          );

          if (voteIndex !== -1) {
            this.state.votes.splice(voteIndex, 1);
            this.broadcastState();
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
          attachment.typingColumnId = clientMsg.payload.isTyping
            ? clientMsg.payload.columnId
            : undefined;
          ws.serializeAttachment(attachment);
          this.broadcastPresence();
          break;
        }

        case "CLEANUP_PRESENCE": {
          // Uzavřeme všechna ostatní spojení, čímž pročistíme zombie/zaseknutá spojení
          // Živé prohlížeče se automaticky znovu připojí do 2 sekund
          const sockets = this.ctx.getWebSockets();
          for (const s of sockets) {
            if (s !== ws) {
              try {
                s.close(4001, "Presence cleanup");
              } catch {}
            }
          }
          this.broadcastPresence();
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
    this.broadcastPresence();
  }

  /**
   * Chyba WebSocket spojení
   */
  async webSocketError(ws: WebSocket, error: any) {
    this.broadcastPresence();
  }

  /**
   * Odeslání stavu jednomu konkrétnímu klientovi s BEZPEČNÝM SERVER-SIDE MASKOGRAMEM (Blur)
   */
  private sendStateToSocket(ws: WebSocket, attachment: SocketAttachment) {
    if (!this.state) return;

    // Bezpečný server-side blur: Pokud je aktivní fáze BRAINSTORMING a karty jsou maskované,
    // cizí uživatelé obdrží zamaskovaný obsah, aby jej nemohli vyčíst v DevTools!
    const isMasked = this.state.cardsBlurred && this.state.phase === "BRAINSTORMING";

    const sanitizedCards = this.state.cards.map((c) => {
      if (isMasked && c.authorSessionId !== attachment.userId) {
        return {
          ...c,
          content: "••••••••••••", // Bezpečné maskování na straně serveru
        };
      }
      return c;
    });

    const clientState: RetrospectiveState = {
      ...this.state,
      cards: sanitizedCards,
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
   * Broadcast seznamu přítomných a indikátorů psaní
   */
  private broadcastPresence() {
    const sockets = this.ctx.getWebSockets();
    const userMap = new Map<string, UserSession>();
    const typingUsers: Array<{ userId: string; columnId?: string }> = [];

    for (const ws of sockets) {
      // Filtrujeme pouze aktivní otevřená spojení
      if (ws.readyState !== 1) {
        try {
          ws.close();
        } catch {}
        continue;
      }

      const att = ws.deserializeAttachment() as SocketAttachment;
      if (att && att.userId) {
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
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }

    this.persistTimeout = setTimeout(async () => {
      await this.flushToD1();
    }, 5000); // Flush do D1 po 5 sekundách klidu
  }

  /**
   * Uloží aktuální stav místnosti z paměti do Cloudflare D1
   */
  private async flushToD1() {
    if (!this.state) return;

    try {
      const db = createDb(this.env.DB);
      const now = new Date().toISOString();

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
      // Pro jednoduchost a konzistenci přepíšeme karty aktuálního stavu
      for (const card of this.state.cards) {
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

      // 3. Synchronizace úkolů (Action items)
      for (const item of this.state.actionItems) {
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
    }
  }
}
