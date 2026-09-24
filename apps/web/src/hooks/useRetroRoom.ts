import { useState, useEffect, useRef, useCallback } from "react";
import type {
  RetrospectiveState,
  UserSession,
  ClientMessage,
  ServerMessage,
  RetroPhase,
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

  const connect = useCallback(() => {
    if (!roomId) return;

    // Uzavřít stávající spojení
    if (socketRef.current) {
      socketRef.current.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/room/${roomId}?userId=${encodeURIComponent(
      user.id
    )}&userName=${encodeURIComponent(user.name)}&avatarColor=${encodeURIComponent(
      user.avatarColor
    )}&isFacilitator=${user.isFacilitator}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setLastError(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "SYNC_STATE":
            setState(msg.payload);
            break;

          case "PRESENCE_UPDATE":
            setOnlineUsers(msg.payload.users);
            setTypingUsers(msg.payload.typingUsers);
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

  // Odesílání typovaných zpráv na server
  const sendMessage = useCallback((msg: ClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Pomocné akce pro komponenty
  const addCard = useCallback(
    (columnId: string, content: string, isAnonymous: boolean = false) => {
      sendMessage({
        type: "ADD_CARD",
        payload: { columnId, content, isAnonymous },
      });
    },
    [sendMessage]
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
      sendMessage({
        type: "DELETE_CARD",
        payload: { cardId },
      });
    },
    [sendMessage]
  );

  const castVote = useCallback(
    (cardId: string) => {
      sendMessage({
        type: "CAST_VOTE",
        payload: { cardId },
      });
    },
    [sendMessage]
  );

  const removeVote = useCallback(
    (cardId: string) => {
      sendMessage({
        type: "REMOVE_VOTE",
        payload: { cardId },
      });
    },
    [sendMessage]
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
    (action: "START" | "PAUSE" | "RESET" | "ADD_MINUTE", durationSecs?: number) => {
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
    castVote,
    removeVote,
    setPhase,
    toggleBlur,
    controlTimer,
    setTyping,
  };
}
