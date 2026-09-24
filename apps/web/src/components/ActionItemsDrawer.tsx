import React, { useState } from "react";
import { CheckCircle2, Circle, Plus, X, Calendar, User, Target } from "lucide-react";
import type { ActionItem } from "@ci-retro/types";

interface ActionItemsDrawerProps {
  actionItems: ActionItem[];
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string, assignee?: string, dueDate?: string) => void;
  onToggleStatus: (id: string, newStatus: "OPEN" | "DONE") => void;
}

export const ActionItemsDrawer: React.FC<ActionItemsDrawerProps> = ({
  actionItems,
  isOpen,
  onClose,
  onAdd,
  onToggleStatus,
}) => {
  const [newText, setNewText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    onAdd(newText.trim(), assignee.trim() || undefined, dueDate || undefined);
    setNewText("");
    setAssignee("");
    setDueDate("");
  };

  const openCount = actionItems.filter((a) => a.status !== "DONE").length;

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
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "460px",
          height: "100%",
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-md)",
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
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Target size={22} color="var(--accent-emerald)" />
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Akční kroky (Action Items)</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {openCount} otevřených úkolů
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* List of Action Items */}
        <div
          style={{
            flex: 1,
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {actionItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
              Zatím nebyly zapsány žádné akční kroky pro příští sprint.
            </div>
          ) : (
            actionItems.map((item) => {
              const isDone = item.status === "DONE";

              return (
                <div
                  key={item.id}
                  style={{
                    padding: "14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <button
                    onClick={() => onToggleStatus(item.id, isDone ? "OPEN" : "DONE")}
                    style={{
                      background: "transparent",
                      color: isDone ? "var(--accent-emerald)" : "var(--text-dim)",
                      cursor: "pointer",
                      paddingTop: "2px",
                    }}
                  >
                    {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>

                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.9rem",
                        lineHeight: "1.4",
                        textDecoration: isDone ? "line-through" : "none",
                        color: isDone ? "var(--text-dim)" : "var(--text-main)",
                      }}
                    >
                      {item.text}
                    </p>

                    <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {item.assignee && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <User size={12} /> {item.assignee}
                        </span>
                      )}
                      {item.dueDate && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={12} /> {item.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add new Action Item Form */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
          <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "12px" }}>
            Přidat nový akční krok
          </h4>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              placeholder="Co je potřeba udělat..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.88rem",
              }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="Přiřadit (např. Petr)"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                }}
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: "4px",
                padding: "9px 16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-emerald)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Plus size={16} /> Uložit úkol
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
