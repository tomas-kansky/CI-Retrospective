import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Circle,
  Calendar,
  User,
  ExternalLink,
  Layers,
  Search,
  Filter,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import type { GlobalActionItem } from "@ci-retro/types";

interface GlobalActionItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRetro: (roomId: string) => void;
}

export const GlobalActionItemsModal: React.FC<GlobalActionItemsModalProps> = ({
  isOpen,
  onClose,
  onOpenRetro,
}) => {
  const [items, setItems] = useState<GlobalActionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "DONE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/action-items");
      if (res.ok) {
        const data = await res.json();
        setItems(data.actionItems || []);
      } else {
        setError("Nepodařilo se načíst seznam akčních kroků.");
      }
    } catch (err: any) {
      console.error("Chyba při načítání úkolovníku:", err);
      setError("Chyba spojení se serverem.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleStatus = async (item: GlobalActionItem) => {
    const newStatus = item.status === "DONE" ? "OPEN" : "DONE";

    // Optimistická aktualizace v UI
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );

    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Vrácení v případě chyby
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
        );
      }
    } catch (err) {
      console.error("Chyba při změně stavu úkolu:", err);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
      );
    }
  };

  // Filtrování a řazení: otevřené úkoly nahoře, hotové dole
  const filteredItems = items
    .filter((item) => {
      if (filter === "OPEN") return item.status !== "DONE";
      if (filter === "DONE") return item.status === "DONE";
      return true;
    })
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.text.toLowerCase().includes(q) ||
        (item.assignee && item.assignee.toLowerCase().includes(q)) ||
        (item.retrospectiveTitle && item.retrospectiveTitle.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      // Hotové úkoly jdou vždy na spodek
      const aDone = a.status === "DONE";
      const bDone = b.status === "DONE";
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const openCount = items.filter((i) => i.status !== "DONE").length;
  const doneCount = items.filter((i) => i.status === "DONE").length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "85vh",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckSquare size={22} color="var(--accent-emerald)" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                Úkolovník (Action Items)
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Přehled všech zapsaných úkolů napříč vašimi retrospektivami
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter bar & Search */}
        <div
          style={{
            padding: "14px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "var(--bg-card)",
          }}
        >
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setFilter("ALL")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: filter === "ALL" ? "var(--accent-indigo)" : "transparent",
                color: filter === "ALL" ? "#fff" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: filter === "ALL" ? "none" : "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            >
              Vše ({items.length})
            </button>
            <button
              onClick={() => setFilter("OPEN")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: filter === "OPEN" ? "var(--accent-amber)" : "transparent",
                color: filter === "OPEN" ? "#0f172a" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: filter === "OPEN" ? "none" : "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            >
              K vyřešení ({openCount})
            </button>
            <button
              onClick={() => setFilter("DONE")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: filter === "DONE" ? "var(--accent-emerald)" : "transparent",
                color: filter === "DONE" ? "#fff" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: filter === "DONE" ? "none" : "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            >
              Hotovo ({doneCount})
            </button>
          </div>

          {/* Search box */}
          <div
            style={{
              position: "relative",
              minWidth: "200px",
              flex: "1 1 auto",
              maxWidth: "260px",
            }}
          >
            <Search
              size={14}
              color="var(--text-dim)"
              style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Hledat úkol, řešitele..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
              }}
            />
          </div>
        </div>

        {/* Task List Container */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              Načítám akční kroky...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--accent-rose)" }}>
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "var(--text-dim)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <CheckSquare size={32} color="var(--text-dim)" />
              <p style={{ margin: 0, fontSize: "0.95rem" }}>
                {searchQuery
                  ? "Žádné úkoly neodpovídají hledání."
                  : filter === "DONE"
                  ? "Zatím nemáte žádné dokončené úkoly."
                  : "Všechny úkoly jsou splněny nebo zatím žádné nebyly zapsány!"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isDone = item.status === "DONE";

              return (
                <div
                  key={item.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    background: isDone ? "rgba(255, 255, 255, 0.015)" : "var(--bg-card)",
                    border: isDone
                      ? "1px solid rgba(255, 255, 255, 0.05)"
                      : "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    transition: "all 0.2s ease",
                    opacity: isDone ? 0.6 : 1,
                  }}
                >
                  {/* Status Toggle Button (Checkbox) */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    title={isDone ? "Označit jako nevyřešené" : "Označit jako hotové"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: isDone ? "var(--accent-emerald)" : "var(--text-muted)",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "2px",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 size={20} color="var(--accent-emerald)" />
                    ) : (
                      <Circle size={20} color="var(--text-dim)" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.92rem",
                        lineHeight: "1.45",
                        fontWeight: isDone ? 400 : 500,
                        textDecoration: isDone ? "line-through" : "none",
                        color: isDone ? "var(--text-dim)" : "var(--text-main)",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.text}
                    </p>

                    {/* Metadata & Origin Retro Link */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginTop: "8px",
                        flexWrap: "wrap",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {/* Origin Board Badge */}
                      <button
                        type="button"
                        onClick={() => {
                          onOpenRetro(item.retrospectiveId);
                          onClose();
                        }}
                        title="Otevřít tuto retrospektivu"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          background: "rgba(99, 102, 241, 0.1)",
                          color: "var(--accent-indigo)",
                          border: "1px solid rgba(99, 102, 241, 0.25)",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Layers size={11} />
                        <span>{item.retrospectiveTitle || "Retrospektiva"}</span>
                        <ExternalLink size={10} />
                      </button>

                      {/* Assignee */}
                      {item.assignee && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <User size={12} color="var(--accent-cyan)" />
                          <span>{item.assignee}</span>
                        </span>
                      )}

                      {/* Due Date */}
                      {item.dueDate && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={12} color="var(--accent-amber)" />
                          <span>{item.dueDate}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-card)",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          <span>
            Zbývá vyřešit: <strong style={{ color: "var(--text-main)" }}>{openCount}</strong> z{" "}
            <strong>{items.length}</strong>
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
