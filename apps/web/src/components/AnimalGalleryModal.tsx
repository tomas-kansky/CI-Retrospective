import React from "react";
import { X, Sparkles, Users } from "lucide-react";
import type { UserSession } from "@ci-retro/types";
import { getAnimalVisualInfo, type AnimalVisualInfo } from "../utils/names";

interface AnimalGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: UserSession[];
  currentUserId: string;
  typingUserIds?: string[];
  onRollRandomName?: () => void;
}

export const AnimalPortraitSvg: React.FC<{
  visual: AnimalVisualInfo;
  avatarColor?: string;
  size?: number;
}> = ({ visual, avatarColor = "#6366f1", size = 96 }) => {
  const primary = avatarColor || visual.accentColor;
  const secondary = visual.accentColor;

  return (
    <div
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "24px",
        background: `radial-gradient(circle at 30% 25%, ${primary}44, ${secondary}22 70%, rgba(15, 23, 42, 0.85))`,
        border: `2px solid ${primary}88`,
        boxShadow: `0 10px 24px -6px ${primary}55`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        style={{ display: "block" }}
        aria-label={visual.animal}
      >
        {/* Jemná záře v pozadí */}
        <circle cx="60" cy="64" r="44" fill={primary} opacity="0.18" />

        {/* Uši / rohy / chocholka podle typu zvířátka */}
        {visual.earStyle === "round" && (
          <>
            <circle cx="32" cy="36" r="15" fill={primary} />
            <circle cx="32" cy="36" r="8" fill="#fda4af" opacity="0.75" />
            <circle cx="88" cy="36" r="15" fill={primary} />
            <circle cx="88" cy="36" r="8" fill="#fda4af" opacity="0.75" />
          </>
        )}
        {visual.earStyle === "pointy" && (
          <>
            <polygon points="22,48 30,16 48,36" fill={primary} />
            <polygon points="27,43 32,23 43,36" fill="#fda4af" opacity="0.75" />
            <polygon points="98,48 90,16 72,36" fill={primary} />
            <polygon points="93,43 88,23 77,36" fill="#fda4af" opacity="0.75" />
          </>
        )}
        {visual.earStyle === "long" && (
          <>
            <ellipse cx="36" cy="26" rx="9" ry="20" transform="rotate(-12 36 26)" fill={primary} />
            <ellipse cx="36" cy="26" rx="4.5" ry="13" transform="rotate(-12 36 26)" fill="#fda4af" opacity="0.8" />
            <ellipse cx="84" cy="26" rx="9" ry="20" transform="rotate(12 84 26)" fill={primary} />
            <ellipse cx="84" cy="26" rx="4.5" ry="13" transform="rotate(12 84 26)" fill="#fda4af" opacity="0.8" />
          </>
        )}
        {visual.earStyle === "tuft" && (
          <>
            <path d="M52 26 Q60 10 68 26" stroke={secondary} strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M45 30 Q60 14 75 30" stroke={primary} strokeWidth="5" strokeLinecap="round" fill="none" />
          </>
        )}
        {visual.earStyle === "horns" && (
          <>
            <polygon points="55,30 60,8 65,30" fill="#fde047" />
          </>
        )}

        {/* Hlava zvířátka */}
        <circle cx="60" cy="64" r="34" fill={primary} />
        <ellipse cx="60" cy="70" rx="26" ry="22" fill="#ffffff" opacity="0.18" />

        {/* Tvářičky */}
        <circle cx="38" cy="68" r="6" fill="#fb7185" opacity="0.55" />
        <circle cx="82" cy="68" r="6" fill="#fb7185" opacity="0.55" />

        {/* Oči */}
        <circle cx="46" cy="56" r="5.5" fill="#0f172a" />
        <circle cx="44.5" cy="54" r="2" fill="#ffffff" />
        <circle cx="74" cy="56" r="5.5" fill="#0f172a" />
        <circle cx="72.5" cy="54" r="2" fill="#ffffff" />

        {/* Čumáček / zobák / fousky */}
        {visual.snoutStyle === "beak" && (
          <polygon points="50,64 70,64 60,79" fill="#fbbf24" />
        )}
        {visual.snoutStyle === "longBeak" && (
          <polygon points="48,63 72,63 60,86" fill="#f59e0b" />
        )}
        {visual.snoutStyle === "trunk" && (
          <path
            d="M55 64 Q60 86 68 80"
            stroke="#0f172a"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {(visual.snoutStyle === "round" ||
          visual.snoutStyle === "wide" ||
          visual.snoutStyle === "whiskers") && (
          <>
            <ellipse
              cx="60"
              cy="69"
              rx={visual.snoutStyle === "wide" ? 14 : 10}
              ry="8"
              fill="#f8fafc"
              opacity="0.9"
            />
            <ellipse cx="60" cy="66" rx="5" ry="3.5" fill="#0f172a" />
            <path
              d="M54 73 Q60 78 66 73"
              stroke="#0f172a"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}
        {visual.snoutStyle === "whiskers" && (
          <>
            <line x1="28" y1="66" x2="44" y2="68" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <line x1="28" y1="73" x2="44" y2="72" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <line x1="92" y1="66" x2="76" y2="68" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <line x1="92" y1="73" x2="76" y2="72" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          </>
        )}
      </svg>

      {/* Odznak se symbolem zvířátka v rohu portrétu */}
      <div
        style={{
          position: "absolute",
          bottom: "4px",
          right: "4px",
          width: `${Math.max(22, Math.round(size * 0.3))}px`,
          height: `${Math.max(22, Math.round(size * 0.3))}px`,
          borderRadius: "50%",
          background: "rgba(15, 23, 42, 0.9)",
          border: `1.5px solid ${primary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `${Math.max(12, Math.round(size * 0.18))}px`,
          lineHeight: 1,
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
        }}
      >
        {visual.emoji}
      </div>
    </div>
  );
};

export const AnimalGalleryModal: React.FC<AnimalGalleryModalProps> = ({
  isOpen,
  onClose,
  onlineUsers,
  currentUserId,
  typingUserIds = [],
  onRollRandomName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 220,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "740px",
          maxHeight: "86vh",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.55)",
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
                width: "42px",
                height: "42px",
                borderRadius: "var(--radius-md)",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.35rem",
              }}
            >
              🐾
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                Galerie připojených zvířátek ({onlineUsers.length})
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Přehled všech zvířátek, která jsou právě teď připojená na této tabuli
              </p>
            </div>
          </div>

          <button
            type="button"
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

        {/* Grid of Connected Animals */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {onlineUsers.map((u) => {
            const isMe = u.id === currentUserId;
            const isTyping = typingUserIds.includes(u.id);
            const visual = getAnimalVisualInfo(u.name);

            return (
              <div
                key={u.id}
                style={{
                  padding: "18px 16px",
                  borderRadius: "var(--radius-md)",
                  background: isMe
                    ? "linear-gradient(180deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04))"
                    : "var(--bg-card)",
                  border: isMe
                    ? "1.5px solid var(--accent-indigo)"
                    : "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "12px",
                  position: "relative",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Online / Typing Status Pill */}
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: isTyping
                      ? "rgba(99, 102, 241, 0.2)"
                      : "rgba(16, 185, 129, 0.15)",
                    border: isTyping
                      ? "1px solid rgba(99, 102, 241, 0.4)"
                      : "1px solid rgba(16, 185, 129, 0.35)",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: isTyping ? "var(--accent-indigo)" : "var(--accent-emerald)",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: isTyping ? "var(--accent-indigo)" : "var(--accent-emerald)",
                    }}
                  />
                  <span>{isTyping ? "Píše..." : "Online"}</span>
                </div>

                {/* Illustrated Animal Portrait */}
                <AnimalPortraitSvg
                  visual={visual}
                  avatarColor={u.avatarColor}
                  size={96}
                />

                {/* Name & Species Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: isMe ? "var(--accent-indigo)" : "var(--text-main)",
                      wordBreak: "break-word",
                    }}
                  >
                    {u.name} {isMe ? "(Vy)" : ""}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                    }}
                  >
                    {visual.emoji} {visual.animal}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-dim)",
                      fontStyle: "italic",
                    }}
                  >
                    „{visual.trait}“
                  </div>
                </div>

                {/* Action for current user to roll another animal */}
                {isMe && onRollRandomName && (
                  <button
                    type="button"
                    onClick={onRollRandomName}
                    style={{
                      marginTop: "2px",
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(99, 102, 241, 0.16)",
                      border: "1px solid rgba(99, 102, 241, 0.35)",
                      color: "var(--accent-indigo)",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Sparkles size={12} />
                    <span>Jiné zvířátko</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-card)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Users size={15} color="var(--accent-indigo)" />
            <span>
              Aktuálně připojeno: <strong style={{ color: "var(--text-main)" }}>{onlineUsers.length}</strong> zvířátek
            </span>
          </span>
          <button
            type="button"
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
