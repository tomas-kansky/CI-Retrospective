import { z } from "zod";

// ==========================================
// 1. ZÁKLADNÍ DOMÉNOVÉ ENUMY A HODNOTY
// ==========================================

export const RetroPhaseSchema = z.enum([
  "BRAINSTORMING", // Účastníci píší karty (mohou být maskované/blurred)
  "GROUPING",      // Facilitátor a tým seskupují duplicitní témata
  "VOTING",        // Účastníci rozdělují své hlasy
  "DISCUSSION",    // Procházení témat seřazených podle hlasů, spuštění timeru
  "ACTION_ITEMS",  // Formulace a přiřazení úkolů
  "ARCHIVED",      // Retrospektiva je uzavřena (pouze ke čtení)
]);
export type RetroPhase = z.infer<typeof RetroPhaseSchema>;

export const TemplateTypeSchema = z.enum([
  "WENT_WELL_TO_IMPROVE", // Went well, To improve, Action items
  "MAD_SAD_GLAD",         // Mad, Sad, Glad
  "START_STOP_CONTINUE",   // Start, Stop, Continue
  "FOUR_LS",              // Liked, Learned, Lacked, Longed for
  "CUSTOM",               // Vlastní sloupce
]);
export type TemplateType = z.infer<typeof TemplateTypeSchema>;

// ==========================================
// 2. DOMÉNOVÉ MODELY
// ==========================================

export const UserSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarColor: z.string().default("#3b82f6"),
  isAnonymous: z.boolean().default(false),
  isFacilitator: z.boolean().default(false),
});
export type UserSession = z.infer<typeof UserSessionSchema>;

export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string().default("#6366f1"),
  sortOrder: z.number().default(0),
});
export type Column = z.infer<typeof ColumnSchema>;

export const CardSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  parentCardId: z.string().nullable().default(null), // Pro seskupování do skupiny
  authorSessionId: z.string(),
  authorName: z.string(),
  content: z.string(),
  sortOrder: z.number().default(0),
  color: z.string().optional(),
  createdAt: z.string(),
});
export type Card = z.infer<typeof CardSchema>;

export const VoteSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  userSessionId: z.string(),
  createdAt: z.string(),
});
export type Vote = z.infer<typeof VoteSchema>;

export const ActionItemSchema = z.object({
  id: z.string(),
  retrospectiveId: z.string(),
  text: z.string(),
  assignee: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).default("OPEN"),
  dueDate: z.string().optional(),
  createdAt: z.string(),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const RetrospectiveStateSchema = z.object({
  id: z.string(),
  title: z.string(),
  phase: RetroPhaseSchema.default("BRAINSTORMING"),
  templateType: TemplateTypeSchema.default("WENT_WELL_TO_IMPROVE"),
  maxVotesPerUser: z.number().default(5),
  cardsBlurred: z.boolean().default(true),
  timerEndsAt: z.number().nullable().default(null), // Unix timestamp v ms
  timerDurationSecs: z.number().default(300),        // Výchozí délka (např. 5 min)
  columns: z.array(ColumnSchema),
  cards: z.array(CardSchema),
  votes: z.array(VoteSchema),
  actionItems: z.array(ActionItemSchema),
});
export type RetrospectiveState = z.infer<typeof RetrospectiveStateSchema>;

// ==========================================
// 3. WEBSOCKET PROTOKOL (Real-time zprávy)
// ==========================================

// Zprávy od klienta na server (Durable Object)
export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("JOIN"),
    payload: UserSessionSchema,
  }),
  z.object({
    type: z.literal("ADD_CARD"),
    payload: z.object({
      columnId: z.string(),
      content: z.string(),
      isAnonymous: z.boolean().default(false),
    }),
  }),
  z.object({
    type: z.literal("UPDATE_CARD"),
    payload: z.object({
      cardId: z.string(),
      content: z.string(),
    }),
  }),
  z.object({
    type: z.literal("DELETE_CARD"),
    payload: z.object({
      cardId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("MOVE_CARD"),
    payload: z.object({
      cardId: z.string(),
      targetColumnId: z.string(),
      newSortOrder: z.number(),
    }),
  }),
  z.object({
    type: z.literal("GROUP_CARDS"),
    payload: z.object({
      sourceCardId: z.string(),
      targetCardId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("UNGROUP_CARD"),
    payload: z.object({
      cardId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("CAST_VOTE"),
    payload: z.object({
      cardId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("REMOVE_VOTE"),
    payload: z.object({
      cardId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("SET_PHASE"),
    payload: z.object({
      phase: RetroPhaseSchema,
    }),
  }),
  z.object({
    type: z.literal("TOGGLE_BLUR"),
    payload: z.object({
      blurred: z.boolean(),
    }),
  }),
  z.object({
    type: z.literal("TIMER_CONTROL"),
    payload: z.object({
      action: z.enum(["START", "PAUSE", "RESET", "ADD_MINUTE"]),
      durationSecs: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("ADD_ACTION_ITEM"),
    payload: z.object({
      text: z.string(),
      assignee: z.string().optional(),
      dueDate: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("UPDATE_ACTION_ITEM"),
    payload: z.object({
      id: z.string(),
      status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]),
    }),
  }),
  z.object({
    type: z.literal("TYPING_STATUS"),
    payload: z.object({
      columnId: z.string().optional(),
      isTyping: z.boolean(),
    }),
  }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Zprávy ze serveru (Durable Object) ke klientům
export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SYNC_STATE"),
    payload: RetrospectiveStateSchema,
  }),
  z.object({
    type: z.literal("PRESENCE_UPDATE"),
    payload: z.object({
      users: z.array(UserSessionSchema),
      typingUsers: z.array(z.object({ userId: z.string(), columnId: z.string().optional() })),
    }),
  }),
  z.object({
    type: z.literal("STATE_PATCH"),
    payload: z.object({
      cards: z.array(CardSchema).optional(),
      votes: z.array(VoteSchema).optional(),
      actionItems: z.array(ActionItemSchema).optional(),
      phase: RetroPhaseSchema.optional(),
      cardsBlurred: z.boolean().optional(),
      timerEndsAt: z.number().nullable().optional(),
    }),
  }),
  z.object({
    type: z.literal("ERROR"),
    payload: z.object({
      message: z.string(),
      code: z.string().optional(),
    }),
  }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
