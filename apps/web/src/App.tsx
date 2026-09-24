import React, { useState, useEffect } from "react";
import { Sparkles, Moon, Sun, Plus, RefreshCw, Layers, CheckCircle2, ChevronRight, X } from "lucide-react";
import type { TemplateType } from "@ci-retro/types";

interface RetroItem {
  id: string;
  title: string;
  phase: string;
  templateType: string;
  maxVotesPerUser: number;
  createdAt: string;
}

interface ColumnItem {
  id: string;
  title: string;
  color: string;
  sortOrder: number;
}

interface CurrentRetroDetail {
  id: string;
  title: string;
  phase: string;
  templateType: string;
  maxVotesPerUser: number;
  columns: ColumnItem[];
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [serverStatus, setServerStatus] = useState<string>("Ověřuji spojení se serverem...");
  const [retros, setRetros] = useState<RetroItem[]>([]);
  const [activeRetro, setActiveRetro] = useState<CurrentRetroDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Formulář pro novou retro
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("WENT_WELL_TO_IMPROVE");
  const [maxVotes, setMaxVotes] = useState(5);
  const [isCreating, setIsCreating] = useState(false);

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
        setServerStatus("Cloudflare Worker & D1 aktivní");

        // Pokud máme retrospektivy a žádná není aktivní, načteme první
        if (data.retrospectives?.length > 0 && !activeRetro) {
          loadRetroDetail(data.retrospectives[0].id);
        }
      } else {
        setServerStatus("Server odpověděl chybou");
      }
    } catch {
      setServerStatus("Lokální Worker ještě neběží na :8787");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRetroDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/retrospectives/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRetro(data.retrospective);
      }
    } catch (err) {
      console.error("Chyba při načítání detailu:", err);
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
        await loadRetroDetail(created.id);
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
                background: serverStatus.includes("aktivní") ? "var(--accent-emerald)" : "var(--accent-amber)",
              }}
            />
            {serverStatus}
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
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "32px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {/* Banner */}
        <section
          className="glass-panel"
          style={{
            padding: "24px 32px",
            marginBottom: "32px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
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
                marginBottom: "8px",
              }}
            >
              <Sparkles size={14} /> Fáze 1: D1 Databáze & Drizzle ORM aktivní
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "6px" }}>
              {activeRetro ? activeRetro.title : "Agilní Retrospektivy"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              {activeRetro
                ? `Šablona: ${activeRetro.templateType} • Fáze: ${activeRetro.phase} • Max hlasů: ${activeRetro.maxVotesPerUser}`
                : "Vytvořte novou retrospektivu nebo vyberte existující ze seznamu."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: "10px 18px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-indigo)",
                color: "#ffffff",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <Plus size={18} /> Nová retrospektiva
            </button>
          </div>
        </section>

        {/* Board Columns Display */}
        {activeRetro && activeRetro.columns?.length > 0 ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={18} color="var(--accent-indigo)" /> Sloupce retrospektivy
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                ID: {activeRetro.id}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {activeRetro.columns.map((col) => (
                <div
                  key={col.id}
                  className="glass-panel"
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    minHeight: "360px",
                    borderTop: `4px solid ${col.color}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{col.title}</h4>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-muted)",
                      }}
                    >
                      D1 ID: {col.id.slice(0, 8)}...
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px dashed var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-dim)",
                      fontSize: "0.85rem",
                      padding: "24px",
                      textAlign: "center",
                    }}
                  >
                    V Tasku 2.1 – 2.2 propojíme WebSockets pro real-time přidávání a hlasování o kartách.
                  </div>

                  <button
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(255, 255, 255, 0.04)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    <Plus size={16} /> Přidat kartu
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="glass-panel"
            style={{
              padding: "48px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <Layers size={40} color="var(--accent-indigo)" />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Žádná retrospektiva zatím nebyla vybrána</h3>
            <p style={{ color: "var(--text-muted)", maxWidth: "450px", fontSize: "0.9rem" }}>
              Klikněte na tlačítko "Nová retrospektiva" pro vytvoření první schůzky s uložením do Cloudflare D1 databáze.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: "10px 20px",
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

        {/* Existing Retrospectives List */}
        {retros.length > 0 && (
          <section style={{ marginTop: "48px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={18} color="var(--accent-emerald)" /> Uložené retrospektivy v Cloudflare D1 ({retros.length})
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              {retros.map((r) => (
                <div
                  key={r.id}
                  onClick={() => loadRetroDetail(r.id)}
                  className="glass-panel"
                  style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    border: activeRetro?.id === r.id ? "1px solid var(--accent-indigo)" : "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "4px" }}>{r.title}</h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {new Date(r.createdAt).toLocaleString("cs-CZ")}
                    </span>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </section>
        )}
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
                  {isCreating ? "Vytvářím v D1..." : "Vytvořit a uložit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
