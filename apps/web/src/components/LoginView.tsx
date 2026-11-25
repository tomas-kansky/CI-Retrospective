import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Sun, Moon, AlertTriangle, ShieldAlert, ArrowRight, RefreshCw } from "lucide-react";
import type { Team, UserRole } from "@ci-retro/types";

interface LoginViewProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  initialLockedUntil?: number | null;
  initialError?: string | null;
  onLoginSuccess: (payload: { role: UserRole; activeTeam: Team | null }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  theme,
  onToggleTheme,
  initialLockedUntil = null,
  initialError = null,
  onLoginSuccess,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [lockedUntil, setLockedUntil] = useState<number | null>(initialLockedUntil);

  useEffect(() => {
    setLockedUntil(initialLockedUntil);
  }, [initialLockedUntil]);

  useEffect(() => {
    if (initialError) {
      setErrorMsg(initialError);
    }
  }, [initialError]);

  const isLocked = Boolean(lockedUntil && lockedUntil > Date.now());

  useEffect(() => {
    if (!lockedUntil || lockedUntil <= Date.now()) return;
    const msLeft = lockedUntil - Date.now();
    const timer = setTimeout(() => {
      setLockedUntil(null);
      setErrorMsg(null);
    }, Math.min(msLeft, 2147483647));
    return () => clearTimeout(timer);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting || isLocked) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.authenticated) {
        setPassword("");
        onLoginSuccess({
          role: data.role,
          activeTeam: data.activeTeam || null,
        });
        return;
      }

      if (data.lockedUntil) {
        setLockedUntil(data.lockedUntil);
      }
      setErrorMsg(
        data.error || "Nepodařilo se přihlásit. Zkontrolujte zadané heslo."
      );
      setPassword("");
    } catch {
      setErrorMsg("Chyba spojení se serverem. Zkuste to prosím znovu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-color)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: "1rem",
            }}
          >
            R
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Retrospektiva
            </h1>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Zabezpečený týmový prostor
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-card)",
            color: "var(--text-main)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.85rem",
            border: "1px solid var(--border-color)",
          }}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "Světlý" : "Tmavý"}
        </button>
      </header>

      {/* Main Centered Login Card */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          className="glass-panel"
          style={{
            width: "100%",
            maxWidth: "440px",
            padding: "32px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 20px 48px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "22px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "10px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: isLocked
                  ? "rgba(244, 63, 94, 0.14)"
                  : "rgba(99, 102, 241, 0.14)",
                border: isLocked
                  ? "1px solid rgba(244, 63, 94, 0.35)"
                  : "1px solid rgba(99, 102, 241, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isLocked ? "var(--accent-rose)" : "var(--accent-indigo)",
              }}
            >
              {isLocked ? <ShieldAlert size={26} /> : <Lock size={24} />}
            </div>

            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              Přihlášení do Retrospektivy
            </h2>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Zadejte přístupové heslo svého týmu nebo administrátora. Případně použijte dočasný odkaz či QR kód od kolegy.
            </p>
          </div>

          {isLocked && lockedUntil ? (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background: "rgba(244, 63, 94, 0.12)",
                border: "1px solid rgba(244, 63, 94, 0.35)",
                color: "var(--text-main)",
                fontSize: "0.86rem",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <AlertTriangle size={18} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <div style={{ fontWeight: 700, color: "var(--accent-rose)", marginBottom: "4px" }}>
                  Přístup dočasně zablokován (24 hodin)
                </div>
                <div>
                  Kvůli 3 po sobě jdoucím chybným pokusům bylo přihlášení z tohoto zařízení pozastaveno.
                  Další pokus bude možný:{" "}
                  <strong>{new Date(lockedUntil).toLocaleString("cs-CZ")}</strong>.
                </div>
              </div>
            </div>
          ) : (
            errorMsg && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(244, 63, 94, 0.12)",
                  border: "1px solid rgba(244, 63, 94, 0.35)",
                  color: "var(--accent-rose)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  lineHeight: 1.45,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{errorMsg}</span>
              </div>
            )
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                htmlFor="login-password-input"
                style={{
                  display: "block",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  marginBottom: "8px",
                  color: "var(--text-main)",
                }}
              >
                Přístupové heslo
              </label>

              <div style={{ position: "relative" }}>
                <input
                  id="login-password-input"
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  autoComplete="current-password"
                  disabled={isLocked || isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.95rem",
                    opacity: isLocked ? 0.5 : 1,
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLocked}
                  title={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    padding: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isLocked ? "not-allowed" : "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLocked || isSubmitting || !password.trim()}
              style={{
                padding: "12px 20px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-indigo)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "var(--shadow-glow)",
                cursor: isLocked || isSubmitting || !password.trim() ? "not-allowed" : "pointer",
                opacity: isLocked || isSubmitting || !password.trim() ? 0.55 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} />
                  <span>Ověřuji...</span>
                </>
              ) : (
                <>
                  <span>Přihlásit se</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
