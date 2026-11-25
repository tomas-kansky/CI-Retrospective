import React, { useState } from "react";
import {
  Shield,
  Plus,
  Users,
  Layers,
  CheckSquare,
  ArrowRight,
  Pencil,
  KeyRound,
  Trash2,
  Share2,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import type { AdminTeamSummary, Team } from "@ci-retro/types";

interface AdminTeamsViewProps {
  teams: AdminTeamSummary[];
  isLoading: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  onSelectTeam: (team: Team) => void;
  onShareTeam: (team: Team) => void;
}

export const AdminTeamsView: React.FC<AdminTeamsViewProps> = ({
  teams,
  isLoading,
  theme,
  onToggleTheme,
  onLogout,
  onRefresh,
  onSelectTeam,
  onShareTeam,
}) => {
  // Modal vytvoření týmu
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Modal přejmenování týmu
  const [renameTarget, setRenameTarget] = useState<AdminTeamSummary | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  // Modal změny hesla týmu
  const [passwordTarget, setPasswordTarget] = useState<AdminTeamSummary | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [showUpdatedPassword, setShowUpdatedPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Modal smazání týmu
  const [deleteTarget, setDeleteTarget] = useState<AdminTeamSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPassword || isCreating) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || "Nepodařilo se vytvořit tým.");
        return;
      }
      setNewName("");
      setNewPassword("");
      setShowNewPassword(false);
      setIsCreateOpen(false);
      onRefresh();
    } catch {
      setCreateError("Chyba spojení se serverem.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInput.trim() || isRenaming) return;

    setIsRenaming(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/admin/teams/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRenameError(data.error || "Nepodařilo se přejmenovat tým.");
        return;
      }
      setRenameTarget(null);
      onRefresh();
    } catch {
      setRenameError("Chyba spojení se serverem.");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget || !passwordInput || isSavingPassword) return;

    setIsSavingPassword(true);
    setPasswordError(null);
    try {
      const res = await fetch(`/api/admin/teams/${passwordTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data.error || "Nepodařilo se změnit heslo týmu.");
        return;
      }
      setPasswordTarget(null);
      setPasswordInput("");
      setShowUpdatedPassword(false);
      onRefresh();
    } catch {
      setPasswordError("Chyba spojení se serverem.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/teams/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error || "Nepodařilo se smazat tým.");
        return;
      }
      setDeleteTarget(null);
      onRefresh();
    } catch {
      setDeleteError("Chyba spojení se serverem.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-color)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-secondary)",
          flexWrap: "wrap",
          gap: "12px",
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
            }}
          >
            R
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Retrospektiva
            </h1>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Admin správa týmů
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              background: "rgba(99, 102, 241, 0.14)",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              color: "var(--accent-indigo)",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            <Shield size={14} />
            <span>Admin</span>
          </span>

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

          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              background: "rgba(244, 63, 94, 0.08)",
              color: "var(--accent-rose)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "1px solid rgba(244, 63, 94, 0.3)",
            }}
          >
            <LogOut size={15} />
            <span>Odhlásit</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "32px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {/* Hero */}
        <section
          className="glass-panel"
          style={{
            padding: "32px",
            marginBottom: "36px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.08))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
                background: "rgba(99, 102, 241, 0.15)",
                color: "var(--accent-indigo)",
                fontSize: "0.75rem",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              <Shield size={14} /> Administrátorské rozhraní
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "8px" }}>
              Správa týmů a squadů
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "580px" }}>
              Každý tým má vlastní izolované úložiště retrospektiv, akčních kroků i unikátní přístupové heslo.
              Proklikem do týmu otevřete jeho domovskou obrazovku a tabule.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewName("");
              setNewPassword("");
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            style={{
              padding: "12px 24px",
              borderRadius: "var(--radius-md)",
              background: "var(--accent-indigo)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <Plus size={20} /> Vytvořit tým / squad
          </button>
        </section>

        {/* Teams Grid Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={20} color="var(--accent-indigo)" />
            Aktivní týmy ({teams.length})
          </h3>
          <button
            type="button"
            onClick={onRefresh}
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
            }}
          >
            <RefreshCw size={14} /> Obnovit
          </button>
        </div>

        {isLoading ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>
            Načítám týmy z databáze...
          </p>
        ) : teams.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => onSelectTeam(team)}
                className="glass-panel"
                style={{
                  padding: "22px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  transition: "transform 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-active)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div>
                    <h4 style={{ fontSize: "1.18rem", fontWeight: 800, margin: 0 }}>{team.name}</h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                      Vytvořeno {new Date(team.createdAt).toLocaleDateString("cs-CZ")}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(99, 102, 241, 0.12)",
                      color: "var(--accent-indigo)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    <Layers size={13} />
                    <span>{team.retroCount} retrospektiv</span>
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--accent-emerald)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    <CheckSquare size={13} />
                    <span>{team.openActionItemsCount} akčních kroků</span>
                  </span>
                </div>

                {/* Action buttons */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onShareTeam(team)}
                    title="Sdílet tým (1h odkaz + QR kód)"
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(99, 102, 241, 0.12)",
                      color: "var(--accent-indigo)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Share2 size={12} /> Sdílet
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRenameTarget(team);
                      setRenameInput(team.name);
                      setRenameError(null);
                    }}
                    title="Přejmenovat tým"
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Pencil size={12} /> Přejmenovat
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPasswordTarget(team);
                      setPasswordInput("");
                      setShowUpdatedPassword(false);
                      setPasswordError(null);
                    }}
                    title="Změnit přístupové heslo týmu"
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <KeyRound size={12} /> Heslo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(team);
                      setDeleteError(null);
                    }}
                    title="Smazat tým včetně všech retrospektiv"
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(244, 63, 94, 0.08)",
                      color: "var(--accent-rose)",
                      border: "1px solid rgba(244, 63, 94, 0.25)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Trash2 size={12} /> Smazat
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.84rem",
                      color: "var(--accent-indigo)",
                      fontWeight: 700,
                    }}
                  >
                    Otevřít tým <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: "50px 20px", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)" }}>Zatím není vytvořen žádný tým.</p>
          </div>
        )}
      </main>

      {/* Modal: Vytvořit tým */}
      {isCreateOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 200,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>Vytvořit nový tým / squad</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ background: "transparent", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(244, 63, 94, 0.12)",
                  border: "1px solid rgba(244, 63, 94, 0.35)",
                  color: "var(--accent-rose)",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTeam} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>
                  Název týmu / squadu
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="např. Platform Core"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.95rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>
                  Přístupové heslo pro tým (min. 4 znaky)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={4}
                    maxLength={128}
                    placeholder="Zadejte unikátní heslo"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 42px 11px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-main)",
                      fontSize: "0.95rem",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      color: "var(--text-muted)",
                      padding: "4px",
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-indigo)",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  {isCreating ? "Vytvářím..." : "Vytvořit tým"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Přejmenovat tým */}
      {renameTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 200,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "28px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>Přejmenovat tým</h3>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                style={{ background: "transparent", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {renameError && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(244, 63, 94, 0.12)",
                  color: "var(--accent-rose)",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                }}
              >
                {renameError}
              </div>
            )}

            <form onSubmit={handleRenameTeam} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <input
                type="text"
                autoFocus
                required
                minLength={2}
                maxLength={80}
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "0.95rem",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isRenaming}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-indigo)",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  {isRenaming ? "Ukládám..." : "Uložit název"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Změnit heslo týmu */}
      {passwordTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 200,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "28px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                Změnit heslo: {passwordTarget.name}
              </h3>
              <button
                type="button"
                onClick={() => setPasswordTarget(null)}
                style={{ background: "transparent", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {passwordError && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(244, 63, 94, 0.12)",
                  color: "var(--accent-rose)",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                }}
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ position: "relative" }}>
                <input
                  type={showUpdatedPassword ? "text" : "password"}
                  autoFocus
                  required
                  minLength={4}
                  maxLength={128}
                  placeholder="Nové heslo týmu (min. 4 znaky)"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 42px 11px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.95rem",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowUpdatedPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    padding: "4px",
                  }}
                >
                  {showUpdatedPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setPasswordTarget(null)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-indigo)",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  {isSavingPassword ? "Ukládám..." : "Změnit heslo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Potvrzení smazání týmu */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 200,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              background: "var(--bg-secondary)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <AlertTriangle size={22} color="var(--accent-rose)" />
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                Smazat tým {deleteTarget.name}?
              </h3>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "16px" }}>
              Tato akce nevratně smaže tým <strong>{deleteTarget.name}</strong>, všechny jeho retrospektivy (
              {deleteTarget.retroCount}), karty, hlasy i akční kroky.
            </p>

            {deleteError && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(244, 63, 94, 0.12)",
                  color: "var(--accent-rose)",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                disabled={isDeleting}
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-rose)",
                  color: "#ffffff",
                  fontWeight: 700,
                }}
              >
                {isDeleting ? "Mažu..." : "Ano, trvale smazat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
