import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Bug,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Trash2,
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

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.8);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error("Nepodařilo se načíst obrázek."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Nepodařilo se přečíst soubor."));
    reader.readAsDataURL(file);
  });
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
  const [screenshot, setScreenshot] = useState<string | null>(null);
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSubmitError("Lze vložit pouze soubor obrázku (PNG, JPG, WebP, GIF).");
      return;
    }
    try {
      setSubmitError(null);
      const dataUrl = await compressImageFile(file);
      setScreenshot(dataUrl);
    } catch (err: any) {
      setSubmitError(err?.message || "Nepodařilo se zpracovat vložený obrázek.");
    }
  }, []);

  // Podpora vložení obrázku přímo ze schránky (Ctrl+V / Cmd+V) kdekoliv v otevřeném modálu
  useEffect(() => {
    if (!isOpen || successData) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => {
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, [isOpen, successData, handleImageFile]);

  if (!isOpen) return null;

  const recentErrors = getRecentErrors();
  const isIdea = type === "feature";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 5) {
      setSubmitError(
        isIdea
          ? "Vyplňte prosím název nápadu (min. 3 znaky) a popis (min. 5 znaků)."
          : "Vyplňte prosím název chyby (min. 3 znaky) a popis (min. 5 znaků)."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: CreateTicketInput = {
      title: title.trim(),
      type,
      priority: isIdea && priority === "critical" ? "high" : priority,
      description: description.trim(),
      stepsToReproduce: !isIdea && stepsToReproduce.trim() ? stepsToReproduce.trim() : undefined,
      expectedBehavior: isIdea && expectedBehavior.trim() ? expectedBehavior.trim() : undefined,
      actualBehavior: !isIdea && actualBehavior.trim() ? actualBehavior.trim() : undefined,
      authorName: currentUser.name,
      authorSessionId: currentUser.id,
      roomId: roomId || undefined,
      phase: phase || undefined,
      userAgent: includeTelemetry ? navigator.userAgent : undefined,
      screenResolution: includeTelemetry ? `${window.innerWidth}x${window.innerHeight}` : undefined,
      consoleErrors:
        !isIdea && includeTelemetry && recentErrors.length > 0
          ? JSON.stringify(recentErrors)
          : undefined,
      screenshot: screenshot || undefined,
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
    setScreenshot(null);
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
                background: isIdea ? "rgba(99, 102, 241, 0.15)" : "rgba(244, 63, 94, 0.15)",
                color: isIdea ? "var(--accent-indigo)" : "var(--accent-rose)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isIdea ? <Sparkles size={18} /> : <Bug size={18} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                {isIdea ? "Navrhnout nápad / vylepšení" : "Nahlásit chybu"}
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
                  {isIdea ? "Nápad byl úspěšně odeslán!" : "Chyba byla úspěšně nahlášena!"}
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

              {/* Typ hlášení: pouze Chyba a Nápad (bez Vzhled / UX) */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Typ hlášení
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  {[
                    { id: "bug", label: "Chyba", icon: <Bug size={14} /> },
                    { id: "feature", label: "Nápad", icon: <Sparkles size={14} /> },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as TicketType)}
                      style={{
                        padding: "9px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: type === item.id ? "1px solid var(--accent-indigo)" : "1px solid var(--border-color)",
                        background: type === item.id ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        color: type === item.id ? "var(--accent-indigo)" : "var(--text-muted)",
                        fontWeight: type === item.id ? 700 : 500,
                        fontSize: "0.85rem",
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

              {isIdea ? (
                /* ==========================================
                   FORMULÁŘ PRO NÁPAD / VYLEPŠENÍ (feature)
                   ========================================== */
                <>
                  {/* Přínos / Priorita nápadu */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                      Přínos nápadu
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                      {[
                        { id: "low", label: "Menší vylepšení", color: "var(--text-dim)" },
                        { id: "medium", label: "Užitečné", color: "var(--accent-cyan)" },
                        { id: "high", label: "Klíčová funkce", color: "var(--accent-indigo)" },
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

                  {/* Název nápadu */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                      Název nápadu / vylepšení *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="např. Možnost filtrovat karty podle autora"
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

                  {/* Popis nápadu */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                      Jak by to mělo fungovat *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Popište svůj nápad, kde v aplikaci by měl být a jak by měl fungovat..."
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

                  {/* Proč by to pomohlo (volitelné) */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                      Jaký problém to řeší / Přínos pro tým (volitelné)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="např. Ušetří čas při vyhodnocování akčních kroků na konci retrospektivy"
                      value={expectedBehavior}
                      onChange={(e) => setExpectedBehavior(e.target.value)}
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
                </>
              ) : (
                /* ==========================================
                   FORMULÁŘ PRO CHYBU (bug)
                   ========================================== */
                <>
                  {/* Závažnost */}
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
                      placeholder="1. Přejít na tabuli&#10;2. Chytit kartu X a táhnout na kartu Y"
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
                </>
              )}

              {/* Vložení obrázku ze schránky (Ctrl+V) nebo ze souboru (volitelné) */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Přiložit obrázek / screenshot (volitelné)
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageFile(file);
                    }
                    e.target.value = "";
                  }}
                />

                {screenshot ? (
                  <div
                    style={{
                      position: "relative",
                      border: "1px solid var(--accent-indigo)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px",
                      background: "rgba(99, 102, 241, 0.06)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <img
                      src={screenshot}
                      alt="Náhled přiloženého obrázku"
                      style={{
                        maxHeight: "180px",
                        width: "100%",
                        objectFit: "contain",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(0, 0, 0, 0.25)",
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                        ✓ Obrázek připraven k odeslání
                      </span>
                      <button
                        type="button"
                        onClick={() => setScreenshot(null)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(244, 63, 94, 0.12)",
                          border: "1px solid rgba(244, 63, 94, 0.3)",
                          color: "var(--accent-rose)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Odebrat obrázek</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleImageFile(file);
                      }
                    }}
                    style={{
                      padding: "14px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1.5px dashed var(--border-color)",
                      background: "rgba(255, 255, 255, 0.015)",
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <ImageIcon size={16} color="var(--accent-indigo)" />
                    <span>
                      Stiskněte <strong>Ctrl+V</strong> (Cmd+V) pro vložení ze schránky, nebo klikněte pro výběr obrázku
                    </span>
                  </div>
                )}
              </div>

              {/* Automaticky zjištěná telemetrie (primárně pro chyby) */}
              {!isIdea && (
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
              )}

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
                  {isIdea ? <Sparkles size={15} /> : <Bug size={15} />}
                  <span>
                    {isSubmitting
                      ? "Odesílám..."
                      : isIdea
                      ? "Odeslat nápad"
                      : "Odeslat chybu"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
