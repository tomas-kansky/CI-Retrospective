import React, { useState } from "react";
import {
  X,
  Bug,
  Sparkles,
  Palette,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { UserSession, TicketType, TicketPriority, CreateTicketInput } from "@ci-retro/types";
import { getRecentErrors } from "../utils/errorBuffer";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  phase?: string;
  currentUser: UserSession;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  roomId,
  phase,
  currentUser,
}) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("bug");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [includeTelemetry, setIncludeTelemetry] = useState(true);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    ticketId: string;
    filePath: string;
    markdown: string;
    committedToGithub: boolean;
    githubCommitUrl?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const recentErrors = getRecentErrors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 5) {
      setSubmitError("Vyplňte prosím název (min. 3 znaky) a popis chyby (min. 5 znaků).");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: CreateTicketInput = {
      title: title.trim(),
      type,
      priority,
      description: description.trim(),
      stepsToReproduce: stepsToReproduce.trim() || undefined,
      expectedBehavior: expectedBehavior.trim() || undefined,
      actualBehavior: actualBehavior.trim() || undefined,
      authorName: currentUser.name,
      authorSessionId: currentUser.id,
      roomId: roomId || undefined,
      phase: phase || undefined,
      userAgent: includeTelemetry ? navigator.userAgent : undefined,
      screenResolution: includeTelemetry ? `${window.innerWidth}x${window.innerHeight}` : undefined,
      consoleErrors: includeTelemetry && recentErrors.length > 0 ? JSON.stringify(recentErrors) : undefined,
    };

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Chyba při odesílání (${res.status})`);
      }

      const resData = await res.json();
      setSuccessData({
        ticketId: resData.ticket.id,
        filePath: resData.filePath,
        markdown: resData.markdown,
        committedToGithub: resData.committedToGithub,
        githubCommitUrl: resData.githubCommitUrl,
      });
    } catch (err: any) {
      setSubmitError(err.message || "Nepodařilo se odeslat hlášení. Zkontrolujte připojení k internetu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!successData?.markdown) return;
    navigator.clipboard.writeText(successData.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetAndClose = () => {
    setTitle("");
    setDescription("");
    setStepsToReproduce("");
    setExpectedBehavior("");
    setActualBehavior("");
    setSuccessData(null);
    setSubmitError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          backgroundColor: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "var(--radius-md)",
                background: "rgba(244, 63, 94, 0.15)",
                color: "var(--accent-rose)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bug size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                Nahlásit chybu / Zpětnou vazbu
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                Automaticky se uloží do D1 a zapíše jako .md soubor do repozitáře
              </span>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-dim)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {successData ? (
            /* Success State */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "14px", padding: "16px 8px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "var(--accent-emerald)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Chyba byla úspěšně nahlášena!
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Ticket <strong>{successData.ticketId}</strong> byl zaevidován v databázi.
                </p>
              </div>

              {successData.committedToGithub && (
                <div
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent-emerald)" }}>
                    🚀 Soubor byl automaticky commitnut do GitHub repozitáře!
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", wordBreak: "break-all" }}>
                    Cesta: <code>{successData.filePath}</code>
                  </div>
                  {successData.githubCommitUrl && (
                    <a
                      href={successData.githubCommitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "0.78rem",
                        color: "var(--accent-indigo)",
                        marginTop: "2px",
                        textDecoration: "underline",
                      }}
                    >
                      <span>Zobrazit commit na GitHubu</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  {copied ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
                  <span>{copied ? "Zkopírováno!" : "Zkopírovat Markdown"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--accent-indigo)",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Zavřít
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {submitError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(244, 63, 94, 0.1)",
                    border: "1px solid rgba(244, 63, 94, 0.3)",
                    color: "var(--accent-rose)",
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Typ hlášení */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Typ hlášení
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {[
                    { id: "bug", label: "Chyba", icon: <Bug size={14} /> },
                    { id: "feature", label: "Nápad", icon: <Sparkles size={14} /> },
                    { id: "ux", label: "Vzhled / UX", icon: <Palette size={14} /> },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as TicketType)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: type === item.id ? "1px solid var(--accent-indigo)" : "1px solid var(--border-color)",
                        background: type === item.id ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        color: type === item.id ? "var(--accent-indigo)" : "var(--text-muted)",
                        fontWeight: type === item.id ? 700 : 500,
                        fontSize: "0.82rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priorita */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Závažnost
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                  {[
                    { id: "low", label: "Nízká", color: "var(--text-dim)" },
                    { id: "medium", label: "Střední", color: "var(--accent-cyan)" },
                    { id: "high", label: "Vysoká", color: "var(--accent-amber)" },
                    { id: "critical", label: "Kritická", color: "var(--accent-rose)" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as TicketPriority)}
                      style={{
                        padding: "6px",
                        borderRadius: "var(--radius-sm)",
                        border: priority === p.id ? `1px solid ${p.color}` : "1px solid var(--border-color)",
                        background: priority === p.id ? "rgba(255, 255, 255, 0.06)" : "transparent",
                        color: priority === p.id ? p.color : "var(--text-dim)",
                        fontWeight: priority === p.id ? 700 : 500,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Název */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Název problému / Co nefunguje *
                </label>
                <input
                  type="text"
                  required
                  placeholder="např. Karta se po přetažení nepřichytí do sloupce"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Popis */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Podrobný popis *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Popište, co přesně jste dělali a co se pokazilo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Kroky k reprodukci */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Kroky k reprodukci (volitelné)
                </label>
                <textarea
                  rows={2}
                  placeholder="1. Přejít do fáze Seskupování&#10;2. Chytit kartu X a táhnout na kartu Y"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.82rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Automaticky zjištěná telemetrie */}
              <div
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                  background: "rgba(255, 255, 255, 0.015)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--text-main)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeTelemetry}
                      onChange={(e) => setIncludeTelemetry(e.target.checked)}
                      style={{ accentColor: "var(--accent-indigo)" }}
                    />
                    <span>Automaticky přiložit technická data a chyby z konzole</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      padding: "2px 6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.72rem",
                    }}
                  >
                    <span>{isTelemetryOpen ? "Skrýt" : "Zobrazit"}</span>
                    {isTelemetryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {isTelemetryOpen && (
                  <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", fontSize: "0.75rem", color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div>Místnost: <code>{roomId || "Dashboard"}</code></div>
                    <div>Fáze: <code>{phase || "N/A"}</code></div>
                    <div>Uživatel: <strong>{currentUser.name}</strong></div>
                    <div>Rozlišení: {window.innerWidth}x{window.innerHeight}</div>
                    <div>Zachycené JS chyby v konzoli: <strong>{recentErrors.length}</strong></div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-indigo)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Bug size={15} />
                  <span>{isSubmitting ? "Odesílám..." : "Odeslat chybu"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
