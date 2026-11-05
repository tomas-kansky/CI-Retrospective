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
  latinName: string;
  emoji: string;
  trait: string;
  description: string;
  photoUrl: string;
  accentColor: string;
}

const ANIMAL_CATALOG: Record<string, Omit<AnimalVisualInfo, "animal">> = {
  Pelikán: {
    latinName: "Pelecanus onocrotalus",
    emoji: "🦤",
    trait: "Lovec velkých myšlenek",
    description: "Velký vodní pták s ikonickým hrdelním vakem pod zobákem, kterým dokáže nabrat až 13 litrů vody najednou.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Great_white_pelican_%28Pelecanus_onocrotalus%29.jpg/960px-Great_white_pelican_%28Pelecanus_onocrotalus%29.jpg",
    accentColor: "#38bdf8",
  },
  Kapybara: {
    latinName: "Hydrochoerus hydrochaeris",
    emoji: "🦫",
    trait: "Klidný diplomat týmu",
    description: "Největší žijící hlodavec světa z Jižní Ameriky, proslulý svou naprostou pohodou a přátelskou povahou ke všem zvířatům.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Capybaracropped.jpg/960px-Capybaracropped.jpg",
    accentColor: "#d97706",
  },
  Lenochod: {
    latinName: "Bradypus variegatus",
    emoji: "🦥",
    trait: "Rozvážný pohodář",
    description: "Stromový savec z tropických pralesů, který většinu života tráví zavěšený hlavou dolů a nikam nespěchá.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bradypus.jpg/960px-Bradypus.jpg",
    accentColor: "#a16207",
  },
  Lemur: {
    latinName: "Lemur catta",
    emoji: "🐒",
    trait: "Pozorný pozorovatel sprintu",
    description: "Endemit ostrova Madagaskar s nezaměnitelným černobíle pruhovaným ocasem a velkýma jantarovýma očima.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Ring-tailed_lemur_%28Lemur_catta%29.jpg/960px-Ring-tailed_lemur_%28Lemur_catta%29.jpg",
    accentColor: "#64748b",
  },
  Vydra: {
    latinName: "Lutra lutra",
    emoji: "🦦",
    trait: "Hravý řešitel problémů",
    description: "Mrštná vodní šelma s hustým nepromokavým kožichem, která vyniká inteligencí a hravostí ve vodě.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Fischotter%2C_Lutra_Lutra.JPG",
    accentColor: "#0ea5e9",
  },
  Panda: {
    latinName: "Ailuropoda melanoleuca",
    emoji: "🐼",
    trait: "Milovník čistého kódu",
    description: "Černobílý medvěd z horských bambusových lesů Číny, který spořádá desítky kilogramů bambusu denně.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Grosser_Panda.JPG/960px-Grosser_Panda.JPG",
    accentColor: "#10b981",
  },
  Medojed: {
    latinName: "Mellivora capensis",
    emoji: "🦡",
    trait: "Neohrožený bojovník s bugy",
    description: "Extrémně odvážná a houževnatá lasicovitá šelma s volnou silnou kůží a bílým hřbetem, která se nezalekne ani lvů či kober.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Honey_Badger.jpg/960px-Honey_Badger.jpg",
    accentColor: "#f59e0b",
  },
  Koala: {
    latinName: "Phascolarctos cinereus",
    emoji: "🐨",
    trait: "Klidný architekt na větvi",
    description: "Australský stromový vačnatec s huňatýma ušima, který se živí výhradně listy blahovičníků (eukalyptů).",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Koala_climbing_tree.jpg/960px-Koala_climbing_tree.jpg",
    accentColor: "#94a3b8",
  },
  Jezevec: {
    latinName: "Meles meles",
    emoji: "🦡",
    trait: "Vytrvalý kopáč do hloubky",
    description: "Lesní šelma s typickou černobílou maskou na hlavě, která si buduje rozsáhlé podzemní labyrinty nor.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/European_badger_%28Meles_meles_taxus%29_Drenthe.jpg/960px-European_badger_%28Meles_meles_taxus%29_Drenthe.jpg",
    accentColor: "#475569",
  },
  Chobotnice: {
    latinName: "Octopus vulgaris",
    emoji: "🐙",
    trait: "Multitasking šampion",
    description: "Mimořádně inteligentní mořský hlavonožec s osmi chapadly, třemi srdci a schopností okamžitě měnit barvu kůže.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Octopus2.jpg/960px-Octopus2.jpg",
    accentColor: "#ec4899",
  },
  Chameleon: {
    latinName: "Chamaeleo calyptratus",
    emoji: "🦎",
    trait: "Mistr rychlé adaptace",
    description: "Plaz s nezávisle pohyblivýma očima, chápavým ocasem a vystřelovacím jazykem delším než jeho vlastní tělo.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Yemen_Chameleon.jpg/960px-Yemen_Chameleon.jpg",
    accentColor: "#22c55e",
  },
  Veverka: {
    latinName: "Sciurus vulgaris",
    emoji: "🐿️",
    trait: "Sběratel akčních kroků",
    description: "Hbitý stromový hlodavec s huňatým ocasem a štětičkami na uších, který si pečlivě dělá zásoby na zimu.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Squirrel_posing.jpg/960px-Squirrel_posing.jpg",
    accentColor: "#ea580c",
  },
  Alpaka: {
    latinName: "Vicugna pacos",
    emoji: "🦙",
    trait: "Nadýchaný strážce nálady",
    description: "Domestikovaná jihoamerická lama z vysokohorských And s mimořádně jemnou a hřejivou vlnou.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Alpaca_in_Higashiyama_Zoo_-_1.jpg/960px-Alpaca_in_Higashiyama_Zoo_-_1.jpg",
    accentColor: "#f472b6",
  },
  Surikata: {
    latinName: "Suricata suricatta",
    emoji: "🦦",
    trait: "Bdělý hlídač releasu",
    description: "Společenská šelmička z africké pouště Kalahari, která proslula panáčkováním na zadních nohách při hlídkování.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Meerkat_%28Suricata_suricatta%29_Tswalu.jpg/960px-Meerkat_%28Suricata_suricatta%29_Tswalu.jpg",
    accentColor: "#eab308",
  },
  Narval: {
    latinName: "Monodon monoceros",
    emoji: "🐳",
    trait: "Jednorožec oceánu",
    description: "Arktický ozubený kytovec, jehož samci mají až tři metry dlouhý spirálovitě stočený kel připomínající roh jednorožce.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/%D0%9D%D0%B0%D1%80%D0%B2%D0%B0%D0%BB_%D0%B2_%D1%80%D0%BE%D1%81%D1%81%D0%B8%D0%B9%D1%81%D0%BA%D0%BE%D0%B9_%D0%90%D1%80%D0%BA%D1%82%D0%B8%D0%BA%D0%B5.jpg/960px-%D0%9D%D0%B0%D1%80%D0%B2%D0%B0%D0%BB_%D0%B2_%D1%80%D0%BE%D1%81%D1%81%D0%B8%D0%B9%D1%81%D0%BA%D0%BE%D0%B9_%D0%90%D1%80%D0%BA%D1%82%D0%B8%D0%BA%D0%B5.jpg",
    accentColor: "#06b6d4",
  },
  Ptakopysk: {
    latinName: "Ornithorhynchus anatinus",
    emoji: "🦆",
    trait: "Unikátní full-stack obojživelník",
    description: "Pozoruhodný australský vejcorodý savec s kachním zobákem, bobřím ocasem a schopností vnímat elektrické pole.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Duck-billed_platypus_%28Ornithorhynchus_anatinus%29_Scottsdale.jpg/960px-Duck-billed_platypus_%28Ornithorhynchus_anatinus%29_Scottsdale.jpg",
    accentColor: "#14b8a6",
  },
  Bobr: {
    latinName: "Castor fiber",
    emoji: "🦫",
    trait: "Stavitel pevných hrází",
    description: "Největší evropský hlodavec s plochým šupinatým ocasem a silnými zuby, kterými kácí stromy a staví vodní hráze.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Beaver_pho34.jpg",
    accentColor: "#b45309",
  },
  Dikobraz: {
    latinName: "Hystrix cristata",
    emoji: "🦔",
    trait: "Ostrý obránce kvality",
    description: "Velký hlodavec pokrytý dlouhými černobílými ostny, které při pocitu ohrození naježí a hlasitě jimi chřestí.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Hystrix_cristata_qtl1.jpg/960px-Hystrix_cristata_qtl1.jpg",
    accentColor: "#a855f7",
  },
  Kivi: {
    latinName: "Apteryx mantelli",
    emoji: "🥝",
    trait: "Nenápadný noční sprinter",
    description: "Nelétavý noční pták a národní symbol Nového Zélandu s dlouhým zobákem a nozdrami umístěnými až na jeho špičce.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/TeTuatahianui.jpg/960px-TeTuatahianui.jpg",
    accentColor: "#84cc16",
  },
  Šimpanz: {
    latinName: "Pan troglodytes",
    emoji: "🐵",
    trait: "Kreativní mozková bouře",
    description: "Náš nejbližší žijící příbuzný v živočišné říši, který vyrábí a používá nástroje a žije v komplexních společenstvích.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/015_Chimpanzee_at_Kibale_forest_National_Park_Photo_by_Giles_Laurent.jpg/960px-015_Chimpanzee_at_Kibale_forest_National_Park_Photo_by_Giles_Laurent.jpg",
    accentColor: "#f97316",
  },
  Křeček: {
    latinName: "Mesocricetus auratus",
    emoji: "🐹",
    trait: "Neúnavný běžec ve sprintu",
    description: "Roztomilý hlodavec s obřími lícními torbami, ve kterých přenáší potravu o hmotnosti až poloviny svého těla.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Golden_hamster_front_1.jpg/960px-Golden_hamster_front_1.jpg",
    accentColor: "#fbbf24",
  },
  Wombat: {
    latinName: "Vombatus ursinus",
    emoji: "🐻",
    trait: "Houževnatý australský tank",
    description: "Zavalitý australský vačnatec s obrovskou silou, který vyhrabává podzemní nory a je proslulý trusem ve tvaru krychliček.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Vombatus_ursinus_-Maria_Island_National_Park.jpg/960px-Vombatus_ursinus_-Maria_Island_National_Park.jpg",
    accentColor: "#78716c",
  },
  Ježek: {
    latinName: "Erinaceus europaeus",
    emoji: "🦔",
    trait: "Rychlý sběrač bodů",
    description: "Noční hmyzožravec chráněný tisíci bodlinami, který se v nebezpečí svine do nedobytné pichlavé kuličky.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Erinaceus_europaeus_LC0119.jpg/960px-Erinaceus_europaeus_LC0119.jpg",
    accentColor: "#fb7185",
  },
  Axolotl: {
    latinName: "Ambystoma mexicanum",
    emoji: "🦎",
    trait: "Usměvavý mistr regenerace",
    description: "Mexický vodní mlok s keříčkovitými vnějšími žábrami a věčným úsměvem, který dokáže plně dorůst ztracené končetiny.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Axolotl_ganz.jpg/960px-Axolotl_ganz.jpg",
    accentColor: "#f43f5e",
  },
  Tučňák: {
    latinName: "Aptenodytes forsteri",
    emoji: "🐧",
    trait: "Elegán v produkčním smokingu",
    description: "Nelétavý mořský pták z Antarktidy, který pod vodou doslova létá a potápí se do hloubky přes 500 metrů.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Aptenodytes_forsteri_-Snow_Hill_Island%2C_Antarctica_-adults_and_juvenile-8.jpg",
    accentColor: "#3b82f6",
  },
  Klokan: {
    latinName: "Osphranter rufus",
    emoji: "🦘",
    trait: "Skokan přes překážky",
    description: "Největší vačnatec světa z australského vnitrozemí, který dokáže jediným skokem překonat vzdálenost až 9 metrů.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Red_kangaroo_-_melbourne_zoo.jpg/960px-Red_kangaroo_-_melbourne_zoo.jpg",
    accentColor: "#f59e0b",
  },
  Gepard: {
    latinName: "Acinonyx jubatus",
    emoji: "🐆",
    trait: "Nejrychlejší nasazovač",
    description: "Nejrychlejší suchozemský savec planety, který dokáže zrychlit z 0 na 100 km/h za pouhé tři sekundy.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Male_cheetah_facing_left_in_South_Africa.jpg/960px-Male_cheetah_facing_left_in_South_Africa.jpg",
    accentColor: "#eab308",
  },
  Plameňák: {
    latinName: "Phoenicopterus roseus",
    emoji: "🦩",
    trait: "Mistr dokonalé rovnováhy",
    description: "Elegantní brodivý pták s růžovým peřím získaným z karotenoidů v potravě, který rád odpočívá na jedné noze.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/010_Greater_flamingos_male_and_female_in_the_Camargue_during_mating_season_Photo_by_Giles_Laurent.jpg/960px-010_Greater_flamingos_male_and_female_in_the_Camargue_during_mating_season_Photo_by_Giles_Laurent.jpg",
    accentColor: "#ec4899",
  },
  Rypoš: {
    latinName: "Heterocephalus glaber",
    emoji: "🐹",
    trait: "Podzemní průzkumník",
    description: "Fascinující bezsrstý podzemní hlodavec z východní Afriky, který žije v koloniích jako včely a dožívá se přes 30 let.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Webs180130-rat.jpg",
    accentColor: "#fda4af",
  },
  Mýval: {
    latinName: "Procyon lotor",
    emoji: "🦝",
    trait: "Noční uklízeč tech debtu",
    description: "Chytrá šelma s černou škraboškou přes oči a neuvěřitelně šikovnýma předníma tlapkama, kterými otevře každou západku.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Raccoon_in_Central_Park_%2835264%29.jpg/960px-Raccoon_in_Central_Park_%2835264%29.jpg",
    accentColor: "#6366f1",
  },
  Lasička: {
    latinName: "Mustela nivalis",
    emoji: "🦦",
    trait: "Mrštný lovec detailů",
    description: "Nejmenší šelma světa s protáhlým pružným tělem, která vyniká bleskovými reflexy a neúnavnou energií.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Mustela_nivalis_-British_Wildlife_Centre-4.jpg/960px-Mustela_nivalis_-British_Wildlife_Centre-4.jpg",
    accentColor: "#f97316",
  },
  Papuchalk: {
    latinName: "Fratercula arctica",
    emoji: "🐧",
    trait: "Pestrobarevný mořeplavec",
    description: "Severský mořský pták přezdívaný „mořský klaun“ díky svému výraznému pestrobarevnému zobáku.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Puffin_%28Fratercula_arctica%29.jpg/960px-Puffin_%28Fratercula_arctica%29.jpg",
    accentColor: "#fb923c",
  },
  Tukan: {
    latinName: "Ramphastos toco",
    emoji: "🦜",
    trait: "Hlasitý vizionář",
    description: "Klenot jihoamerických pralesů s obrovským, ale překvapivě lehkým oranžovým zobákem s voštinovou strukturou.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/006_Toco_toucan_in_Encontro_das_%C3%81guas_State_Park_Photo_by_Giles_Laurent.jpg/960px-006_Toco_toucan_in_Encontro_das_%C3%81guas_State_Park_Photo_by_Giles_Laurent.jpg",
    accentColor: "#facc15",
  },
  Tapír: {
    latinName: "Tapirus terrestris",
    emoji: "🐗",
    trait: "Klidný obyvatel pralesa",
    description: "Pralesní lichokopytník s krátkým pohyblivým chobotem, který výborně plave a pomáhá šířit semena stromů.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/South_American_tapir_%28Tapirus_terrestris%29.JPG/960px-South_American_tapir_%28Tapirus_terrestris%29.JPG",
    accentColor: "#8b5cf6",
  },
  Pásovec: {
    latinName: "Dasypus novemcinctus",
    emoji: "🐢",
    trait: "Neprůstřelná obrana",
    description: "Americký savec chráněný pevným kostěným krunýřem rozděleným do pohyblivých pásů.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Dasypus_novemcinctus_en_Zool%C3%B3gico_de_Paraguan%C3%A1.jpg/960px-Dasypus_novemcinctus_en_Zool%C3%B3gico_de_Paraguan%C3%A1.jpg",
    accentColor: "#64748b",
  },
  Dingo: {
    latinName: "Canis lupus dingo",
    emoji: "🐕",
    trait: "Svobodný stopař",
    description: "Divoký australský pes se zlatohnědou srstí, který je vrcholovým predátorem tamní divočiny.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Dingo_%28Canis_lupus_dingo%29_Kakadu_2.jpg/960px-Dingo_%28Canis_lupus_dingo%29_Kakadu_2.jpg",
    accentColor: "#d97706",
  },
  Rosomák: {
    latinName: "Gulo gulo",
    emoji: "🐻",
    trait: "Nezastavitelná severská síla",
    description: "Největší suchozemská lasicovitá šelma severské tajgy a tundry, proslulá obrovskou vytrvalostí a odvahou.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/J%C3%A4rv1.jpg/960px-J%C3%A4rv1.jpg",
    accentColor: "#ef4444",
  },
  Kočkodan: {
    latinName: "Chlorocebus pygerythrus",
    emoji: "🐒",
    trait: "Obratný akrobat v korunách",
    description: "Společenská africká opice s černou tváří lemovanou bílýmousem, známá propracovaným systémem varovných signálů.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Cercopiteco_verde_%28Chlorocebus_pygerythrus%29%2C_parque_nacional_del_lago_Nakuru%2C_Kenia%2C_2024-05-18%2C_DD_77.jpg/960px-Cercopiteco_verde_%28Chlorocebus_pygerythrus%29%2C_parque_nacional_del_lago_Nakuru%2C_Kenia%2C_2024-05-18%2C_DD_77.jpg",
    accentColor: "#10b981",
  },
  Delfín: {
    latinName: "Tursiops truncatus",
    emoji: "🐬",
    trait: "Chytrý týmový komunikátor",
    description: "Vysoce inteligentní mořský kytovec, který využívá echolokaci a komunikuje pomocí unikátních hvizdů.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Tursiops_truncatus_01-cropped.jpg/960px-Tursiops_truncatus_01-cropped.jpg",
    accentColor: "#06b6d4",
  },
  Sysel: {
    latinName: "Spermophilus citellus",
    emoji: "🐿️",
    trait: "Pozorný strážce na louce",
    description: "Denní stepní hlodavec s velkýma očima, který na loukách panáčkuje a hvizdem varuje kolonii před dravci.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/European_souslik_%28Spermophilus_citellus%29_Obrovisko.jpg/960px-European_souslik_%28Spermophilus_citellus%29_Obrovisko.jpg",
    accentColor: "#ca8a04",
  },
  Kormorán: {
    latinName: "Phalacrocorax carbo",
    emoji: "🦅",
    trait: "Hloubkový potápěč v logách",
    description: "Vodní pták se smaragdě zelenýma očima a hákovitým zobákem, který po lovu pod vodou suší roztažená křídla na slunci.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/2021-05-05_Phalacrocorax_carbo_carbo%2C_Killingworth_Lake%2C_Northumberland_1-1.jpg/960px-2021-05-05_Phalacrocorax_carbo_carbo%2C_Killingworth_Lake%2C_Northumberland_1-1.jpg",
    accentColor: "#0284c7",
  },
  Ledňáček: {
    latinName: "Alcedo atthis",
    emoji: "🐦",
    trait: "Bleskový lovec u řeky",
    description: "Létající drahokam našich řek s tyrkysově modrým a oranžovým peřím, který střemhlav loví drobné rybky.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Alcedo_atthis_-England-8_%28cropped%29.jpg/960px-Alcedo_atthis_-England-8_%28cropped%29.jpg",
    accentColor: "#06b6d4",
  },
  Mravenečník: {
    latinName: "Myrmecophaga tridactyla",
    emoji: "🐜",
    trait: "Specialista na drobné bugy",
    description: "Jihoamerický savec s protáhlou hlavou, huňatým ocasem a až 60 cm dlouhým lepkavým jazykem.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Myresluger2.jpg",
    accentColor: "#a855f7",
  },
  Lenochoďák: {
    latinName: "Choloepus didactylus",
    emoji: "🦥",
    trait: "Zenový mistr retrospektivy",
    description: "Dvouprstý noční obyvatel pralesních korun, který zvládá život s absolutním klidem a rozvahou.",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Cholepus_didactylus_-_Flickr_-_Dick_Culbert.jpg/960px-Cholepus_didactylus_-_Flickr_-_Dick_Culbert.jpg",
    accentColor: "#84cc16",
  },
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

export function getAllAnimalsCatalog(): AnimalVisualInfo[] {
  return GOOGLE_STYLE_ANIMALS.map((animal) => ({
    animal,
    ...ANIMAL_CATALOG[animal],
  }));
}
