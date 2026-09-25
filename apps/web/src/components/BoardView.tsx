import React, { useState, useEffect } from "react";
import {
  DndContext,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  ArrowLeft,
  Share2,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ThumbsUp,
  Trash2,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Users,
  Check,
  AlertCircle,
  FileDown,
  Target,
  GripVertical,
  Layers,
  Unlink,
  Sparkles,
} from "lucide-react";
import type { UserSession, RetroPhase, Card, Column } from "@ci-retro/types";
import { useRetroRoom } from "../hooks/useRetroRoom";
import { ExportModal } from "./ExportModal";
import { ActionItemsDrawer } from "./ActionItemsDrawer";
import { getRandomAnonymousName } from "../utils/names";

// Draggable & Droppable Card Component
interface DraggableCardProps {
  card: Card;
  votesCount: number;
  isVoted: boolean;
  onVote: () => void;
  onDelete: () => void;
  isMasked?: boolean;
  isChild?: boolean;
  onUngroup?: () => void;
  activeDragCardId?: string | null;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  card,
  votesCount,
  isVoted,
  onVote,
  onDelete,
  isMasked = false,
  isChild = false,
  onUngroup,
  activeDragCardId,
}) => {
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: `drag-${card.id}`,
    data: { type: "CARD", card },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `drop-${card.id}`,
    data: { type: "CARD", card },
  });

  const setNodeRef = React.useCallback(
    (node: HTMLElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef]
  );

  // Zda je nad touto kartou tažena jiná karta pro spojení
  const isDropTargetActive = isOver && !!activeDragCardId && activeDragCardId !== card.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: isChild ? "10px 12px" : "12px 14px",
        borderRadius: "var(--radius-sm)",
        background: isDropTargetActive
          ? "rgba(99, 102, 241, 0.16)"
          : isChild
          ? "rgba(255, 255, 255, 0.03)"
          : "var(--bg-secondary)",
        border: isDropTargetActive
          ? "2px dashed var(--accent-indigo)"
          : isChild
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        boxShadow: isDropTargetActive ? "0 0 16px rgba(99, 102, 241, 0.4)" : "var(--shadow-sm)",
        position: "relative",
        userSelect: "none",
        opacity: isDragging ? 0.3 : 1,
        transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {/* Vizuální indikátor pro spojení karet při najetí myší */}
      {isDropTargetActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background: "rgba(99, 102, 241, 0.22)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "var(--accent-indigo)",
            fontWeight: 700,
            fontSize: "0.85rem",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <Layers size={16} />
          <span>Pustit pro spojení myšlenek</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          title="Přetáhnout kartu (na jinou kartu pro spojení, nebo do sloupce)"
          style={{
            cursor: "grab",
            color: "var(--text-dim)",
            padding: "2px 0",
            display: "flex",
            alignItems: "center",
          }}
        >
          <GripVertical size={16} />
        </div>

        {/* Card Content with Safe Blur */}
        <p
          style={{
            flex: 1,
            fontSize: isChild ? "0.88rem" : "0.92rem",
            lineHeight: "1.45",
            margin: 0,
            wordBreak: "break-word",
            filter: isMasked ? "blur(3px)" : "none",
            userSelect: isMasked ? "none" : "text",
            opacity: isMasked ? 0.6 : 1,
          }}
        >
          {card.content}
        </p>
      </div>

      {/* Card Footer: Author + Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "6px",
          borderTop: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
          {card.authorName}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Oddělit ze skupiny (pouze u podkaret) */}
          {isChild && onUngroup && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUngroup();
              }}
              title="Oddělit kartu ze skupiny"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                padding: "3px 6px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              <Unlink size={12} />
              <span>Oddělit</span>
            </button>
          )}

          {/* Vote Button */}
          <button
            onClick={onVote}
            title={isVoted ? "Odebrat hlas" : "Hlasovat"}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              background: isVoted ? "var(--accent-indigo)" : "rgba(255, 255, 255, 0.05)",
              color: isVoted ? "#ffffff" : "var(--text-main)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.8rem",
              fontWeight: 700,
              border: "1px solid var(--border-color)",
              cursor: "pointer",
            }}
          >
            <ThumbsUp size={13} />
            <span>{votesCount}</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            title="Smazat kartu"
            style={{
              background: "transparent",
              color: "var(--text-dim)",
              padding: "4px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Droppable Column Component
interface DroppableColumnProps {
  column: Column;
  cards: Card[];
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ column, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `col-${column.id}`,
    data: { type: "COLUMN", column },
  });

  return (
    <div
      ref={setNodeRef}
      className="glass-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        background: isOver ? "rgba(99, 102, 241, 0.08)" : "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        border: isOver ? "1px solid var(--accent-indigo)" : "1px solid var(--border-color)",
        borderTop: `4px solid ${column.color}`,
        maxHeight: "calc(100vh - 180px)",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      {children}
    </div>
  );
};

