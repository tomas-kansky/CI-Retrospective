import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Share2,
  Clock,
  Eye,
  EyeOff,
  ThumbsUp,
  Trash2,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Users,
  Check,
  AlertCircle,
} from "lucide-react";
import type { UserSession, RetroPhase, Card } from "@ci-retro/types";
import { useRetroRoom } from "../hooks/useRetroRoom";

interface BoardViewProps {
  roomId: string;
  user: UserSession;
  onBack: () => void;
}

export const BoardView: React.FC<BoardViewProps> = ({ roomId, user, onBack }) => {
  const {
    state,
    onlineUsers,
    typingUsers,
    isConnected,
    lastError,
    remainingVotes,
    addCard,
    deleteCard,
    castVote,
    removeVote,
    setPhase,
    toggleBlur,
    controlTimer,
    setTyping,
  } = useRetroRoom({ roomId, user });

  // Lokální stavy formulářů
  const [activeNewCardColumn, setActiveNewCardColumn] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Synchronizovaný lokální odpočet času
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!state?.timerEndsAt) {
      setSecondsLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((state.timerEndsAt! - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 500);

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

  // Fáze popisky
  const phaseLabels: Record<RetroPhase, { title: string; color: string }> = {
    BRAINSTORMING: { title: "1. Brainstorming (Psaní)", color: "var(--accent-indigo)" },
    GROUPING: { title: "2. Seskupování témat", color: "var(--accent-cyan)" },
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

  // Agregace hlasů pro karty
  const getCardVotesCount = (cardId: string) => {
    return state.votes.filter((v) => v.cardId === cardId).length;
  };

  const hasUserVotedOnCard = (cardId: string) => {
    return state.votes.some((v) => v.cardId === cardId && v.userSessionId === user.id);
  };

  // Formátování času MM:SS
  const formatTimer = (totalSeconds: number | null) => {
    if (totalSeconds === null) return "5:00";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
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

        {/* Action Controls: Phase, Timer, Blur, Votes, Presence */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Phase Selector (Facilitator tool) */}
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
            <option value="BRAINSTORMING">1. Brainstorming (Psaní)</option>
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
            {state.cardsBlurred ? <EyeOff size={16} /> : <Eye size={16} />}
            {state.cardsBlurred ? "Maskováno" : "Viditelné"}
          </button>

          {/* Synchronized Timer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
            }}
          >
            <Clock size={16} color="var(--accent-indigo)" />
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "1rem",
                color: secondsLeft !== null && secondsLeft < 30 ? "var(--accent-rose)" : "var(--text-main)",
              }}
            >
              {formatTimer(secondsLeft)}
            </span>

            {state.timerEndsAt ? (
              <button
                onClick={() => controlTimer("PAUSE")}
                title="Pauza"
                style={{ background: "transparent", color: "var(--text-muted)", padding: "2px" }}
              >
                <Pause size={14} />
              </button>
            ) : (
              <button
                onClick={() => controlTimer("START", 300)}
                title="Spustit 5 minut"
                style={{ background: "transparent", color: "var(--accent-emerald)", padding: "2px" }}
              >
                <Play size={14} />
              </button>
            )}

            <button
              onClick={() => controlTimer("RESET")}
              title="Reset"
              style={{ background: "transparent", color: "var(--text-dim)", padding: "2px" }}
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Remaining Votes Pill */}
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-full)",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--accent-indigo)",
            }}
          >
            Hlasy: {remainingVotes} zbývá
          </div>

          {/* Share Link Button */}
          <button
            onClick={handleCopyLink}
            style={{
              padding: "6px 14px",
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
            {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
            {copiedLink ? "Zkopírováno!" : "Sdílet odkaz"}
          </button>

          {/* Online Presence Avatars */}
          <div style={{ display: "flex", alignItems: "center", marginLeft: "6px" }}>
            {onlineUsers.map((u, i) => (
              <div
                key={u.id + i}
                title={`${u.name} (Online)`}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: u.avatarColor || "var(--accent-indigo)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  border: "2px solid var(--bg-secondary)",
                  marginLeft: i > 0 ? "-8px" : "0",
                  zIndex: 10 - i,
                }}
              >
                {u.name.slice(0, 1).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

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

      {/* Board Columns Grid */}
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
          const colCards = state.cards.filter((c) => c.columnId === column.id);
          const isTypingInCol = typingUsers.some((t) => t.columnId === column.id);

          return (
            <div
              key={column.id}
              className="glass-panel"
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                borderTop: `4px solid ${column.color}`,
                maxHeight: "calc(100vh - 180px)",
              }}
            >
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
                  {colCards.length}
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
                  minHeight: "150px",
                }}
              >
                {colCards.map((card) => {
                  const votesCount = getCardVotesCount(card.id);
                  const isVoted = hasUserVotedOnCard(card.id);
                  const isMasked = card.content === "••••••••••••";

                  return (
                    <div
                      key={card.id}
                      style={{
                        padding: "14px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        boxShadow: "var(--shadow-sm)",
                        position: "relative",
                      }}
                    >
                      {/* Card Content with Safe Blur Display */}
                      <p
                        style={{
                          fontSize: "0.92rem",
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

                      {/* Card Footer: Author + Vote + Delete */}
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

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {/* Vote Button */}
                          <button
                            onClick={() => (isVoted ? removeVote(card.id) : castVote(card.id))}
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
                            }}
                          >
                            <ThumbsUp size={13} />
                            <span>{votesCount}</span>
                          </button>

                          {/* Delete Button (Author or Facilitator) */}
                          <button
                            onClick={() => deleteCard(card.id)}
                            title="Smazat kartu"
                            style={{
                              background: "transparent",
                              color: "var(--text-dim)",
                              padding: "4px",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colCards.length === 0 && activeNewCardColumn !== column.id && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 12px",
                      color: "var(--text-dim)",
                      fontSize: "0.85rem",
                    }}
                  >
                    Žádné karty ve sloupci
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

              {/* Column Footer: Add Card Trigger / Inline Form */}
              <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)" }}>
                {activeNewCardColumn === column.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <textarea
                      autoFocus
                      rows={3}
                      placeholder="Napište myšlenku..."
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
