import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Plus,
  X,
  Target,
  Search,
  Layers,
  RotateCcw,
  Download,
  ChevronDown,
  Ban,
  Trash2,
} from "lucide-react";
import type { ActionItemStatus, GlobalActionItem } from "@ci-retro/types";

interface ActionItemsDrawerProps {
  roomId: string;
  roomTitle: string;
  boardActionColumnTexts?: string[];
  isOpen: boolean;
  onClose: () => void;
  onGlobalOpenCountChange?: (count: number) => void;
}

export const ActionItemsDrawer: React.FC<ActionItemsDrawerProps> = ({
  roomId,
  roomTitle,
  boardActionColumnTexts = [],
  isOpen,
  onClose,
  onGlobalOpenCountChange,
}) => {
  const [items, setItems] = useState<GlobalActionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Defaultně se zobrazuje "K vyřešení" ("OPEN")
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "DONE" | "CANCELLED">("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [newText, setNewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const countOpen = (list: GlobalActionItem[]) =>
    list.filter((i) => i.status !== "DONE" && i.status !== "CANCELLED").length;

  const loadGlobalItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/action-items");
      if (res.ok) {
        const data = await res.json();
        const loaded: GlobalActionItem[] = data.actionItems || [];
        setItems(loaded);
        if (onGlobalOpenCountChange) {
          onGlobalOpenCountChange(countOpen(loaded));
        }
      }
    } catch (err) {
      console.error("Chyba při načítání globálních akčních kroků:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onGlobalOpenCountChange]);

  // Načteme globální počet při mountu i při každém otevření šuplíku
  useEffect(() => {
    loadGlobalItems();
  }, [loadGlobalItems]);

  useEffect(() => {
    if (isOpen) {
      setFilter("OPEN");
      setOpenMenuId(null);
      loadGlobalItems();
    }
  }, [isOpen, loadGlobalItems]);

  if (!isOpen) return null;

  const handleSetStatus = async (item: GlobalActionItem, newStatus: ActionItemStatus) => {
    setOpenMenuId(null);
    // Optimistický přesun (při Mark as Done do Hotovo, při Cancel do Zrušeno)
    setItems((prev) => {
      const next = prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i));
      if (onGlobalOpenCountChange) {
        onGlobalOpenCountChange(countOpen(next));
      }
      return next;
    });

    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        await loadGlobalItems();
      }
    } catch (err) {
      console.error("Chyba při změně stavu akčního kroku:", err);
      await loadGlobalItems();
    }
  };

  const handleDeleteItem = async (item: GlobalActionItem) => {
    setOpenMenuId(null);
    // Optimistické odstranění z UI
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== item.id);
      if (onGlobalOpenCountChange) {
        onGlobalOpenCountChange(countOpen(next));
      }
      return next;
    });

    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        await loadGlobalItems();
      }
    } catch (err) {
      console.error("Chyba při odstraňování akčního kroku:", err);
      await loadGlobalItems();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setNewText("");

    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          retrospectiveId: roomId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.actionItems) && data.actionItems.length > 0) {
          setItems((prev) => {
            const next = [...data.actionItems, ...prev];
            if (onGlobalOpenCountChange) {
              onGlobalOpenCountChange(countOpen(next));
            }
            return next;
          });
        } else {
          await loadGlobalItems();
        }
      }
    } catch (err) {
      console.error("Chyba při přidávání akčního kroku:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Karty ze sloupce "Akční kroky" na daném boardu, které ještě nejsou v globálních Akčních krocích
  const existingTextsNormalized = new Set(
    items.map((i) => i.text.trim().toLowerCase())
  );
  const unimportedBoardTexts = boardActionColumnTexts.filter(
    (t) => t.trim() && !existingTextsNormalized.has(t.trim().toLowerCase())
  );

  const handleImportFromBoard = async () => {
    if (unimportedBoardTexts.length === 0 || isImporting) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: unimportedBoardTexts,
          retrospectiveId: roomId,
        }),
      });
      if (res.ok) {
        await loadGlobalItems();
      }
    } catch (err) {
      console.error("Chyba při importu akčních kroků z tabule:", err);
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusPriority = (status: string) => {
    if (status === "DONE") return 1;
    if (status === "CANCELLED") return 2;
    return 0;
  };

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

  const openCount = countOpen(items);
  const doneCount = items.filter((i) => i.status === "DONE").length;
  const cancelledCount = items.filter((i) => i.status === "CANCELLED").length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 150,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "560px",
          height: "100%",
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-md)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuId(null);
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Target size={22} color="var(--accent-emerald)" />
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                Akční kroky
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Globální přehled sdílený napříč boards • {openCount} k vyřešení
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", cursor: "pointer", border: "none" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Tabs (Vše / K vyřešení / Hotovo / Zrušeno) & Search */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-card)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: filter === "ALL" ? "var(--accent-indigo)" : "transparent",
                  color: filter === "ALL" ? "#fff" : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  border: filter === "ALL" ? "none" : "1px solid var(--border-color)",
                  cursor: "pointer",
                }}
              >
                Vše ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("OPEN")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: filter === "OPEN" ? "var(--accent-amber)" : "transparent",
                  color: filter === "OPEN" ? "#0f172a" : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  border: filter === "OPEN" ? "none" : "1px solid var(--border-color)",
                  cursor: "pointer",
                }}
              >
                K vyřešení ({openCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("DONE")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: filter === "DONE" ? "var(--accent-emerald)" : "transparent",
                  color: filter === "DONE" ? "#fff" : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  border: filter === "DONE" ? "none" : "1px solid var(--border-color)",
                  cursor: "pointer",
                }}
              >
                Hotovo ({doneCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("CANCELLED")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: filter === "CANCELLED" ? "rgba(244, 63, 94, 0.22)" : "transparent",
                  color: filter === "CANCELLED" ? "var(--accent-rose)" : "var(--text-muted)",
                  fontSize: "0.78rem",
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

            {/* Tlačítko pro přenesení karet ze sloupce Akční kroky z této tabule */}
            {unimportedBoardTexts.length > 0 && (
              <button
                type="button"
                onClick={handleImportFromBoard}
                disabled={isImporting}
                title={`Přenést karty ze sloupce Akční kroky z tabule "${roomTitle}" do globálních Akčních kroků`}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(99, 102, 241, 0.14)",
                  color: "var(--accent-indigo)",
                  border: "1px solid rgba(99, 102, 241, 0.35)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Download size={13} />
                <span>Přenést z tabule ({unimportedBoardTexts.length})</span>
              </button>
            )}
          </div>

          {/* Search box */}
          <div style={{ position: "relative" }}>
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
                fontSize: "0.8rem",
              }}
            />
          </div>
        </div>

        {/* List of Action Items */}
        <div
          style={{
            flex: 1,
            padding: "16px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {isLoading && items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
              Načítám akční kroky...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)", fontSize: "0.9rem" }}>
              {searchQuery
                ? "Žádné akční kroky neodpovídají hledání."
                : filter === "DONE"
                ? "Zatím nejsou žádné hotové akční kroky."
                : filter === "CANCELLED"
                ? "Zatím nejsou žádné zrušené akční kroky."
                : "Žádné otevřené akční kroky k vyřešení."}
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
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: isInactive ? "rgba(255, 255, 255, 0.015)" : "var(--bg-card)",
                    border: isInactive
                      ? "1px solid rgba(255, 255, 255, 0.05)"
                      : "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    opacity: isInactive ? 0.68 : 1,
                    position: "relative",
                    zIndex: isMenuOpen ? 30 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.88rem",
                        lineHeight: "1.45",
                        fontWeight: isInactive ? 400 : 500,
                        textDecoration: isInactive ? "line-through" : "none",
                        color: isInactive ? "var(--text-dim)" : "var(--text-main)",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.text}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      {item.retrospectiveId && item.retrospectiveId !== "global" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "1px 7px",
                            borderRadius: "var(--radius-full)",
                            background: "rgba(99, 102, 241, 0.1)",
                            color: "var(--accent-indigo)",
                            border: "1px solid rgba(99, 102, 241, 0.25)",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        >
                          <Layers size={10} />
                          <span>{item.retrospectiveTitle || "Retrospektiva"}</span>
                        </span>
                      )}

                      {isCancelled && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "1px 7px",
                            borderRadius: "var(--radius-full)",
                            background: "rgba(244, 63, 94, 0.12)",
                            color: "var(--accent-rose)",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                          }}
                        >
                          Zrušeno
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Akce: Mark as Done + šipka dolů (Cancel / Delete) nebo Vrátit + šipka dolů */}
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
                          title="Označit jako hotové a přesunout do Hotovo"
                          style={{
                            padding: "5px 10px",
                            background: "transparent",
                            color: "var(--accent-emerald)",
                            border: "none",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Mark as Done</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : item.id)}
                          title="Další akce (Cancel / Delete)"
                          style={{
                            padding: "5px 7px",
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
                          <ChevronDown size={13} />
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
                            padding: "4px 8px",
                            background: "transparent",
                            color: "var(--text-muted)",
                            border: "none",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <RotateCcw size={11} />
                          <span>Vrátit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : item.id)}
                          title="Další akce (Cancel / Delete)"
                          style={{
                            padding: "4px 6px",
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
                          <ChevronDown size={12} />
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
                          minWidth: "165px",
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
                              fontSize: "0.78rem",
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
                            <Ban size={13} color="var(--accent-amber, #f59e0b)" />
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
                            fontSize: "0.78rem",
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
                          <Trash2 size={13} color="var(--accent-rose)" />
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
          <h4 style={{ fontSize: "0.82rem", fontWeight: 700, margin: "0 0 10px 0", color: "var(--text-muted)" }}>
            Přidat nový akční krok
          </h4>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Co je potřeba udělat..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              required
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.86rem",
              }}
            />

            <button
              type="submit"
              disabled={!newText.trim() || isSubmitting}
              style={{
                padding: "9px 14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-emerald)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.82rem",
                border: "none",
                cursor: newText.trim() && !isSubmitting ? "pointer" : "not-allowed",
                opacity: newText.trim() && !isSubmitting ? 1 : 0.6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={15} />
              <span>Přidat</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
