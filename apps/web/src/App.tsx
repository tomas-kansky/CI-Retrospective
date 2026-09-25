import React, { useState, useEffect } from "react";
import { Sparkles, Moon, Sun, Plus, RefreshCw, Layers, CheckCircle2, ChevronRight, X, ArrowRight, Bug } from "lucide-react";
import type { TemplateType, UserSession } from "@ci-retro/types";
import { BoardView } from "./components/BoardView";
import { BugReportModal } from "./components/BugReportModal";
import { getRandomAnonymousName } from "./utils/names";

interface RetroItem {
  id: string;
  title: string;
  phase: string;
  templateType: string;
  maxVotesPerUser: number;
  createdAt: string;
}

// Inicializace nebo načtení uživatelského profilu ze sessionStorage/localStorage
function getOrCreateUserSession(): UserSession {
  const saved = localStorage.getItem("ci_retro_user");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Pokud má uživatel staré jméno typu "Kolega #...", vyměníme ho za vtipné zvíře ve stylu Google Docs
      if (
        parsed &&
        (!parsed.name ||
          parsed.name.startsWith("Kolega #") ||
          parsed.name.startsWith("Kolega#") ||
          parsed.name === "Kolega")
      ) {
        parsed.name = getRandomAnonymousName();
        localStorage.setItem("ci_retro_user", JSON.stringify(parsed));
      }
      return parsed;
    } catch {}
  }

  const colors = [
    "#6366f1",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#f43f5e",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#3b82f6",
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const newUser: UserSession = {
    id: crypto.randomUUID(),
    name: getRandomAnonymousName(),
    avatarColor: randomColor,
    isAnonymous: false,
    isFacilitator: true, // Výchozí facilitátor pro lokální tvorbu
  };

  localStorage.setItem("ci_retro_user", JSON.stringify(newUser));
  return newUser;
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [currentUser, setCurrentUser] = useState<UserSession>(getOrCreateUserSession);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const [retros, setRetros] = useState<RetroItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState<boolean>(false);

  // Formulář pro novou retro
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("WENT_WELL_TO_IMPROVE");
  const [maxVotes, setMaxVotes] = useState(5);
  const [isCreating, setIsCreating] = useState(false);

  // Synchronizace s URL Hash routováním (#board/<id>)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#board/")) {
        const id = hash.replace("#board/", "");
        setCurrentRoomId(id);
      } else {
        setCurrentRoomId(null);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const loadRetrospectives = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/retrospectives");
      if (res.ok) {
        const data = await res.json();
        setRetros(data.retrospectives || []);
      }
    } catch (err) {
      console.error("Chyba při načítání retrospektiv:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRetrospectives();
  }, []);

  const handleCreateRetro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/retrospectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          templateType: selectedTemplate,
          maxVotesPerUser: maxVotes,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setNewTitle("");
        setIsModalOpen(false);
        await loadRetrospectives();
        // Přepnout přímo do místnosti
        window.location.hash = `#board/${created.id}`;
      }
    } catch (err) {
      alert("Chyba při zakládání retrospektivy: " + err);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleOpenRoom = (id: string) => {
    window.location.hash = `#board/${id}`;
  };

  const handleBackToDashboard = () => {
    window.location.hash = "";
    loadRetrospectives();
  };

  // Pokud je v URL vybrána konkrétní místnost, zobrazíme real-time BoardView
  if (currentRoomId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Global Small Header */}
        <header
          style={{
            borderBottom: "1px solid var(--border-color)",
            padding: "10px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-secondary)",
          }}
        >
          <div
            onClick={handleBackToDashboard}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.8rem",
              }}
            >
              CI
            </div>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              CI Retrospective
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Jste přihlášen jako: <strong>{currentUser.name}</strong>
            </span>
            <button
              onClick={toggleTheme}
              style={{
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                border: "1px solid var(--border-color)",
              }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </header>

        <BoardView
          roomId={currentRoomId}
          user={currentUser}
          onBack={handleBackToDashboard}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            localStorage.setItem("ci_retro_user", JSON.stringify(updated));
          }}
        />
      </div>
    );
  }

  // Dashboard View
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
            CI
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              CI Retrospective
            </h1>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Cloudflare Native Edge Architecture
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.8rem",
              padding: "6px 12px",
              borderRadius: "var(--radius-full)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--accent-emerald)",
              }}
            />
            {currentUser.name}
          </div>

          <button
            onClick={toggleTheme}
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
            onClick={() => setIsBugReportOpen(true)}
            title="Nahlásit chybu nebo zpětnou vazbu"
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
              cursor: "pointer",
            }}
          >
            <Bug size={15} />
            <span>Nahlásit chybu</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main style={{ flex: 1, padding: "32px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {/* Banner */}
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
              <Sparkles size={14} /> Fáze 2: WebSocket Hibernation & Real-time Edge
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "8px" }}>
              Agilní retrospektivy bez hranic
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "560px" }}>
              Blesková synchronizace přes Cloudflare Durable Objects s podporou atomického hlasování,
              bezpečného maskování karet a odpočtu času.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
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
            <Plus size={20} /> Vytvořit retrospektivu
          </button>
        </section>

        {/* Retrospectives Grid / List */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={20} color="var(--accent-indigo)" />
              Dostupné retrospektivy ({retros.length})
            </h3>
            <button
              onClick={loadRetrospectives}
              title="Obnovit seznam"
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
              Načítám retrospektivy z Cloudflare D1 databáze...
            </p>
          ) : retros.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
              {retros.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleOpenRoom(r.id)}
                  className="glass-panel"
                  style={{
                    padding: "22px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-active)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{r.title}</h4>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        background: "rgba(99, 102, 241, 0.12)",
                        color: "var(--accent-indigo)",
                        fontWeight: 600,
                      }}
                    >
                      {r.phase}
                    </span>
                  </div>

                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                    Šablona: {r.templateType} • Max hlasů: {r.maxVotesPerUser}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "8px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                      {new Date(r.createdAt).toLocaleString("cs-CZ")}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.82rem",
                        color: "var(--accent-indigo)",
                        fontWeight: 700,
                      }}
                    >
                      Vstoupit do místnosti <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="glass-panel"
              style={{
                padding: "60px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <Layers size={48} color="var(--accent-indigo)" />
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Zatím žádná retrospektiva</h3>
              <p style={{ color: "var(--text-muted)", maxWidth: "420px", fontSize: "0.95rem" }}>
                Vytvořte svou první místnost s libovolnou šablonou a pozvěte svůj tým ke společnému brainstormingu.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: "10px 22px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent-indigo)",
                  color: "#ffffff",
                  fontWeight: 600,
                  marginTop: "8px",
                }}
              >
                Vytvořit první retrospektivu
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal pro novou retrospektivu */}
      {isModalOpen && (
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
            zIndex: 100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "28px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Založit novou retrospektivu</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "transparent", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRetro} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>
                  Název retrospektivy / sprintu
                </label>
                <input
                  type="text"
                  placeholder="např. Sprint 43 - Team Retrospective"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
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
                  Výchozí šablona sloupců
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value as TemplateType)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="WENT_WELL_TO_IMPROVE">Went Well / To Improve / Action Items</option>
                  <option value="MAD_SAD_GLAD">Mad / Sad / Glad</option>
                  <option value="START_STOP_CONTINUE">Start / Stop / Continue</option>
                  <option value="FOUR_LS">4Ls (Liked, Learned, Lacked, Longed for)</option>
                  <option value="CUSTOM">Vlastní prázdné sloupce</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>
                  Limit hlasů na účastníka
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxVotes}
                  onChange={(e) => setMaxVotes(parseInt(e.target.value, 10) || 5)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "0.95rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "10px 18px",
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
                    padding: "10px 20px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-indigo)",
                    color: "#ffffff",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isCreating ? <RefreshCw size={16} className="spin" /> : <Plus size={16} />}
                  {isCreating ? "Vytvářím v D1..." : "Vytvořit a otevřít"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};
