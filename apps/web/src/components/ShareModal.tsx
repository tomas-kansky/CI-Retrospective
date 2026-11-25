import React, { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, QrCode, Download, Users, Clock, RefreshCw } from "lucide-react";
import QRCode from "qrcode";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  roomTitle?: string;
  teamId?: string;
  teamName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  teamId,
  teamName,
}) => {
  const [url, setUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoCopied, setAutoCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (textToCopy: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const generateShareLink = useCallback(async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setQrDataUrl(null);
    setCopied(false);
    setAutoCopied(false);

    try {
      const res = await fetch("/api/share-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(roomId ? { roomId } : {}),
          ...(teamId ? { teamId } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        setErrorMsg(data.error || "Nepodařilo se vygenerovat zabezpečený odkaz.");
        return;
      }

      const base = `${window.location.origin}${window.location.pathname}`;
      const nextUrl = roomId
        ? `${base}?invite=${encodeURIComponent(data.token)}#board/${encodeURIComponent(roomId)}`
        : `${base}?invite=${encodeURIComponent(data.token)}`;

      setUrl(nextUrl);
      setExpiresAt(typeof data.expiresAt === "number" ? data.expiresAt : null);

      const qrUri = await QRCode.toDataURL(nextUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(qrUri);

      const wasCopied = await copyToClipboard(nextUrl);
      if (wasCopied) {
        setCopied(true);
        setAutoCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.error("Chyba při generování sdílecího odkazu a QR kódu:", err);
      setErrorMsg("Nepodařilo se vygenerovat odkaz ani QR kód.");
    } finally {
      setIsGenerating(false);
    }
  }, [roomId, teamId, copyToClipboard]);

  useEffect(() => {
    if (isOpen) {
      generateShareLink();
    } else {
      setUrl("");
      setExpiresAt(null);
      setQrDataUrl(null);
      setErrorMsg(null);
      setCopied(false);
      setAutoCopied(false);
    }
  }, [isOpen, generateShareLink]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    if (!url) return;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const sanitizedTitle = (roomTitle || teamName || "retrospektiva")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fallbackSlug = roomId ? roomId.slice(0, 8) : "tym";
    a.download = `retro-qr-${sanitizedTitle || fallbackSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const subtitle = roomTitle
    ? `${teamName ? `${teamName} • ` : ""}${roomTitle}`
    : teamName
    ? `Přístup do týmu ${teamName}`
    : "Retrospektivní místnost";

  const expiresFormatted = expiresAt
    ? new Date(expiresAt).toLocaleTimeString("cs-CZ", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 250,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-indigo)",
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {roomId ? "Sdílet retrospektivu" : "Sdílet přístup do týmu"}
              </h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  margin: "2px 0 0 0",
                  maxWidth: "320px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zavřít"
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s ease",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "22px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            alignItems: "center",
          }}
        >
          {/* 1-hour expiration badge + auto-copy confirmation */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "var(--accent-amber)",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} />
                <span>
                  Platnost odkazu a QR kódu: 1 hodina
                  {expiresFormatted ? ` (do ${expiresFormatted})` : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={generateShareLink}
                disabled={isGenerating}
                title="Vygenerovat nový token na další hodinu"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  color: "inherit",
                  borderRadius: "var(--radius-sm)",
                  padding: "3px 8px",
                  fontSize: "0.73rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  cursor: isGenerating ? "not-allowed" : "pointer",
                }}
              >
                <RefreshCw size={11} />
                <span>Nový odkaz</span>
              </button>
            </div>

            {autoCopied && (
              <div
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "var(--accent-emerald)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Check size={14} />
                <span>Odkaz s 1h přístupem byl automaticky zkopírován do schránky</span>
              </div>
            )}
          </div>

          {/* QR Code Container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              width: "100%",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(255, 255, 255, 0.1)",
                minWidth: "212px",
                minHeight: "212px",
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR kód pro připojení k retrospektivě"
                  style={{
                    width: "180px",
                    height: "180px",
                    display: "block",
                    borderRadius: "4px",
                  }}
                />
              ) : errorMsg ? (
                <div
                  style={{
                    color: "var(--accent-rose)",
                    fontSize: "0.85rem",
                    textAlign: "center",
                    padding: "20px",
                    maxWidth: "190px",
                  }}
                >
                  {errorMsg}
                </div>
              ) : (
                <div
                  style={{
                    width: "180px",
                    height: "180px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                  }}
                >
                  Generuji šifrovaný odkaz...
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                Naskenujte fotoaparátem telefonu pro rychlé připojení bez hesla
              </span>
              {qrDataUrl && (
                <button
                  onClick={handleDownloadQr}
                  title="Stáhnout QR kód jako PNG obrázek"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    borderRadius: "var(--radius-sm)",
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Download size={13} />
                  <span>Stáhnout QR</span>
                </button>
              )}
            </div>
          </div>

          {/* URL & Copy Link Section */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Zabezpečený odkaz (platnost 1 hodina)
            </label>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                width: "100%",
              }}
            >
              <input
                type="text"
                readOnly
                value={url || (isGenerating ? "Generuji..." : "")}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!url}
                style={{
                  padding: "9px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: copied ? "var(--accent-emerald)" : "var(--accent-indigo)",
                  color: "#ffffff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: url ? "pointer" : "not-allowed",
                  opacity: url ? 1 : 0.6,
                  whiteSpace: "nowrap",
                  transition: "background 0.2s ease",
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Zkopírováno!" : "Kopírovat"}
              </button>
            </div>
          </div>

          {/* Info pill */}
          <div
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              lineHeight: 1.45,
            }}
          >
            <Users size={16} color="var(--accent-indigo)" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              Tento odkaz a QR kód umožní kolegům vstoupit přímo do{" "}
              <strong>{teamName || "týmu"}</strong> bez znalosti týmového hesla po dobu{" "}
              <strong>1 hodiny</strong> a automaticky jim přidělí anonymní zvířecí jméno.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(255, 255, 255, 0.01)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              fontSize: "0.85rem",
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
