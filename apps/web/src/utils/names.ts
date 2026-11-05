// Generátor vtipných anonymních jmen ve stylu Google Docs (např. Anonymní Pelikán)
export const GOOGLE_STYLE_ANIMALS = [
  "Pelikán",
  "Kapybara",
  "Lenochod",
  "Lemur",
  "Vydra",
  "Panda",
  "Medojed",
  "Koala",
  "Jezevec",
  "Chobotnice",
  "Chameleon",
  "Veverka",
  "Alpaka",
  "Surikata",
  "Narval",
  "Ptakopysk",
  "Bobr",
  "Dikobraz",
  "Kivi",
  "Šimpanz",
  "Křeček",
  "Wombat",
  "Ježek",
  "Axolotl",
  "Tučňák",
  "Klokan",
  "Gepard",
  "Plameňák",
  "Rypoš",
  "Mýval",
  "Lasička",
  "Papuchalk",
  "Tukan",
  "Tapír",
  "Pásovec",
  "Dingo",
  "Rosomák",
  "Kočkodan",
  "Delfín",
  "Sysel",
  "Kormorán",
  "Ledňáček",
  "Mravenečník",
  "Lenochoďák",
];

export interface AnimalVisualInfo {
  animal: string;
  emoji: string;
  trait: string;
  earStyle: "round" | "pointy" | "long" | "none" | "horns" | "tuft";
  snoutStyle: "round" | "beak" | "longBeak" | "whiskers" | "trunk" | "wide";
  accentColor: string;
}

