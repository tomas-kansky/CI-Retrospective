import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Moon,
  Sun,
  Plus,
  RefreshCw,
  Layers,
  X,
  ArrowRight,
  Bug,
  CheckSquare,
  Share2,
  Shield,
  LogOut,
  ArrowLeft,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { AdminTeamSummary, Team, TemplateType, UserRole, UserSession } from "@ci-retro/types";
import { BoardView } from "./components/BoardView";
import { BugReportModal } from "./components/BugReportModal";
import { GlobalActionItemsModal } from "./components/GlobalActionItemsModal";
import { AnimalGalleryModal } from "./components/AnimalGalleryModal";
import { LoginView } from "./components/LoginView";
import { AdminTeamsView } from "./components/AdminTeamsView";
import { ShareModal } from "./components/ShareModal";
import { getRandomAnonymousName, getAnimalVisualInfo } from "./utils/names";

interface RetroItem {
  id: string;
  teamId?: string;
  title: string;
  phase: string;
  templateType: string;
  maxVotesPerUser: number;
  createdAt: string;
}

const USER_STORAGE_KEY = "ci_retro_user";

const TEMPLATE_LABELS: Record<string, string> = {
  WENT_WELL_TO_IMPROVE: "Went Well / To Improve / Action Items",
  PUB_RETRO: "🍺 Na co si připijeme / 🤬 Zapičuj si / 🛠️ Jak to příště neposrat",
};

function getTemplateLabel(templateType: string): string {
  return TEMPLATE_LABELS[templateType] || templateType;
}

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultRetroTitle(): string {
  return new Date().toLocaleDateString("cs-CZ");
}

