import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  ExternalLink,
  Layers,
  Search,
  CheckSquare,
  Plus,
  RotateCcw,
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
  // Defaultně zobrazujeme záložku "K vyřešení" ("OPEN")
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "DONE">("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [newText, setNewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      console.error("Chyba při načítání akčních kroků:", err);
      setError("Chyba spojení se serverem.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFilter("OPEN");
      loadItems();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSetStatus = async (item: GlobalActionItem, newStatus: "OPEN" | "DONE") => {
    // Optimistická aktualizace v UI (při Mark as Done okamžitě zmizí ze záložky K vyřešení a přesune se do Hotovo)
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
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
        );
      }
    } catch (err) {
      console.error("Chyba při změně stavu akčního kroku:", err);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))
      );
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setNewText("");

    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.actionItems) && data.actionItems.length > 0) {
          setItems((prev) => [...data.actionItems, ...prev]);
        } else {
          await loadItems();
        }
      }
    } catch (err) {
      console.error("Chyba při vytváření akčního kroku:", err);
    } finally {
      setIsSubmitting(false);
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
        (item.retrospectiveTitle && item.retrospectiveTitle.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
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
          maxHeight: "88vh",
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
                Akční kroky
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Globální akční kroky sdílené napříč všemi boards
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
              placeholder="Hledat akční krok..."
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
                padding: "45px 20px",
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
                  ? "Žádné akční kroky neodpovídají hledání."
                  : filter === "DONE"
                  ? "Zatím nemáte žádné hotové akční kroky."
                  : "Všechny akční kroky jsou vyřešeny nebo zatím žádné nebyly přidány!"}
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
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    transition: "all 0.2s ease",
                    opacity: isDone ? 0.65 : 1,
                  }}
                >
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

                    {/* Origin Retro Link */}
                    {item.retrospectiveId && item.retrospectiveId !== "global" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "6px",
                          flexWrap: "wrap",
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
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
                      </div>
                    )}
                  </div>

                  {/* Mark as Done / Reopen Button */}
                  {!isDone ? (
                    <button
                      type="button"
                      onClick={() => handleSetStatus(item, "DONE")}
                      title="Označit akční krok jako hotový a přesunout do Hotovo"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(16, 185, 129, 0.14)",
                        color: "var(--accent-emerald)",
                        border: "1px solid rgba(16, 185, 129, 0.35)",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "background 0.15s ease",
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark as Done</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetStatus(item, "OPEN")}
                      title="Vrátit zpět mezi K vyřešení"
                      style={{
                        padding: "5px 10px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-color)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Vrátit</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add new Action Item Form (pouze pole "Co je potřeba udělat...") */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-card)",
          }}
        >
          <form onSubmit={handleAddSubmit} style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Co je potřeba udělat..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              required
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.88rem",
              }}
            />
            <button
              type="submit"
              disabled={!newText.trim() || isSubmitting}
              style={{
                padding: "10px 18px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-emerald)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.85rem",
                border: "none",
                cursor: newText.trim() && !isSubmitting ? "pointer" : "not-allowed",
                opacity: newText.trim() && !isSubmitting ? 1 : 0.6,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={16} />
              <span>Přidat akční krok</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