const ANIMAL_CATALOG: Record<string, Omit<AnimalVisualInfo, "animal">> = {
  Pelikán: { emoji: "🦤", trait: "Lovec velkých myšlenek", earStyle: "tuft", snoutStyle: "longBeak", accentColor: "#38bdf8" },
  Kapybara: { emoji: "🦫", trait: "Klidný diplomat týmu", earStyle: "round", snoutStyle: "wide", accentColor: "#d97706" },
  Lenochod: { emoji: "🦥", trait: "Rozvážný pohodář", earStyle: "round", snoutStyle: "round", accentColor: "#a16207" },
  Lemur: { emoji: "🐒", trait: "Noční pozorovatel sprintu", earStyle: "pointy", snoutStyle: "round", accentColor: "#64748b" },
  Vydra: { emoji: "🦦", trait: "Hravý řešitel problémů", earStyle: "round", snoutStyle: "whiskers", accentColor: "#0ea5e9" },
  Panda: { emoji: "🐼", trait: "Milovník čistého kódu", earStyle: "round", snoutStyle: "round", accentColor: "#10b981" },
  Medojed: { emoji: "🦡", trait: "Neohrožený bojovník s bugy", earStyle: "round", snoutStyle: "wide", accentColor: "#f59e0b" },
  Koala: { emoji: "🐨", trait: "Klidný architekt na větvi", earStyle: "round", snoutStyle: "round", accentColor: "#94a3b8" },
  Jezevec: { emoji: "🦡", trait: "Vytrvalý kopáč do hloubky", earStyle: "round", snoutStyle: "wide", accentColor: "#475569" },
  Chobotnice: { emoji: "🐙", trait: "Multitasking šampion", earStyle: "none", snoutStyle: "round", accentColor: "#ec4899" },
  Chameleon: { emoji: "🦎", trait: "Mistr rychlé adaptace", earStyle: "horns", snoutStyle: "wide", accentColor: "#22c55e" },
  Veverka: { emoji: "🐿️", trait: "Sběratel akčních kroků", earStyle: "tuft", snoutStyle: "whiskers", accentColor: "#ea580c" },
  Alpaka: { emoji: "🦙", trait: "Nadýchaný strážce nálady", earStyle: "long", snoutStyle: "round", accentColor: "#f472b6" },
  Surikata: { emoji: "🦦", trait: "Bdělý hlídač releasu", earStyle: "round", snoutStyle: "pointy" as any, accentColor: "#eab308" },
  Narval: { emoji: "🐳", trait: "Jednorožec oceánu", earStyle: "horns", snoutStyle: "round", accentColor: "#06b6d4" },
  Ptakopysk: { emoji: "🦆", trait: "Unikátní full-stack obojživelník", earStyle: "none", snoutStyle: "beak", accentColor: "#14b8a6" },
  Bobr: { emoji: "🦫", trait: "Stavitel pevných hrází", earStyle: "round", snoutStyle: "whiskers", accentColor: "#b45309" },
  Dikobraz: { emoji: "🦔", trait: "Ostrý obránce kvality", earStyle: "tuft", snoutStyle: "round", accentColor: "#a855f7" },
  Kivi: { emoji: "🥝", trait: "Nenápadný noční sprinter", earStyle: "none", snoutStyle: "longBeak", accentColor: "#84cc16" },
  Šimpanz: { emoji: "🐵", trait: "Kreativní mozková bouře", earStyle: "round", snoutStyle: "wide", accentColor: "#f97316" },
  Křeček: { emoji: "🐹", trait: "Neúnavný běžec ve sprintu", earStyle: "round", snoutStyle: "whiskers", accentColor: "#fbbf24" },
  Wombat: { emoji: "🐻", trait: "Houževnatý australský tank", earStyle: "round", snoutStyle: "wide", accentColor: "#78716c" },
  Ježek: { emoji: "🦔", trait: "Rychlý sběrač bodů", earStyle: "pointy", snoutStyle: "round", accentColor: "#fb7185" },
  Axolotl: { emoji: "🦎", trait: "Usměvavý mistr regenerace", earStyle: "tuft", snoutStyle: "wide", accentColor: "#f43f5e" },
  Tučňák: { emoji: "🐧", trait: "Elegán v produkčním smokingu", earStyle: "none", snoutStyle: "beak", accentColor: "#3b82f6" },
  Klokan: { emoji: "🦘", trait: "Skokan přes překážky", earStyle: "long", snoutStyle: "round", accentColor: "#f59e0b" },
  Gepard: { emoji: "🐆", trait: "Nejrychlejší nasazovač", earStyle: "round", snoutStyle: "whiskers", accentColor: "#eab308" },
  Plameňák: { emoji: "🦩", trait: "Mistr dokonalé rovnováhy", earStyle: "none", snoutStyle: "longBeak", accentColor: "#ec4899" },
  Rypoš: { emoji: "🐹", trait: "Podzemní průzkumník", earStyle: "none", snoutStyle: "whiskers", accentColor: "#fda4af" },
  Mýval: { emoji: "🦝", trait: "Noční uklízeč tech debtu", earStyle: "pointy", snoutStyle: "whiskers", accentColor: "#6366f1" },
  Lasička: { emoji: "🦦", trait: "Mrštný lovec detailů", earStyle: "round", snoutStyle: "whiskers", accentColor: "#f97316" },
  Papuchalk: { emoji: "🐧", trait: "Pestrobarevný mořeplavec", earStyle: "none", snoutStyle: "beak", accentColor: "#fb923c" },
  Tukan: { emoji: "🦜", trait: "Hlasitý vizionář", earStyle: "none", snoutStyle: "longBeak", accentColor: "#facc15" },
  Tapír: { emoji: "🐗", trait: "Klidný obyvatel pralesa", earStyle: "round", snoutStyle: "trunk", accentColor: "#8b5cf6" },
  Pásovec: { emoji: "🐢", trait: "Neprůstřelná obrana", earStyle: "pointy", snoutStyle: "round", accentColor: "#64748b" },
  Dingo: { emoji: "🐕", trait: "Svobodný stopař", earStyle: "pointy", snoutStyle: "round", accentColor: "#d97706" },
  Rosomák: { emoji: "🐻", trait: "Nezastavitelná severská síla", earStyle: "round", snoutStyle: "wide", accentColor: "#ef4444" },
  Kočkodan: { emoji: "🐒", trait: "Obratný akrobat v korunách", earStyle: "round", snoutStyle: "round", accentColor: "#10b981" },
  Delfín: { emoji: "🐬", trait: "Chytrý týmový komunikátor", earStyle: "none", snoutStyle: "round", accentColor: "#06b6d4" },
  Sysel: { emoji: "🐿️", trait: "Pozorný strážce na louce", earStyle: "round", snoutStyle: "whiskers", accentColor: "#ca8a04" },
  Kormorán: { emoji: "🦅", trait: "Hloubkový potápěč v logách", earStyle: "tuft", snoutStyle: "longBeak", accentColor: "#0284c7" },
  Ledňáček: { emoji: "🐦", trait: "Bleskový lovec u řeky", earStyle: "tuft", snoutStyle: "longBeak", accentColor: "#06b6d4" },
  Mravenečník: { emoji: "🐜", trait: "Specialista na drobné bugy", earStyle: "round", snoutStyle: "trunk", accentColor: "#a855f7" },
  Lenochoďák: { emoji: "🦥", trait: "Zenový mistr retrospektivy", earStyle: "round", snoutStyle: "round", accentColor: "#84cc16" },
};

export function getRandomAnonymousName(): string {
  const animal = GOOGLE_STYLE_ANIMALS[Math.floor(Math.random() * GOOGLE_STYLE_ANIMALS.length)];
  return `Anonymní ${animal}`;
}

export function getAnimalVisualInfo(userName: string): AnimalVisualInfo {
  const trimmed = (userName || "").trim();
  for (const animal of GOOGLE_STYLE_ANIMALS) {
    if (trimmed.toLowerCase().includes(animal.toLowerCase())) {
      return {
        animal,
        ...ANIMAL_CATALOG[animal],
      };
    }
  }

  // Pokud si uživatel nastavil vlastní jméno, deterministicky mu přiřadíme zvířecího patrona
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  }
  const fallbackAnimal = GOOGLE_STYLE_ANIMALS[hash % GOOGLE_STYLE_ANIMALS.length];
  return {
    animal: fallbackAnimal,
    ...ANIMAL_CATALOG[fallbackAnimal],
  };
}
