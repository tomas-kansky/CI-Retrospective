import { useState, useEffect, useRef, useCallback } from "react";
import type {
  RetrospectiveState,
  UserSession,
  ClientMessage,
  ServerMessage,
  RetroPhase,
  Card,
} from "@ci-retro/types";

export interface UseRetroRoomOptions {
  roomId: string;
  user: UserSession;
}

export function useRetroRoom({ roomId, user }: UseRetroRoomOptions) {
  const [state, setState] = useState<RetrospectiveState | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<UserSession[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; columnId?: string }>>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const messageQueueRef = useRef<ClientMessage[]>([]);

  const connect = useCallback(() => {
    if (!roomId) return;

    // Uzavřít stávající spojení
    if (socketRef.current) {
      socketRef.current.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/room/${roomId}?roomId=${encodeURIComponent(
      roomId
    )}&userId=${encodeURIComponent(user.id)}&userName=${encodeURIComponent(
      user.name
    )}&avatarColor=${encodeURIComponent(user.avatarColor)}&isFacilitator=${user.isFacilitator !== false}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setLastError(null);

      // Odeslat případné čekající zprávy nahromaděné během reconnectu
      while (messageQueueRef.current.length > 0) {
        const queued = messageQueueRef.current.shift();
        if (queued && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(queued));
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "SYNC_STATE":
            setState((prev) => {
              if (!prev) return msg.payload;
              // Zachováme lokální optimistické karty, které server ještě nestihl propsat
              const serverCardIds = new Set(msg.payload.cards.map((c) => c.id));
              const pendingLocalCards = prev.cards.filter(
                (c) => c.authorSessionId === user.id && !serverCardIds.has(c.id)
              );
              return {
                ...msg.payload,
                cards: [...msg.payload.cards, ...pendingLocalCards],
              };
            });
            break;

          case "PRESENCE_UPDATE":
            setOnlineUsers((prev) => {
              if (
                prev.length === msg.payload.users.length &&
                prev.every((u, i) => u.id === msg.payload.users[i]?.id && u.name === msg.payload.users[i]?.name)
              ) {
                return prev;
              }
              return msg.payload.users;
            });
            setTypingUsers((prev) => {
              if (
                prev.length === msg.payload.typingUsers.length &&
                prev.every(
                  (t, i) =>
                    t.userId === msg.payload.typingUsers[i]?.userId &&
                    t.columnId === msg.payload.typingUsers[i]?.columnId
                )
              ) {
                return prev;
              }
              return msg.payload.typingUsers;
            });
            break;

          case "STATE_PATCH":
            setState((prev) => (prev ? { ...prev, ...msg.payload } : null));
            break;

          case "ERROR":
            setLastError(msg.payload.message);
            // Automaticky vyčistit chybovou hlášku po 4 sekundách
            setTimeout(() => setLastError(null), 4000);
            break;
        }
      } catch (err) {
        console.error("Chyba při čtení WS zprávy:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Automatický reconnect po 2 sekundách
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn("WebSocket chyba:", err);
      ws.close();
    };
  }, [roomId, user.id, user.name, user.avatarColor, user.isFacilitator]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  // Odesílání typovaných zpráv na server s podporou offline fronty
  const sendMessage = useCallback((msg: ClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    } else {
      // Pokud socket není právě otevřen (např. při reconnectu), zařadíme zprávu do fronty
      messageQueueRef.current.push(msg);
    }
  }, []);

  // Pomocné akce pro komponenty
  const addCard = useCallback(
    (columnId: string, content: string, isAnonymous: boolean = false) => {
      const cardId = crypto.randomUUID();
      const optimisticCard: Card = {
        id: cardId,
        columnId,
        parentCardId: null,
        authorSessionId: isAnonymous ? "anonymous" : user.id,
        authorName: isAnonymous ? "Anonym" : user.name,
        content: content.trim(),
        sortOrder: state?.cards?.length || 0,
        createdAt: new Date().toISOString(),
      };

      // Okamžitá optimistická aktualizace pro nulovou prodlevu v UI
      setState((prev) => (prev ? { ...prev, cards: [...prev.cards, optimisticCard] } : null));

      sendMessage({
        type: "ADD_CARD",
        payload: { id: cardId, columnId, content, isAnonymous },
      });
    },
    [sendMessage, user.id, user.name, state?.cards?.length]
  );

  const updateCard = useCallback(
    (cardId: string, content: string) => {
      sendMessage({
        type: "UPDATE_CARD",
        payload: { cardId, content },
      });
    },
    [sendMessage]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      // Optimistické smazání z UI
      setState((prev) => (prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : null));

      sendMessage({
        type: "DELETE_CARD",
        payload: { cardId },
      });
    },
    [sendMessage]
  );

  const castVote = useCallback(
    (cardId: string, voteType: "UP" | "DOWN" = "UP") => {
      // Optimistická aktualizace v UI
      setState((prev) => {
        if (!prev) return null;
        const existingIdx = prev.votes.findIndex(
          (v) => v.cardId === cardId && v.userSessionId === user.id
        );
        if (existingIdx !== -1) {
          const updated = [...prev.votes];
          updated[existingIdx] = {
            ...updated[existingIdx],
            voteType,
          };
          return { ...prev, votes: updated };
        }
        const userVotesCount = prev.votes.filter((v) => v.userSessionId === user.id).length;
        if (userVotesCount >= (prev.maxVotesPerUser || 5)) return prev;

        return {
          ...prev,
          votes: [
            ...prev.votes,
            {
              id: "temp-vote-" + Date.now(),
              cardId,
              userSessionId: user.id,
              voteType,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });

      sendMessage({
        type: "CAST_VOTE",
        payload: { cardId, voteType },
      });
    },
    [sendMessage, user.id]
  );

  const removeVote = useCallback(
    (cardId: string, voteType?: "UP" | "DOWN") => {
      // Optimistická aktualizace v UI
      setState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          votes: prev.votes.filter(
            (v) =>
              !(
                v.cardId === cardId &&
                v.userSessionId === user.id &&
                (!voteType || (v.voteType || "UP") === voteType)
              )
          ),
        };
      });

      sendMessage({
        type: "REMOVE_VOTE",
        payload: { cardId, voteType },
      });
    },
    [sendMessage, user.id]
  );

  const setPhase = useCallback(
    (phase: RetroPhase) => {
      sendMessage({
        type: "SET_PHASE",
        payload: { phase },
      });
    },
    [sendMessage]
  );

  const toggleBlur = useCallback(
    (blurred: boolean) => {
      sendMessage({
        type: "TOGGLE_BLUR",
        payload: { blurred },
      });
    },
    [sendMessage]
  );

  const controlTimer = useCallback(
    (action: "START" | "PAUSE" | "RESET" | "ADD_MINUTE", durationSecs: number = 300) => {
      // Optimistická aktualizace odpočtu
      setState((prev) => {
        if (!prev) return null;
        let newEndsAt: number | null = prev.timerEndsAt;
        if (action === "START") {
          newEndsAt = Date.now() + durationSecs * 1000;
        } else if (action === "PAUSE" || action === "RESET") {
          newEndsAt = null;
        } else if (action === "ADD_MINUTE") {
          newEndsAt = (newEndsAt || Date.now()) + 60 * 1000;
        }

        return {
          ...prev,
          timerDurationSecs: durationSecs,
          timerEndsAt: newEndsAt,
        };
      });

      sendMessage({
        type: "TIMER_CONTROL",
        payload: { action, durationSecs },
      });
    },
    [sendMessage]
  );

  const setTyping = useCallback(
    (columnId?: string, isTyping: boolean = true) => {
      sendMessage({
        type: "TYPING_STATUS",
        payload: { columnId, isTyping },
      });
    },
    [sendMessage]
  );

  const moveCard = useCallback(
    (cardId: string, targetColumnId: string, newSortOrder: number) => {
      // Optimistická lokální aktualizace pro okamžitou plynulost v UI
      setState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          cards: prev.cards.map((c) =>
            c.id === cardId
              ? { ...c, columnId: targetColumnId, sortOrder: newSortOrder, parentCardId: null }
              : c.parentCardId === cardId
              ? { ...c, columnId: targetColumnId }
              : c
          ),
        };
      });

      sendMessage({
        type: "MOVE_CARD",
        payload: { cardId, targetColumnId, newSortOrder },
      });
    },
    [sendMessage]
  );

  const groupCards = useCallback(
    (sourceCardId: string, targetCardId: string) => {
      // Optimistická lokální aktualizace sloučení karet
      setState((prev) => {
        if (!prev) return null;
        const target = prev.cards.find((c) => c.id === targetCardId);
        const source = prev.cards.find((c) => c.id === sourceCardId);
        if (!target || !source || source.id === target.id) return prev;

        const rootTargetId = target.parentCardId || target.id;
        if (source.id === rootTargetId) return prev;

        return {
          ...prev,
          cards: prev.cards.map((c) => {
            if (c.id === sourceCardId || c.parentCardId === sourceCardId) {
              return { ...c, parentCardId: rootTargetId, columnId: target.columnId };
            }
            return c;
          }),
        };
      });

      sendMessage({
        type: "GROUP_CARDS",
        payload: { sourceCardId, targetCardId },
      });
    },
    [sendMessage]
  );

  const ungroupCard = useCallback(
    (cardId: string) => {
      // Optimistické oddělení karty ze skupiny
      setState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          cards: prev.cards.map((c) => (c.id === cardId ? { ...c, parentCardId: null } : c)),
        };
      });

      sendMessage({
        type: "UNGROUP_CARD",
        payload: { cardId },
      });
    },
    [sendMessage]
  );

  const addActionItem = useCallback(
    (text: string, assignee?: string, dueDate?: string) => {
      sendMessage({
        type: "ADD_ACTION_ITEM",
        payload: { text, assignee, dueDate },
      });
    },
    [sendMessage]
  );

  const updateActionItem = useCallback(
    (id: string, status: "OPEN" | "IN_PROGRESS" | "DONE") => {
      sendMessage({
        type: "UPDATE_ACTION_ITEM",
        payload: { id, status },
      });
    },
    [sendMessage]
  );

  const cleanupPresence = useCallback(() => {
    sendMessage({
      type: "CLEANUP_PRESENCE",
    });
  }, [sendMessage]);

  // Automatické obnovování přítomnosti / pročištění zaseknutých relací každé 3 minuty
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupPresence();
    }, 3 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        cleanupPresence();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [cleanupPresence]);

  // Spočítat zbývající hlasy pro aktuálního uživatele
  const userVotesCount = state?.votes.filter((v) => v.userSessionId === user.id).length || 0;
  const remainingVotes = Math.max(0, (state?.maxVotesPerUser || 5) - userVotesCount);

  return {
    state,
    onlineUsers,
    typingUsers,
    isConnected,
    lastError,
    remainingVotes,
    userVotesCount,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    groupCards,
    ungroupCard,
    castVote,
    removeVote,
    setPhase,
    toggleBlur,
    controlTimer,
    setTyping,
    addActionItem,
    updateActionItem,
    cleanupPresence,
  };
}
