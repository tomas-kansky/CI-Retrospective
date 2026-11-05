import React, { useState, useEffect } from "react";
import { X, Sparkles, Search, Check } from "lucide-react";
import type { UserSession } from "@ci-retro/types";
import {
  getAnimalVisualInfo,
  getAllAnimalsCatalog,
  type AnimalVisualInfo,
} from "../utils/names";

interface AnimalGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  onSelectAnimalName?: (newName: string) => void;
  onRollRandomName?: () => void;
}

export const AnimalGalleryModal: React.FC<AnimalGalleryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectAnimalName,
  onRollRandomName,
}) => {
  const myVisual = getAnimalVisualInfo(currentUser.name);
  const allAnimals = getAllAnimalsCatalog();

  const [selectedAnimal, setSelectedAnimal] = useState<AnimalVisualInfo>(myVisual);
  const [searchQuery, setSearchQuery] = useState("");

  // Při změně jména uživatele nebo otevření modalu ukážeme nahoře jeho aktuální zvířátko
  useEffect(() => {
    if (isOpen) {
      setSelectedAnimal(getAnimalVisualInfo(currentUser.name));
      setSearchQuery("");
    }
  }, [isOpen, currentUser.name]);

  if (!isOpen) return null;

  const filteredAnimals = allAnimals.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.animal.toLowerCase().includes(q) ||
      item.latinName.toLowerCase().includes(q) ||
      item.trait.toLowerCase().includes(q)
    );
  });

  const isSelectedMyAnimal = selectedAnimal.animal === myVisual.animal;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.76)",
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
          maxWidth: "880px",
          maxHeight: "90vh",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
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
                Atlas a fotogalerie zvířátek
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Podívejte se, jak v reálu vypadá vaše dnešní zvířátko: <strong style={{ color: "var(--text-main)" }}>{currentUser.name}</strong>
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

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Hero Detail Card: Aktuální / vybrané zvířátko s velkou reálnou fotografií */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "22px",
              padding: "20px",
              borderRadius: "var(--radius-md)",
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(6, 182, 212, 0.06))",
              border: "1.5px solid rgba(99, 102, 241, 0.4)",
              alignItems: "center",
            }}
          >
            {/* Reálná fotografie zvířátka */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "240px",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                background: "#0f172a",
                border: "1px solid var(--border-color)",
                boxShadow: "0 12px 28px rgba(0, 0, 0, 0.4)",
              }}
            >
              <img
                src={selectedAnimal.photoUrl}
                alt={selectedAnimal.animal}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  background: isSelectedMyAnimal
                    ? "var(--accent-indigo)"
                    : "rgba(15, 23, 42, 0.85)",
                  color: "#ffffff",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  backdropFilter: "blur(4px)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span>{selectedAnimal.emoji}</span>
                <span>
                  {isSelectedMyAnimal
                    ? `Vaše zvířátko (${currentUser.name})`
                    : `Náhled zvířátka`}
                </span>
              </div>
            </div>

            {/* Popis a akce */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <h4 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
                    {selectedAnimal.emoji} {selectedAnimal.animal}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    ({selectedAnimal.latinName})
                  </span>
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    color: "var(--accent-indigo)",
                  }}
                >
                  „{selectedAnimal.trait}“
                </div>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "0.92rem",
                  lineHeight: 1.55,
                  color: "var(--text-main)",
                }}
              >
                {selectedAnimal.description}
              </p>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "6px" }}>
                {!isSelectedMyAnimal && onSelectAnimalName && (
                  <button
                    type="button"
                    onClick={() => onSelectAnimalName(`Anonymní ${selectedAnimal.animal}`)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--accent-emerald)",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Check size={14} />
                    <span>Nastavit jako moje zvířátko (Anonymní {selectedAnimal.animal})</span>
                  </button>
                )}

                {onRollRandomName && (
                  <button
                    type="button"
                    onClick={onRollRandomName}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--accent-indigo)",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Vylosovat náhodné zvířátko</span>
                  </button>
                )}

                {!isSelectedMyAnimal && (
                  <button
                    type="button"
                    onClick={() => setSelectedAnimal(myVisual)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-card)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Zpět na moje ({myVisual.animal})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search & Filter Bar for All Animals */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>
              Všechna zvířátka v aplikaci ({filteredAnimals.length})
            </div>

            <div style={{ position: "relative", minWidth: "240px", flex: "0 1 300px" }}>
              <Search
                size={14}
                color="var(--text-dim)"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                placeholder="Hledat zvířátko (např. Medojed, Kapybara...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 12px 7px 32px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                }}
              />
            </div>
          </div>

          {/* Grid of All Animals with Real Photos */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))",
              gap: "14px",
            }}
          >
            {filteredAnimals.map((item) => {
              const isMine = item.animal === myVisual.animal;
              const isSelected = item.animal === selectedAnimal.animal;

              return (
                <div
                  key={item.animal}
                  onClick={() => setSelectedAnimal(item)}
                  style={{
                    borderRadius: "var(--radius-md)",
                    background: isSelected
                      ? "rgba(99, 102, 241, 0.14)"
                      : "var(--bg-card)",
                    border: isMine
                      ? "2px solid var(--accent-emerald)"
                      : isSelected
                      ? "2px solid var(--accent-indigo)"
                      : "1px solid var(--border-color)",
                    overflow: "hidden",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "125px",
                      background: "#0f172a",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={item.photoUrl}
                      alt={item.animal}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    {isMine && (
                      <span
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          padding: "2px 7px",
                          borderRadius: "var(--radius-full)",
                          background: "var(--accent-emerald)",
                          color: "#ffffff",
                          fontSize: "0.66rem",
                          fontWeight: 800,
                        }}
                      >
                        Jste vy
                      </span>
                    )}
                  </div>

                  <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)" }}>
                      {item.emoji} {item.animal}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.trait}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
