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
  ChevronDown,
  Ban,
  Trash2,
} from "lucide-react";
import type { ActionItemStatus, GlobalActionItem } from "@ci-retro/types";

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
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "DONE" | "CANCELLED">("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [newText, setNewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
      setOpenMenuId(null);
      loadItems();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSetStatus = async (item: GlobalActionItem, newStatus: ActionItemStatus) => {
    setOpenMenuId(null);
    // Optimistická aktualizace v UI (při Mark as Done do Hotovo, při Cancel do Zrušeno)
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

  const handleDeleteItem = async (item: GlobalActionItem) => {
    setOpenMenuId(null);
    const previousItems = items;
    // Optimistické smazání z UI
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setItems(previousItems);
      }
    } catch (err) {
      console.error("Chyba při odstraňování akčního kroku:", err);
      setItems(previousItems);
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

  const getStatusPriority = (status: string) => {
    if (status === "DONE") return 1;
    if (status === "CANCELLED") return 2;
    return 0;
  };

  // Filtrování a řazení: otevřené úkoly nahoře, hotové a zrušené dole
  const filteredItems = items
    .filter((item) => {
      if (filter === "OPEN") return item.status !== "DONE" && item.status !== "CANCELLED";
      if (filter === "DONE") return item.status === "DONE";
      if (filter === "CANCELLED") return item.status === "CANCELLED";
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
      const pA = getStatusPriority(a.status);
      const pB = getStatusPriority(b.status);
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const openCount = items.filter((i) => i.status !== "DONE" && i.status !== "CANCELLED").length;
  const doneCount = items.filter((i) => i.status === "DONE").length;
  const cancelledCount = items.filter((i) => i.status === "CANCELLED").length;

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
          maxWidth: "700px",
          maxHeight: "88vh",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuId(null);
        }}
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
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
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
            <button
              onClick={() => setFilter("CANCELLED")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: filter === "CANCELLED" ? "rgba(244, 63, 94, 0.22)" : "transparent",
                color: filter === "CANCELLED" ? "var(--accent-rose)" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
                border:
                  filter === "CANCELLED"
                    ? "1px solid rgba(244, 63, 94, 0.45)"
                    : "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            >
              Zrušeno ({cancelledCount})
            </button>
          </div>

          {/* Search box */}
          <div
            style={{
              position: "relative",
              minWidth: "200px",
              flex: "1 1 auto",
              maxWidth: "240px",
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
                  : filter === "CANCELLED"
                  ? "Zatím nemáte žádné zrušené akční kroky."
                  : "Všechny akční kroky jsou vyřešeny nebo zatím žádné nebyly přidány!"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isDone = item.status === "DONE";
              const isCancelled = item.status === "CANCELLED";
              const isInactive = isDone || isCancelled;
              const isMenuOpen = openMenuId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    background: isInactive ? "rgba(255, 255, 255, 0.015)" : "var(--bg-card)",
                    border: isInactive
                      ? "1px solid rgba(255, 255, 255, 0.05)"
                      : "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    transition: "all 0.2s ease",
                    opacity: isInactive ? 0.68 : 1,
                    position: "relative",
                    zIndex: isMenuOpen ? 30 : 1,
                  }}
                >
                  {/* Task Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.92rem",
                        lineHeight: "1.45",
                        fontWeight: isInactive ? 400 : 500,
                        textDecoration: isInactive ? "line-through" : "none",
                        color: isInactive ? "var(--text-dim)" : "var(--text-main)",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.text}
                    </p>

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
                      {/* Origin Retro Link */}
                      {item.retrospectiveId && item.retrospectiveId !== "global" && (
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
                      )}

                      {isCancelled && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            background: "rgba(244, 63, 94, 0.12)",
                            color: "var(--accent-rose)",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          Zrušeno
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mark as Done + šipka dolů (Cancel / Delete) nebo Vrátit + šipka dolů */}
                  <div
                    style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isInactive ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "stretch",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid rgba(16, 185, 129, 0.35)",
                          background: "rgba(16, 185, 129, 0.14)",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSetStatus(item, "DONE")}
                          title="Označit akční krok jako hotový a přesunout do Hotovo"
                          style={{
                            padding: "6px 12px",
                            background: "transparent",
                            color: "var(--accent-emerald)",
                            border: "none",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Mark as Done</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : item.id)}
                          title="Další akce (Cancel / Delete)"
                          style={{
                            padding: "6px 8px",
                            background: isMenuOpen ? "rgba(16, 185, 129, 0.22)" : "transparent",
                            color: "var(--accent-emerald)",
                            border: "none",
                            borderLeft: "1px solid rgba(16, 185, 129, 0.3)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "stretch",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-color)",
                          background: "rgba(255, 255, 255, 0.05)",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSetStatus(item, "OPEN")}
                          title="Vrátit zpět mezi K vyřešení"
                          style={{
                            padding: "5px 10px",
                            background: "transparent",
                            color: "var(--text-muted)",
                            border: "none",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <RotateCcw size={12} />
                          <span>Vrátit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : item.id)}
                          title="Další akce (Cancel / Delete)"
                          style={{
                            padding: "5px 7px",
                            background: isMenuOpen ? "rgba(255, 255, 255, 0.1)" : "transparent",
                            color: "var(--text-muted)",
                            border: "none",
                            borderLeft: "1px solid var(--border-color)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    )}

                    {/* Dropdown menu pro Cancel a Delete */}
                    {isMenuOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 5px)",
                          right: 0,
                          minWidth: "170px",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-sm)",
                          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.55)",
                          padding: "4px",
                          zIndex: 100,
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(item, "CANCELLED")}
                            style={{
                              width: "100%",
                              padding: "7px 10px",
                              borderRadius: "4px",
                              background: "transparent",
                              color: "var(--text-main)",
                              border: "none",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Ban size={14} color="var(--accent-amber, #f59e0b)" />
                            <span>Cancel (Zrušit)</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            borderRadius: "4px",
                            background: "transparent",
                            color: "var(--accent-rose)",
                            border: "none",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244, 63, 94, 0.12)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Trash2 size={14} color="var(--accent-rose)" />
                          <span>Delete (Odstranit)</span>
                        </button>
                      </div>
                    )}
                  </div>
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
