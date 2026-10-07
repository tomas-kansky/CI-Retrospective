import React, { useState, useEffect } from "react";
import { X, Copy, Check, QrCode, Download, ExternalLink, Users } from "lucide-react";
import QRCode from "qrcode";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomTitle: string;
  shareUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  shareUrl: customShareUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const url = customShareUrl || (typeof window !== "undefined" ? window.location.href : "");

  useEffect(() => {
    if (!isOpen || !url) return;

    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((dataUri) => {
        setQrDataUrl(dataUri);
        setQrError(null);
      })
      .catch((err) => {
        console.error("Chyba při generování QR kódu:", err);
        setQrError("Nepodařilo se vygenerovat QR kód.");
      });
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Nepodařilo se zkopírovat odkaz:", err);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const sanitizedTitle = (roomTitle || "retrospektiva")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    a.download = `retro-qr-${sanitizedTitle || roomId.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
                Sdílet retrospektivu
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
                {roomTitle || "Retrospektivní místnost"}
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
            gap: "20px",
            alignItems: "center",
          }}
        >
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
              ) : qrError ? (
                <div
                  style={{
                    color: "var(--accent-rose)",
                    fontSize: "0.85rem",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  {qrError}
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
                  Generuji QR kód...
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                Naskenujte fotoaparátem telefonu pro rychlé připojení
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
              Přímý odkaz do místnosti
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
                value={url}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                onClick={handleCopyLink}
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
                  cursor: "pointer",
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
              Účastníci nepotřebují registraci ani přihlášení. Po otevření odkazu jim bude automaticky
              přiděleno anonymní zvířecí jméno pro bezpečnou a otevřenou diskuzi.
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