// Main BoardView
interface BoardViewProps {
  roomId: string;
  user: UserSession;
  onBack: () => void;
  onUpdateUser?: (updated: UserSession) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({ roomId, user, onBack, onUpdateUser }) => {
  const {
    state,
    onlineUsers,
    typingUsers,
    isConnected,
    lastError,
    remainingVotes,
    addCard,
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
  } = useRetroRoom({ roomId, user });

  // Lokální stavy pro modály a formuláře
  const [activeNewCardColumn, setActiveNewCardColumn] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Stav pro seskupování a drag overlay
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});

  // Přítomnost a úprava jména
  const [isPresenceMenuOpen, setIsPresenceMenuOpen] = useState(false);
  const [customNameInput, setCustomNameInput] = useState(user.name);
  const [presenceToast, setPresenceToast] = useState<string | null>(null);

  // Synchronizace vstupního jména s user.name
  useEffect(() => {
    setCustomNameInput(user.name);
  }, [user.name]);

  // Deduplikace online uživatelů
  const uniqueOnlineUsers = Array.from(
    new Map(onlineUsers.map((u) => [u.id, u])).values()
  );


  const handleSaveName = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = { ...user, name: trimmed };
    if (onUpdateUser) onUpdateUser(updated);
    setPresenceToast(`Vaše jméno bylo změněno na "${trimmed}"`);
    setTimeout(() => setPresenceToast(null), 3000);
  };

  const handleRollRandomName = () => {
    const rand = getRandomAnonymousName();
    setCustomNameInput(rand);
    handleSaveName(rand);
  };

  // Modály
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isActionItemsOpen, setIsActionItemsOpen] = useState(false);

  // Synchronizovaný lokální odpočet času
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [selectedTimerDuration, setSelectedTimerDuration] = useState<number>(300);
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState("");

  // Synchronizace délky z načteného stavu
  useEffect(() => {
    if (state?.timerDurationSecs && !state.timerEndsAt) {
      setSelectedTimerDuration(state.timerDurationSecs);
    }
  }, [state?.timerDurationSecs, state?.timerEndsAt]);

  // Konfigurace pointer senzoru s minimální tolerancí pohybu (pro zamezení nechtěného dragu při kliknutí)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    if (!state?.timerEndsAt) {
      setSecondsLeft(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((state.timerEndsAt! - Date.now()) / 1000));
      setSecondsLeft(diff);

      // Zvukový signál po vypršení (Web Audio API)
      if (diff === 0) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 tón
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 1.2);
        } catch {}
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [state?.timerEndsAt]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAddCardSubmit = (columnId: string) => {
    if (!newCardText.trim()) return;
    addCard(columnId, newCardText, isAnonymous);
    setNewCardText("");
    setActiveNewCardColumn(null);
    setTyping(columnId, false);
  };

  // Vlastní detekce kolizí: upřednostňuje karty před sloupcem pod nimi
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      // 1. Zkontrolujeme, zda je kurzor přímo nad nějakou kartou (která není ta aktuálně tažená)
      const currentActiveId = args.active.id.toString().replace(/^drag-/, "");
      const cardCollision = pointerCollisions.find(
        (c) =>
          c.data?.droppableContainer?.data?.current?.type === "CARD" &&
          c.id !== `drop-${currentActiveId}`
      );
      if (cardCollision) {
        return [cardCollision];
      }

      // 2. Jinak zkontrolujeme sloupec
      const colCollision = pointerCollisions.find(
        (c) => c.data?.droppableContainer?.data?.current?.type === "COLUMN"
      );
      if (colCollision) {
        return [colCollision];
      }
      return pointerCollisions;
    }

    const rectCollisions = rectIntersection(args);
    const currentActiveId = args.active.id.toString().replace(/^drag-/, "");
    const cardRectCollision = rectCollisions.find(
      (c) =>
        c.data?.droppableContainer?.data?.current?.type === "CARD" &&
        c.id !== `drop-${currentActiveId}`
    );
    if (cardRectCollision) {
      return [cardRectCollision];
    }

    return rectCollisions;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data?.current?.card as Card | undefined;
    if (card) {
      setActiveCard(card);
    }
  };

  // Drag & drop ukončení
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !state) return;

    const draggedCard = active.data?.current?.card as Card | undefined;
    const activeCardId = draggedCard?.id || (active.id as string).replace(/^drag-/, "");
    const currentCard = state.cards.find((c) => c.id === activeCardId);
    if (!currentCard) return;

    const overData = over.data?.current;

    // 1. Přetažení přímo na jinou kartu -> sloučení myšlenek (GROUP_CARDS)
    if (overData?.type === "CARD") {
      const targetCard = overData.card as Card;
      if (targetCard && targetCard.id !== currentCard.id) {
        groupCards(currentCard.id, targetCard.id);
        const rootTargetId = targetCard.parentCardId || targetCard.id;
        setCollapsedGroupIds((prev) => ({ ...prev, [rootTargetId]: false }));
        return;
      }
    }

    // 2. Přetažení do sloupce
    let targetColumnId: string | null = null;
    if (overData?.type === "COLUMN") {
      targetColumnId = (overData.column as Column).id;
    } else if (typeof over.id === "string" && over.id.startsWith("col-")) {
      targetColumnId = over.id.replace(/^col-/, "");
    } else if (typeof over.id === "string") {
      const foundCol = state.columns.find((c) => c.id === over.id);
      if (foundCol) targetColumnId = foundCol.id;
    }

    if (targetColumnId) {
      // Pokud byla karta podkartou a uživatel ji vyhodil do sloupce, oddělíme ji ze skupiny
      if (currentCard.parentCardId) {
        ungroupCard(currentCard.id);
      }

      if (currentCard.columnId !== targetColumnId || currentCard.parentCardId) {
        const targetColumnCards = state.cards.filter(
          (c) => c.columnId === targetColumnId && !c.parentCardId
        );
        moveCard(currentCard.id, targetColumnId, targetColumnCards.length);
      }
    }
  };

  const phaseLabels: Record<RetroPhase, { title: string; color: string }> = {
    BRAINSTORMING: { title: "1. Brainstorming", color: "var(--accent-indigo)" },
    GROUPING: { title: "2. Seskupování", color: "var(--accent-cyan)" },
    VOTING: { title: "3. Hlasování", color: "var(--accent-amber)" },
    DISCUSSION: { title: "4. Diskuze & Časovač", color: "var(--accent-emerald)" },
    ACTION_ITEMS: { title: "5. Akční kroky", color: "var(--accent-rose)" },
    ARCHIVED: { title: "Uzavřeno (Archiv)", color: "var(--text-dim)" },
  };

  if (!state) {
    return (
      <div
        style={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "4px solid rgba(99, 102, 241, 0.2)",
            borderTopColor: "var(--accent-indigo)",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "var(--text-muted)" }}>
          {isConnected ? "Synchronizuji stav s Cloudflare Durable Object..." : "Připojuji k WebSockets..."}
        </p>
      </div>
    );
  }

  const getCardVotesCount = (cardId: string) => {
    return state.votes.filter((v) => v.cardId === cardId).length;
  };

  const getGroupTotalVotes = (rootCardId: string) => {
    const childIds = state.cards.filter((c) => c.parentCardId === rootCardId).map((c) => c.id);
    const allIds = [rootCardId, ...childIds];
    return state.votes.filter((v) => allIds.includes(v.cardId)).length;
  };

  const hasUserVotedOnCard = (cardId: string) => {
    return state.votes.some((v) => v.cardId === cardId && v.userSessionId === user.id);
  };

  const formatTimer = (totalSeconds: number | null) => {
    const secsToFormat = totalSeconds !== null ? totalSeconds : selectedTimerDuration;
    const mins = Math.floor(secsToFormat / 60);
    const secs = secsToFormat % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSetTimerDuration = (seconds: number) => {
    setSelectedTimerDuration(seconds);
    setIsTimerMenuOpen(false);
    if (state?.timerEndsAt) {
      controlTimer("START", seconds);
    }
  };

  const handleCustomTimerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutesInput, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      handleSetTimerDuration(mins * 60);
      setCustomMinutesInput("");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1 }}>
        {/* Sub-header / Board Control Bar */}
        <div
          style={{
            borderBottom: "1px solid var(--border-color)",
            padding: "12px 24px",
            background: "var(--bg-secondary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={onBack}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} /> Zpět
            </button>

            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                {state.title}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: phaseLabels[state.phase]?.color + "22",
                    color: phaseLabels[state.phase]?.color,
                    fontWeight: 700,
                  }}
                >
                  {phaseLabels[state.phase]?.title}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Max hlasů: {state.maxVotesPerUser}
                </span>
              </div>
            </div>
          </div>

          {/* Action Controls: Phase, Timer, Blur, Votes, Action Items, Export */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Phase Selector */}
            <select
              value={state.phase}
              onChange={(e) => setPhase(e.target.value as RetroPhase)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <option value="BRAINSTORMING">1. Brainstorming</option>
              <option value="GROUPING">2. Seskupování</option>
              <option value="VOTING">3. Hlasování</option>
              <option value="DISCUSSION">4. Diskuze & Časovač</option>
              <option value="ACTION_ITEMS">5. Akční kroky</option>
              <option value="ARCHIVED">Uzavřít retrospektivu</option>
            </select>

            {/* Mask / Blur Toggle Button */}
            <button
              onClick={() => toggleBlur(!state.cardsBlurred)}
              title="Skrýt / Odhalit text karet"
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: state.cardsBlurred ? "rgba(245, 158, 11, 0.15)" : "var(--bg-card)",
                border: `1px solid ${state.cardsBlurred ? "var(--accent-amber)" : "var(--border-color)"}`,
                color: state.cardsBlurred ? "var(--accent-amber)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {state.cardsBlurred ? <EyeOff size={15} /> : <Eye size={15} />}
              {state.cardsBlurred ? "Maskováno" : "Viditelné"}
            </button>

            {/* Synchronized Timer with Custom Duration Picker */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
              }}
            >
              {/* Duration selector toggle button */}
              <button
                type="button"
                onClick={() => setIsTimerMenuOpen(!isTimerMenuOpen)}
                title="Nastavit čas odpočtu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <Clock size={15} color="var(--accent-indigo)" />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: secondsLeft !== null && secondsLeft < 30 ? "var(--accent-rose)" : "var(--text-main)",
                  }}
                >
                  {formatTimer(secondsLeft)}
                </span>
                <ChevronDown size={13} color="var(--text-dim)" />
              </button>

              {/* Start / Pause */}
              {state.timerEndsAt ? (
                <button
                  type="button"
                  onClick={() => controlTimer("PAUSE")}
                  title="Pozastavit odpočet"
                  style={{ background: "transparent", color: "var(--accent-amber, #f59e0b)", padding: "4px", display: "flex", alignItems: "center" }}
                >
                  <Pause size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => controlTimer("START", selectedTimerDuration)}
                  title={`Spustit (${Math.floor(selectedTimerDuration / 60)} min)`}
                  style={{ background: "transparent", color: "var(--accent-emerald)", padding: "4px", display: "flex", alignItems: "center" }}
                >
                  <Play size={14} />
                </button>
              )}

              {/* Add +1 min button */}
              <button
                type="button"
                onClick={() => controlTimer("ADD_MINUTE")}
                title="Přidat 1 minutu (+1m)"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "var(--text-muted)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                +1m
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={() => controlTimer("RESET")}
                title="Resetovat odpočet"
                style={{ background: "transparent", color: "var(--text-dim)", padding: "4px", display: "flex", alignItems: "center" }}
              >
                <RotateCcw size={14} />
              </button>

              {/* Dropdown Menu for Duration Selection */}
              {isTimerMenuOpen && (
                <>
                  <div
                    onClick={() => setIsTimerMenuOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 90 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      zIndex: 100,
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                      minWidth: "230px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>
                      Nastavit délku odpočtu
                    </div>

                    {/* Quick Presets */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                      {[
                        { label: "1 min", secs: 60 },
                        { label: "3 min", secs: 180 },
                        { label: "5 min", secs: 300 },
                        { label: "10 min", secs: 600 },
                        { label: "15 min", secs: 900 },
                        { label: "25 min", secs: 1500 },
                      ].map((preset) => (
                        <button
                          key={preset.secs}
                          type="button"
                          onClick={() => handleSetTimerDuration(preset.secs)}
                          style={{
                            padding: "6px 4px",
                            fontSize: "0.8rem",
                            borderRadius: "var(--radius-sm)",
                            background:
                              selectedTimerDuration === preset.secs
                                ? "var(--accent-indigo)"
                                : "rgba(255, 255, 255, 0.05)",
                            color: selectedTimerDuration === preset.secs ? "#ffffff" : "var(--text-main)",
                            border: "1px solid var(--border-color)",
                            cursor: "pointer",
                            fontWeight: selectedTimerDuration === preset.secs ? 700 : 500,
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Minutes Input */}
                    <form
                      onSubmit={handleCustomTimerSubmit}
                      style={{
                        display: "flex",
                        gap: "6px",
                        paddingTop: "6px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      <input
                        type="number"
                        min="1"
                        max="180"
                        placeholder="Vlastní (min)"
                        value={customMinutesInput}
                        onChange={(e) => setCustomMinutesInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-main)",
                          fontSize: "0.8rem",
                          width: "100%",
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--accent-indigo)",
                          color: "#ffffff",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Nastavit
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>

            {/* Action Items Button */}
            <button
              onClick={() => setIsActionItemsOpen(true)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <Target size={15} color="var(--accent-emerald)" />
              Akční kroky ({state.actionItems?.filter((a) => a.status !== "DONE").length || 0})
            </button>

            {/* Export Button */}
            <button
              onClick={() => setIsExportOpen(true)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <FileDown size={15} /> Export
            </button>

            {/* Remaining Votes Pill */}
            <div
              style={{
                padding: "5px 10px",
                borderRadius: "var(--radius-full)",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--accent-indigo)",
              }}
            >
              {remainingVotes} hlasů
            </div>

            {/* Share Link Button */}
            <button
              onClick={handleCopyLink}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: copiedLink ? "var(--accent-emerald)" : "var(--accent-indigo)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {copiedLink ? <Check size={15} /> : <Share2 size={15} />}
              {copiedLink ? "Zkopírováno" : "Sdílet"}
            </button>

            {/* Online Presence Avatars & Dropdown Popover */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  background: isPresenceMenuOpen ? "rgba(99, 102, 241, 0.15)" : "var(--bg-card)",
                  border: isPresenceMenuOpen
                    ? "1px solid var(--accent-indigo)"
                    : "1px solid var(--border-color)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={() => setIsPresenceMenuOpen(!isPresenceMenuOpen)}
                title="Zobrazit přítomné kolegy a nastavení jména"
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  {uniqueOnlineUsers.slice(0, 5).map((u, i) => (
                    <div
                      key={u.id}
                      title={`${u.name} (Online)`}
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: u.avatarColor || "var(--accent-indigo)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        border: "2px solid var(--bg-secondary)",
                        marginLeft: i > 0 ? "-8px" : "0",
                        zIndex: 10 - i,
                      }}
                    >
                      {u.name.slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                  {uniqueOnlineUsers.length > 5 && (
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "var(--bg-secondary)",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        marginLeft: "-6px",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      +{uniqueOnlineUsers.length - 5}
                    </div>
                  )}
                </div>

                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  {uniqueOnlineUsers.length}
                </span>
                <ChevronDown size={14} color="var(--text-dim)" />
              </div>

              {/* Online Presence Dropdown Popover */}
              {isPresenceMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "320px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                    padding: "16px",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Users size={16} color="var(--accent-indigo)" />
                      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                        Kolegové online ({uniqueOnlineUsers.length})
                      </span>
                    </div>
                    <button
                      onClick={() => setIsPresenceMenuOpen(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-dim)",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* List of online users */}
                  <div
                    style={{
                      maxHeight: "140px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      paddingRight: "4px",
                    }}
                  >
                    {uniqueOnlineUsers.map((u) => {
                      const isMe = u.id === user.id;
                      return (
                        <div
                          key={u.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: isMe ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.02)",
                            border: isMe ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid transparent",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: u.avatarColor || "var(--accent-indigo)",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.68rem",
                                fontWeight: 800,
                              }}
                            >
                              {u.name.slice(0, 1).toUpperCase()}
                            </div>
                            <span
                              style={{
                                fontSize: "0.82rem",
                                fontWeight: isMe ? 700 : 500,
                                color: isMe ? "var(--accent-indigo)" : "var(--text-main)",
                              }}
                            >
                              {u.name} {isMe ? "(Vy)" : ""}
                            </span>
                          </div>
                          {u.isFacilitator && (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                padding: "1px 6px",
                                borderRadius: "var(--radius-full)",
                                background: "rgba(99, 102, 241, 0.2)",
                                color: "var(--accent-indigo)",
                                fontWeight: 600,
                              }}
                            >
                              Facilitátor
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Profile & Name change section */}
                  <div
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                        Vaše jméno:
                      </span>
                      <button
                        type="button"
                        onClick={handleRollRandomName}
                        title="Vygenerovat nové náhodné zvíře ve stylu Google Docs"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--accent-cyan)",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: 600,
                        }}
                      >
                        <Sparkles size={12} />
                        <span>Náhodné zvíře</span>
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName(customNameInput);
                        }}
                        placeholder="Napište jméno..."
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-main)",
                          fontSize: "0.82rem",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveName(customNameInput)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--accent-indigo)",
                          color: "#fff",
                          border: "none",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Uložit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Presence notification toast */}
        {presenceToast && (
          <div
            style={{
              margin: "12px 24px 0",
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid var(--accent-emerald)",
              color: "var(--accent-emerald)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <Check size={16} /> {presenceToast}
          </div>
        )}

        {/* Error alert toast */}
        {lastError && (
          <div
            style={{
              margin: "12px 24px 0",
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid var(--accent-rose)",
              color: "var(--accent-rose)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <AlertCircle size={18} /> {lastError}
          </div>
        )}

        {/* Board Columns Grid with Drag & Drop */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            display: "grid",
            gridTemplateColumns: `repeat(${state.columns.length}, minmax(300px, 1fr))`,
            gap: "20px",
            overflowX: "auto",
            alignItems: "start",
          }}
        >
          {state.columns.map((column) => {
            const colAllCards = state.cards.filter((c) => c.columnId === column.id);
            const isTypingInCol = typingUsers.some((t) => t.columnId === column.id);

            // Kořenové karty (nejsou podřízené žádné jiné kartě)
            const rootCards = colAllCards.filter(
              (c) => !c.parentCardId || !state.cards.some((p) => p.id === c.parentCardId)
            );

            // Pokud jsme ve fázi diskuze nebo hlasování, seřadíme karty podle celkového počtu hlasů skupiny sestupně!
            if (state.phase === "VOTING" || state.phase === "DISCUSSION") {
              rootCards.sort((a, b) => getGroupTotalVotes(b.id) - getGroupTotalVotes(a.id));
            }

            return (
              <DroppableColumn key={column.id} column={column} cards={colAllCards}>
                {/* Column Header */}
                <div
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>{column.title}</h3>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-muted)",
                      fontWeight: 700,
                    }}
                  >
                    {colAllCards.length}
                  </span>
                </div>

                {/* Cards List */}
                <div
                  style={{
                    flex: 1,
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    overflowY: "auto",
                    minHeight: "160px",
                  }}
                >
                  {rootCards.map((rootCard) => {
                    const childCards = colAllCards.filter((c) => c.parentCardId === rootCard.id);
                    const isGroup = childCards.length > 0;
                    const isCollapsed = !!collapsedGroupIds[rootCard.id];
                    const groupVotes = getGroupTotalVotes(rootCard.id);

                    if (isGroup) {
                      return (
                        <div
                          key={rootCard.id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid rgba(99, 102, 241, 0.25)",
                            background: "rgba(99, 102, 241, 0.04)",
                            padding: "8px",
                            gap: "8px",
                            boxShadow: isCollapsed
                              ? "0 3px 0 0 rgba(99, 102, 241, 0.2), 0 6px 0 0 rgba(99, 102, 241, 0.1)"
                              : undefined,
                            transition: "box-shadow 0.2s ease",
                          }}
                        >
                          {/* Group header bar */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "2px 4px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "var(--accent-indigo)",
                              }}
                            >
                              <Layers size={14} />
                              <span>Skupina • {1 + childCards.length} myšlenky</span>
                              {groupVotes > 0 && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "1px 6px",
                                    borderRadius: "var(--radius-full)",
                                    background: "rgba(99, 102, 241, 0.2)",
                                    color: "var(--accent-indigo)",
                                    fontWeight: 700,
                                  }}
                                >
                                  {groupVotes} hl. celkem
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() =>
                                setCollapsedGroupIds((prev) => ({
                                  ...prev,
                                  [rootCard.id]: !prev[rootCard.id],
                                }))
                              }
                              title={isCollapsed ? "Rozbalit skupinu" : "Sbalit skupinu"}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.75rem",
                                padding: "2px 6px",
                                borderRadius: "var(--radius-sm)",
                              }}
                            >
                              {isCollapsed ? (
                                <>
                                  <span>+{childCards.length} další</span>
                                  <ChevronDown size={14} />
                                </>
                              ) : (
                                <>
                                  <span>Sbalit</span>
                                  <ChevronUp size={14} />
                                </>
                              )}
                            </button>
                          </div>

                          {/* Hlavní karta skupiny */}
                          <DraggableCard
                            card={rootCard}
                            votesCount={getCardVotesCount(rootCard.id)}
                            isVoted={hasUserVotedOnCard(rootCard.id)}
                            onVote={() =>
                              hasUserVotedOnCard(rootCard.id)
                                ? removeVote(rootCard.id)
                                : castVote(rootCard.id)
                            }
                            onDelete={() => deleteCard(rootCard.id)}
                            isMasked={rootCard.content === "••••••••••••"}
                            activeDragCardId={activeCard?.id || null}
                          />

                          {/* Podkarty skupiny (pokud není sbaleno) */}
                          {!isCollapsed && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                paddingLeft: "12px",
                                borderLeft: "2px solid rgba(99, 102, 241, 0.35)",
                                marginLeft: "6px",
                              }}
                            >
                              {childCards.map((child) => (
                                <DraggableCard
                                  key={child.id}
                                  card={child}
                                  votesCount={getCardVotesCount(child.id)}
                                  isVoted={hasUserVotedOnCard(child.id)}
                                  onVote={() =>
                                    hasUserVotedOnCard(child.id)
                                      ? removeVote(child.id)
                                      : castVote(child.id)
                                  }
                                  onDelete={() => deleteCard(child.id)}
                                  isMasked={child.content === "••••••••••••"}
                                  isChild={true}
                                  onUngroup={() => ungroupCard(child.id)}
                                  activeDragCardId={activeCard?.id || null}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Samostatná karta
                    return (
                      <DraggableCard
                        key={rootCard.id}
                        card={rootCard}
                        votesCount={getCardVotesCount(rootCard.id)}
                        isVoted={hasUserVotedOnCard(rootCard.id)}
                        onVote={() =>
                          hasUserVotedOnCard(rootCard.id)
                            ? removeVote(rootCard.id)
                            : castVote(rootCard.id)
                        }
                        onDelete={() => deleteCard(rootCard.id)}
                        isMasked={rootCard.content === "••••••••••••"}
                        activeDragCardId={activeCard?.id || null}
                      />
                    );
                  })}

                  {rootCards.length === 0 && activeNewCardColumn !== column.id && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "24px 12px",
                        color: "var(--text-dim)",
                        fontSize: "0.85rem",
                        border: "2px dashed rgba(255, 255, 255, 0.05)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Přetáhněte sem kartu nebo přidejte novou
                    </div>
                  )}
                </div>

                {/* Typing indicator */}
                {isTypingInCol && (
                  <div
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.75rem",
                      color: "var(--accent-indigo)",
                      fontStyle: "italic",
                    }}
                  >
                    Někdo právě píše myšlenku...
                  </div>
                )}

                {/* Column Footer: Add Card */}
                <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)" }}>
                  {activeNewCardColumn === column.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <textarea
                        autoFocus
                        rows={3}
                        placeholder="Napište myšlenku... (Ctrl+Enter pro odeslání)"
                        value={newCardText}
                        onChange={(e) => {
                          setNewCardText(e.target.value);
                          setTyping(column.id, true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            handleAddCardSubmit(column.id);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-main)",
                          fontSize: "0.9rem",
                          resize: "vertical",
                        }}
                      />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                          />
                          Anonymně
                        </label>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNewCardColumn(null);
                              setNewCardText("");
                              setTyping(column.id, false);
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "var(--radius-sm)",
                              background: "transparent",
                              color: "var(--text-muted)",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            Zrušit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCardSubmit(column.id)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--accent-indigo)",
                              color: "#ffffff",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            Uložit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveNewCardColumn(column.id)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(255, 255, 255, 0.04)",
                        color: "var(--text-main)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={16} /> Přidat kartu
                    </button>
                  )}
                </div>
              </DroppableColumn>
            );
          })}
        </div>
      </div>

      {/* Modály: Export a Akční kroky */}
      {isExportOpen && (
        <ExportModal state={state} onClose={() => setIsExportOpen(false)} />
      )}

      <ActionItemsDrawer
        actionItems={state.actionItems || []}
        isOpen={isActionItemsOpen}
        onClose={() => setIsActionItemsOpen(false)}
        onAdd={addActionItem}
        onToggleStatus={(id, status) => updateActionItem(id, status)}
      />

      {/* Drag Overlay pro plynulý náhled tažené karty pod kurzorem */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-card)",
              border: "1px solid var(--accent-indigo)",
              boxShadow: "0 14px 28px rgba(0,0,0,0.35), 0 10px 10px rgba(0,0,0,0.22)",
              maxWidth: "320px",
              transform: "rotate(2deg)",
              opacity: 0.95,
              cursor: "grabbing",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <GripVertical size={16} color="var(--accent-indigo)" />
              <p
                style={{
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: "1.4",
                  wordBreak: "break-word",
                  color: "var(--text-main)",
                }}
              >
                {activeCard.content}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "8px",
                paddingTop: "6px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "0.75rem",
                color: "var(--text-dim)",
              }}
            >
              <span>{activeCard.authorName}</span>
              <span style={{ color: "var(--accent-indigo)", fontWeight: 600 }}>
                Přetažením spojíte s jinou kartou
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