function getEndOfDayTimestamp(): number {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

function saveDailyUserSession(session: UserSession): void {
  try {
    const payload = {
      ...session,
      dateKey: getTodayDateKey(),
      expiresAt: getEndOfDayTimestamp(),
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

// Načtení nebo vytvoření denního profilu (platného do konce aktuálního kalendářního dne 23:59:59).
function getOrCreateDailyUserSession(): UserSession {
  const todayKey = getTodayDateKey();
  const now = Date.now();

  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.id === "string" &&
        typeof parsed.name === "string" &&
        parsed.dateKey === todayKey &&
        typeof parsed.expiresAt === "number" &&
        parsed.expiresAt > now
      ) {
        const session: UserSession = {
          id: parsed.id,
          name: parsed.name,
          avatarColor: parsed.avatarColor || "#6366f1",
          isAnonymous: Boolean(parsed.isAnonymous),
          isFacilitator: parsed.isFacilitator !== false,
        };
        return session;
      }
    }
  } catch {}

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

  const newSession: UserSession = {
    id: crypto.randomUUID(),
    name: getRandomAnonymousName(),
    avatarColor: randomColor,
    isAnonymous: false,
    isFacilitator: true,
  };

  saveDailyUserSession(newSession);
  return newSession;
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [currentUser, setCurrentUser] = useState<UserSession>(getOrCreateDailyUserSession);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Autentizace & multi-tenancy stavy
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin správa týmů
  const [adminTeams, setAdminTeams] = useState<AdminTeamSummary[]>([]);
  const [adminTeamsLoading, setAdminTeamsLoading] = useState<boolean>(false);
  const [shareTargetTeam, setShareTargetTeam] = useState<Team | null>(null);
  const [resolvingRoomTeam, setResolvingRoomTeam] = useState<boolean>(false);

  // Stavy Dashboardu aktivního týmu
  const [retros, setRetros] = useState<RetroItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState<boolean>(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState<boolean>(false);
  const [isAnimalGalleryOpen, setIsAnimalGalleryOpen] = useState<boolean>(false);
  const [isDashboardShareOpen, setIsDashboardShareOpen] = useState<boolean>(false);
  const [openActionItemsCount, setOpenActionItemsCount] = useState<number>(0);
  const [retroToDelete, setRetroToDelete] = useState<RetroItem | null>(null);
  const [isDeletingRetro, setIsDeletingRetro] = useState<boolean>(false);

  // Formulář pro novou retro (defaultně předvyplněný na dnešní datum)
  const [newTitle, setNewTitle] = useState(getDefaultRetroTitle);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("WENT_WELL_TO_IMPROVE");
  const [maxVotes, setMaxVotes] = useState(5);
  const [isCreating, setIsCreating] = useState(false);

  const isAdmin = role === "admin";
  const effectiveUser: UserSession = isAdmin
    ? { ...currentUser, name: "Admin", isFacilitator: true }
    : currentUser;

  const handleOpenCreateModal = () => {
    setNewTitle(getDefaultRetroTitle());
    setIsModalOpen(true);
  };

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

  // Při návratu na záložku zkontrolujeme denní expiraci anonymního zvířecího jména
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const refreshed = getOrCreateDailyUserSession();
        setCurrentUser((prev) => (prev.id !== refreshed.id ? refreshed : prev));
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleUnauthorized = useCallback(async () => {
    setAuthenticated(false);
    setRole(null);
    setActiveTeam(null);
    setRetros([]);
    setOpenActionItemsCount(0);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setLockedUntil(data.lockedUntil || null);
      }
    } catch {}
  }, []);

  // Úvodní ověření ?invite=<token> z URL nebo stávající cookie session (/api/auth/me)
  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      setAuthLoading(true);
      let inviteError: string | null = null;

      try {
        const params = new URLSearchParams(window.location.search);
        const inviteToken = params.get("invite");

        if (inviteToken) {
          const exchangeRes = await fetch("/api/auth/exchange-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: inviteToken }),
          });
          const exchangeData = await exchangeRes.json().catch(() => ({}));

          if (!cancelled && exchangeRes.ok && exchangeData.authenticated) {
            const nextHash = exchangeData.roomId
              ? `#board/${exchangeData.roomId}`
              : window.location.hash;
            window.history.replaceState(null, "", window.location.pathname + nextHash);
            if (exchangeData.roomId) {
              setCurrentRoomId(exchangeData.roomId);
            }
            setAuthenticated(true);
            setRole(exchangeData.role || "user");
            setActiveTeam(exchangeData.activeTeam || null);
            setLockedUntil(null);
            setAuthError(null);
            setAuthLoading(false);
            return;
          }

          window.history.replaceState(null, "", window.location.pathname + window.location.hash);
          inviteError =
            exchangeData.error ||
            "Sdílený odkaz je neplatný nebo již vypršel (platnost odkazu je 1 hodina).";
        }

        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json().catch(() => ({}));
        if (cancelled) return;

        if (meRes.ok && meData.authenticated) {
          setAuthenticated(true);
          setRole(meData.role || "user");
          setActiveTeam(meData.activeTeam || null);
          setLockedUntil(null);
          setAuthError(null);
        } else {
          setAuthenticated(false);
          setRole(null);
          setActiveTeam(null);
          setLockedUntil(meData.lockedUntil || null);
          setAuthError(inviteError);
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
          setAuthError(inviteError || "Nepodařilo se ověřit přihlášení.");
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAdminTeams = useCallback(async () => {
    setAdminTeamsLoading(true);
    try {
      const res = await fetch("/api/admin/teams");
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAdminTeams(data.teams || []);
      }
    } catch (err) {
      console.error("Chyba při načítání týmů:", err);
    } finally {
      setAdminTeamsLoading(false);
    }
  }, [handleUnauthorized]);

  const loadRetrospectives = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/retrospectives");
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRetros(data.retrospectives || []);
      }
    } catch (err) {
      console.error("Chyba při načítání retrospektiv:", err);
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  const loadActionItemsCount = useCallback(async () => {
    try {
      const res = await fetch("/api/action-items");
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const open = (data.actionItems || []).filter(
          (a: any) => a.status !== "DONE" && a.status !== "CANCELLED"
        ).length;
        setOpenActionItemsCount(open);
      }
    } catch {}
  }, [handleUnauthorized]);

  // Načtení dat podle přihlášené role a zvoleného týmu
  useEffect(() => {
    if (!authenticated) return;
    if (role === "admin" && !activeTeam) {
      loadAdminTeams();
      return;
    }
    if (activeTeam) {
      loadRetrospectives();
      loadActionItemsCount();
    }
  }, [authenticated, role, activeTeam, loadAdminTeams, loadRetrospectives, loadActionItemsCount]);

  // Pokud admin otevřel přímo URL s #board/<id> bez vybraného týmu, automaticky vybereme tým dané tabule
  useEffect(() => {
    if (!authenticated || role !== "admin" || !currentRoomId || activeTeam) return;
    let cancelled = false;
    setResolvingRoomTeam(true);

    (async () => {
      try {
        const res = await fetch(`/api/retrospectives/${encodeURIComponent(currentRoomId)}`);
        if (cancelled) return;
        if (res.status === 401) {
          await handleUnauthorized();
          return;
        }
        if (res.status === 404 || res.status === 403 || !res.ok) {
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
          setCurrentRoomId(null);
          return;
        }
        const data = await res.json();
        const roomTeamId = data?.retrospective?.teamId;
        if (roomTeamId) {
          const selectRes = await fetch("/api/admin/select-team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamId: roomTeamId }),
          });
          if (!cancelled && selectRes.ok) {
            const selectData = await selectRes.json();
            setActiveTeam(selectData.activeTeam || null);
          }
        }
      } catch {} finally {
        if (!cancelled) {
          setResolvingRoomTeam(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated, role, currentRoomId, activeTeam, handleUnauthorized]);

  // Přesměrování z neexistující nebo cizí tabule na Home Page
  useEffect(() => {
    if (!authenticated || !currentRoomId || !activeTeam || isLoading) return;
    const existsInList = retros.some((r) => r.id === currentRoomId);
    if (!existsInList) {
      let cancelled = false;
      fetch(`/api/retrospectives/${encodeURIComponent(currentRoomId)}`)
        .then(async (res) => {
          if (cancelled) return;
          if (res.status === 401) {
            await handleUnauthorized();
            return;
          }
          if (res.status === 404 || res.status === 403) {
            if (window.location.hash) {
              window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
              );
            }
            setCurrentRoomId(null);
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [authenticated, currentRoomId, activeTeam, isLoading, retros, handleUnauthorized]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setCurrentRoomId(null);
    setAuthenticated(false);
    setRole(null);
    setActiveTeam(null);
    setRetros([]);
    setAdminTeams([]);
    setOpenActionItemsCount(0);
    setAuthError(null);
  };

  const handleAdminSelectTeam = async (team: Team) => {
    try {
      const res = await fetch("/api/admin/select-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setActiveTeam(data.activeTeam || team);
      }
    } catch (err) {
      console.error("Chyba při výběru týmu:", err);
    }
  };

  const handleAdminBackToTeams = async () => {
    try {
      await fetch("/api/admin/select-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: null }),
      });
    } catch {}
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setCurrentRoomId(null);
    setActiveTeam(null);
    setRetros([]);
    setOpenActionItemsCount(0);
    loadAdminTeams();
  };

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

      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (res.ok) {
        const created = await res.json();
        setNewTitle(getDefaultRetroTitle());
        setIsModalOpen(false);
        await loadRetrospectives();
        window.location.hash = `#board/${created.id}`;
      }
    } catch (err) {
      alert("Chyba při zakládání retrospektivy: " + err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRetroConfirm = async () => {
    if (!retroToDelete || isDeletingRetro) return;
    setIsDeletingRetro(true);
    try {
      const res = await fetch(`/api/retrospectives/${retroToDelete.id}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (res.ok) {
        setRetroToDelete(null);
        await loadRetrospectives();
      }
    } catch (err) {
      console.error("Chyba při mazání retrospektivy:", err);
    } finally {
      setIsDeletingRetro(false);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleOpenRoom = (id: string) => {
    window.location.hash = `#board/${id}`;
  };

  const handleBackToDashboard = () => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setCurrentRoomId(null);
    if (activeTeam) {
      loadRetrospectives();
      loadActionItemsCount();
    }
  };

  const animalGalleryModal = (
    <AnimalGalleryModal
      isOpen={isAnimalGalleryOpen}
      onClose={() => setIsAnimalGalleryOpen(false)}
      currentUser={currentUser}
      onSelectAnimalName={(newName) => {
        const updated = { ...currentUser, name: newName };
        setCurrentUser(updated);
        saveDailyUserSession(updated);
      }}
      onRollRandomName={() => {
        const updated = { ...currentUser, name: getRandomAnonymousName() };
        setCurrentUser(updated);
        saveDailyUserSession(updated);
      }}
    />
  );

  // 1. Načítání ověření přístupu
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "4px solid rgba(99, 102, 241, 0.2)",
            borderTopColor: "var(--accent-indigo)",
          }}
        />
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Ověřuji přístup...</p>
      </div>
    );
  }

  // 2. Přihlašovací obrazovka (bez nápovědy k heslu, s ochranou 3 pokusy / 24h)
  if (!authenticated) {
    return (
      <LoginView
        theme={theme}
        onToggleTheme={toggleTheme}
        initialLockedUntil={lockedUntil}
        initialError={authError}
        onLoginSuccess={({ role: nextRole, activeTeam: nextTeam }) => {
          setAuthenticated(true);
          setRole(nextRole);
          setActiveTeam(nextTeam);
          setLockedUntil(null);
          setAuthError(null);
        }}
      />
    );
  }

  // 3. Real-time detail retrospektivy (#board/<id>)
  if (currentRoomId) {
    if (isAdmin && (!activeTeam || resolvingRoomTeam)) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <p style={{ color: "var(--text-muted)" }}>Načítám kontext týmu...</p>
        </div>
      );
    }

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
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                R
              </div>
              <span style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                Retrospektiva
              </span>
            </div>

            {activeTeam && (
              <span
                style={{
                  padding: "2px 9px",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(99, 102, 241, 0.12)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "var(--accent-indigo)",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                }}
              >
                {activeTeam.name}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Jste přihlášen jako:{" "}
              <strong>{isAdmin ? "Admin" : currentUser.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsAnimalGalleryOpen(true)}
              title="Otevřít Digitální zoo"
              style={{
                padding: "5px 11px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--accent-indigo)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "1px solid rgba(99, 102, 241, 0.35)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>🐾</span>
              <span>Digitální zoo</span>
            </button>
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
            <button
              type="button"
              onClick={handleLogout}
              title="Odhlásit se"
              style={{
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(244, 63, 94, 0.08)",
                color: "var(--accent-rose)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "0.78rem",
                fontWeight: 600,
                border: "1px solid rgba(244, 63, 94, 0.3)",
              }}
            >
              <LogOut size={13} />
              <span>Odhlásit</span>
            </button>
          </div>
        </header>

        <BoardView
          roomId={currentRoomId}
          user={effectiveUser}
          teamName={activeTeam?.name}
          isAdmin={isAdmin}
          onBack={handleBackToDashboard}
          onUpdateUser={(updated) => {
            if (!isAdmin) {
              setCurrentUser(updated);
              saveDailyUserSession(updated);
            }
          }}
          onUnauthorized={handleUnauthorized}
        />

        {animalGalleryModal}
      </div>
    );
  }

  // 4. Admin správa týmů a squadů (když admin nemá vybraný konkrétní tým)
  if (isAdmin && !activeTeam) {
    return (
      <>
        <AdminTeamsView
          teams={adminTeams}
          isLoading={adminTeamsLoading}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
          onRefresh={loadAdminTeams}
          onSelectTeam={handleAdminSelectTeam}
          onShareTeam={(team) => setShareTargetTeam(team)}
        />
        <ShareModal
          isOpen={Boolean(shareTargetTeam)}
          onClose={() => setShareTargetTeam(null)}
          teamId={shareTargetTeam?.id}
          teamName={shareTargetTeam?.name}
        />
      </>
    );
  }

  // 5. Team Dashboard (Home Page týmu)
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
              {activeTeam ? `Tým: ${activeTeam.name}` : "Zabezpečený týmový prostor"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {isAdmin && (
            <button
              type="button"
              onClick={handleAdminBackToTeams}
              title="Zpět na správu týmů"
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.84rem",
                fontWeight: 600,
                border: "1px solid var(--border-color)",
              }}
            >
              <ArrowLeft size={15} />
              <span>Správa týmů</span>
            </button>
          )}

          {isAdmin ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                background: "rgba(99, 102, 241, 0.14)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                color: "var(--accent-indigo)",
              }}
            >
              <Shield size={14} />
              <span>Admin</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsAnimalGalleryOpen(true)}
              title="Klikněte pro zobrazení vašeho zvířátka v Digitální zoo"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>
                {getAnimalVisualInfo(currentUser.name).emoji}
              </span>
              <span>{currentUser.name}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAnimalGalleryOpen(true)}
            title="Otevřít Digitální zoo"
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(99, 102, 241, 0.12)",
              color: "var(--accent-indigo)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 700,
              border: "1px solid rgba(99, 102, 241, 0.35)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>🐾</span>
            <span>Digitální zoo</span>
          </button>

          {activeTeam && (
            <button
              type="button"
              onClick={() => setIsDashboardShareOpen(true)}
              title="Zkopírovat zabezpečený 1h odkaz a zobrazit QR kód pro tento tým"
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-indigo)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Share2 size={15} />
              <span>Sdílet</span>
            </button>
          )}

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
            onClick={() => setIsTasksModalOpen(true)}
            title="Otevřít týmové akční kroky"
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(16, 185, 129, 0.1)",
              color: "var(--accent-emerald)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "1px solid rgba(16, 185, 129, 0.3)",
              cursor: "pointer",
            }}
          >
            <CheckSquare size={16} />
            <span>Akční kroky</span>
            {openActionItemsCount > 0 && (
              <span
                style={{
                  background: "var(--accent-emerald)",
                  color: "#ffffff",
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                  fontWeight: 700,
                  marginLeft: "2px",
                }}
              >
                {openActionItemsCount}
              </span>
            )}
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

          <button
            type="button"
            onClick={handleLogout}
            title="Odhlásit se"
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-card)",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "1px solid var(--border-color)",
            }}
          >
            <LogOut size={15} />
            <span>Odhlásit</span>
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
              <Sparkles size={14} /> {activeTeam ? `Squad / Tým: ${activeTeam.name}` : "Real-time kolaborace"}
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "8px" }}>
              Agilní retrospektivy bez hranic
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "560px" }}>
              Blesková synchronizace v reálném čase s podporou atomického hlasování,
              seskupování myšlenek, sdílených odkazů na 1 hodinu a společného odpočtu času.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={handleOpenCreateModal}
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
          </div>
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
              Načítám retrospektivy z databáze...
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{r.title}</h4>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRetroToDelete(r);
                        }}
                        title="Smazat retrospektivu"
                        style={{
                          background: "transparent",
                          color: "var(--text-dim)",
                          padding: "4px",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                    Šablona: {getTemplateLabel(r.templateType)} • Max hlasů: {r.maxVotesPerUser}
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
                onClick={handleOpenCreateModal}
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
                  Šablona sloupců
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
                  <option value="PUB_RETRO">🍺 Na co si připijeme / 🤬 Zapičuj si / 🛠️ Jak to příště neposrat</option>
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

      {/* Modal potvrzení smazání retrospektivy (pouze Admin) */}
      {retroToDelete && (
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
              maxWidth: "440px",
              padding: "26px",
              background: "var(--bg-secondary)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <AlertTriangle size={20} color="var(--accent-rose)" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                Smazat retrospektivu?
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "18px" }}>
              Opravdu chcete trvale odstranit retrospektivu <strong>{retroToDelete.title}</strong> včetně všech jejích karet a hlasů?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRetroToDelete(null)}
                style={{
                  padding: "8px 14px",
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
                onClick={handleDeleteRetroConfirm}
                disabled={isDeletingRetro}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-rose)",
                  color: "#ffffff",
                  fontWeight: 700,
                }}
              >
                {isDeletingRetro ? "Mažu..." : "Smazat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal pro aktivní tým (1h token + QR + auto-copy) */}
      <ShareModal
        isOpen={isDashboardShareOpen}
        onClose={() => setIsDashboardShareOpen(false)}
        teamId={activeTeam?.id}
        teamName={activeTeam?.name}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
        currentUser={effectiveUser}
      />

      {/* Global Action Items Checklist Modal */}
      <GlobalActionItemsModal
        isOpen={isTasksModalOpen}
        onClose={() => {
          setIsTasksModalOpen(false);
          loadActionItemsCount();
        }}
        onOpenRetro={(id) => handleOpenRoom(id)}
      />

      {/* Digitální zoo (sdílený modal dostupný i z horní lišty na tabuli) */}
      {animalGalleryModal}
    </div>
  );
};
