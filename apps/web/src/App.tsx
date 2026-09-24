import React, { useState, useEffect } from "react";
import { Sparkles, Moon, Sun, Users, Clock, ShieldCheck, Plus, ArrowRight } from "lucide-react";
import type { RetrospectiveState, Column, RetroPhase } from "@ci-retro/types";

export const App: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [serverStatus, setServerStatus] = useState<string>("Ověřuji spojení se serverem...");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: any) => {
        setServerStatus(`Cloudflare Edge Worker aktivní (${data.status})`);
      })
      .catch(() => {
        setServerStatus("Lokální Worker ještě neběží (spusťte npm run dev:server)");
      });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Demonstrujeme použití sdílených typů z @ci-retro/types
  const mockColumns: Column[] = [
    { id: "col-1", title: "Co se povedlo (Went well)", color: "#10b981", sortOrder: 0 },
    { id: "col-2", title: "Co zlepšit (To improve)", color: "#f43f5e", sortOrder: 1 },
    { id: "col-3", title: "Akční kroky (Action items)", color: "#6366f1", sortOrder: 2 },
  ];

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
              Cloudflare Native Real-time Board
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

      {/* Main Container */}
      <main style={{ flex: 1, padding: "32px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {/* Hero Banner */}
        <section
          className="glass-panel"
          style={{
            padding: "28px 32px",
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
              <Sparkles size={14} /> Fáze 1: Inicializace Monorepa dokončena
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "8px" }}>
              Sprint 42 Retrospective
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "600px" }}>
              Real-time kolaborace s podporou WebSockets, Cloudflare Durable Objects a atomickým hlasováním.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
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

        {/* Preview of Columns (Mock layout showcasing the structure) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          {mockColumns.map((col) => (
            <div
              key={col.id}
              className="glass-panel"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                minHeight: "400px",
                borderTop: `4px solid ${col.color}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{col.title}</h3>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-muted)",
                  }}
                >
                  0 karet
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
                Přetáhněte sem kartu nebo klikněte níže na + Přidat kartu
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
      </main>
    </div>
  );
};
