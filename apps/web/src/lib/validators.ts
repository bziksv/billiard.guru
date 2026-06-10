import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { MAX_PLAYER_RATING } from "@/lib/rating";
import { CLUB_TABLE_FORMATS, type ClubTableFormatId } from "@/lib/club-table-formats";

const tableFormatIds = CLUB_TABLE_FORMATS.map((f) => f.id) as [
  ClubTableFormatId,
  ...ClubTableFormatId[],
];

const tableCountsSchema = z
  .record(z.enum(tableFormatIds), z.coerce.number().int().min(0).max(500))
  .optional()
  .nullable();

/** Рейтинг с шагом 0,5. Объявлен до tournamentSchema, чтобы не было TDZ при импортах. */
export const ratingStepSchema = z
  .number()
  .min(0)
  .max(MAX_PLAYER_RATING)
  .refine((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-6, "Шаг рейтинга — 0,5");

export const tournamentRatingMaxSchema = z.coerce
  .number()
  .min(0, "Минимум 0")
  .max(MAX_PLAYER_RATING, `Максимум ${MAX_PLAYER_RATING}`)
  .pipe(ratingStepSchema);

export const tournamentRatingSourceSchema = z.enum(["CLUB", "SYSTEM"]);

export const phoneSchema = z
  .string()
  .regex(/^\+[0-9]{10,15}$/, "Некорректный формат телефона");

export async function validatePhoneForCity(
  phone: string,
  cityId: string,
  getCountryName: (cityId: string) => Promise<string | null>,
): Promise<{ phone: string; error?: string }> {
  const countryName = (await getCountryName(cityId)) ?? "Россия";
  const result = normalizePhone(phone, countryName);
  if (!result.valid) {
    return { phone: "", error: result.error ?? "Некорректный телефон" };
  }
  return { phone: result.e164 };
}

export const clubOwnerCreateSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  cityId: z.string().min(1, "Выберите город"),
  address: z.string().max(500).optional().or(z.literal("")),
  displayPhone: z.string().optional().or(z.literal("")),
});

export const clubRegisterSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  cityId: z.string().min(1, "Выберите город"),
  phone: phoneSchema,
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  workingHours: z.string().max(2000).optional().or(z.literal("")),
  weeklyHours: z.unknown().optional(),
  tableCount: z.coerce.number().int().min(0).max(500).optional(),
  tableCounts: tableCountsSchema,
  gamePrice: z.string().max(2000).optional().or(z.literal("")),
  priceTiers: z.unknown().optional(),
  displayPhone: z.string().optional().or(z.literal("")),
});

export const clubUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  cityId: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  description: z.string().max(5000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  workingHours: z.string().max(2000).optional().nullable(),
  weeklyHours: z.unknown().optional().nullable(),
  tableCount: z.coerce.number().int().min(0).max(500).optional().nullable(),
  tableCounts: tableCountsSchema,
  gamePrice: z.string().max(2000).optional().nullable(),
  priceTiers: z.unknown().optional().nullable(),
  bookingEnabled: z.coerce.boolean().optional(),
  bookingSlotMinutes: z.coerce.number().int().min(30).max(240).optional(),
  bookingAdvanceDays: z.coerce.number().int().min(1).max(90).optional(),
  displayPhone: z.string().optional().nullable().or(z.literal("")),
  floorPlan: z.unknown().optional().nullable(),
});

export const bookingCreateSchema = z.object({
  tableFormat: z.enum(tableFormatIds),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional(),
  playerNote: z.string().max(500).optional().or(z.literal("")),
  floorItemId: z.string().min(1).optional().nullable(),
});

export const bookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "REJECTED", "CANCELLED"]),
});

export const clubStaffAddSchema = z.object({
  phone: z.string().min(5, "Укажите телефон"),
});

export const bookingManageCreateSchema = z.object({
  kind: z.enum(["CLUB", "BLOCK"]),
  tableFormat: z.enum(tableFormatIds),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  floorItemId: z.string().min(1).nullish(),
  playerId: z.string().min(1).nullish(),
  guestName: z.string().max(120).nullish(),
  guestPhone: z.string().max(20).nullish(),
  playerNote: z.string().max(500).nullish(),
  clubNote: z.string().max(500).nullish(),
});

export const clubNewsSchema = z.object({
  title: z.string().min(2, "Минимум 2 символа").max(200),
  body: z.string().min(2, "Минимум 2 символа").max(10000),
  publishedAt: z.string().optional(),
  /** Платная опция — пока игнорируется на сервере. */
  cityBroadcastRequested: z.boolean().optional(),
});

export const siteNewsSchema = z.object({
  title: z.string().min(2, "Минимум 2 символа").max(200),
  body: z.string().min(2, "Минимум 2 символа").max(10000),
});

export const siteNewsActionSchema = z.object({
  action: z.enum(["unpublish", "republish"]),
});

export const playerRegisterSchema = z.object({
  firstName: z.string().min(2, "Минимум 2 символа"),
  lastName: z.string().min(2, "Минимум 2 символа"),
  middleName: z.string().optional(),
  cityId: z.string().min(1, "Выберите город"),
  phone: phoneSchema,
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  birthDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Некорректная дата",
    ),
  rating: z.coerce.number().min(0).multipleOf(0.5).default(0),
});

export const playerUpdateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  middleName: z.string().optional().nullable(),
  cityId: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  birthDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (v) => v == null || v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Некорректная дата",
    ),
  rating: z.coerce.number().min(0).multipleOf(0.5).optional(),
  isVerified: z.boolean().optional(),
  role: z.enum(["PLAYER", "SUPERADMIN"]).optional(),
});

export const clubPlayerRatingSchema = z.object({
  playerId: z.string().min(1),
  rating: z.coerce.number().min(0).multipleOf(0.5),
});

export const playerAboutUpdateSchema = z.object({
  about: z.string().max(4000).optional().nullable().or(z.literal("")),
});

export const coachReviewSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable().or(z.literal("")),
});

export const coachProfileUpdateSchema = z.object({
  isCoach: z.boolean(),
  coachBio: z.string().max(8000).optional().nullable().or(z.literal("")),
  coachGalleryUrls: z
    .array(
      z
        .string()
        .min(1)
        .max(500)
        .refine((u) => u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/uploads/"), {
          message: "Некорректный URL фото",
        }),
    )
    .max(12)
    .optional(),
});

export const clubPlayerRatingUpdateSchema = z.object({
  rating: z.coerce.number().min(0).multipleOf(0.5),
});

export const tournamentSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(5000).optional().or(z.literal("")),
  clubId: z.string().min(1),
  format: z.enum([
    "OLYMPIC",
    "OLYMPIC_1L_BRONZE",
    "SWISS",
    "FIXED_SWISS",
    "FIXED_SWISS_16_BRONZE",
    "FIXED_SWISS_32",
    "FIXED_SWISS_32_BRONZE",
    "FIXED_SWISS_32R4_2_3_mesta",
    "FIXED_SWISS_32R4_1_3_mesto",
    "FIXED_SWISS_32R8",
    "FIXED_SWISS_32R8_2_3_mesta",
    "FIXED_SWISS_32R8_1_3_mesto",
    "FIXED_SWISS_32R8_BRONZE",
    "FIXED_SWISS_64",
    "FIXED_SWISS_64_BRONZE",
    "PAIR_OLYMPIC",
    "PAIR_OLYMPIC_1L_BRONZE",
    "PAIR_SWISS",
    "FIXED_PAIR_SWISS",
    "FIXED_PAIR_SWISS_16_BRONZE",
    "FIXED_PAIR_SWISS_32",
    "FIXED_PAIR_SWISS_32_BRONZE",
    "FIXED_PAIR_SWISS_64",
    "FIXED_PAIR_SWISS_64_BRONZE",
    "EXCEL_REF_64",
  ]),
  startsAt: z.string().optional(),
  ratingMax: tournamentRatingMaxSchema.nullable().optional(),
  ratingSource: tournamentRatingSourceSchema.optional().default("CLUB"),
  handicapHalfStep: z.boolean().optional().default(true),
  suppressNotifications: z.boolean().optional().default(false),
  tableIds: z.array(z.string().min(1)).min(1, "Выберите хотя бы один стол"),
  tableStreams: z.record(z.string().min(1), z.string().max(2000)).optional(),
  status: z.enum(["DRAFT", "PENDING_CLUB_APPROVAL", "OPEN", "ACTIVE", "FINISHED"]).optional(),
});

export const tournamentUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(5000).optional().or(z.literal("")),
  clubId: z.string().min(1).optional(),
  format: z
    .enum([
      "OLYMPIC",
      "OLYMPIC_1L_BRONZE",
      "SWISS",
      "FIXED_SWISS",
      "FIXED_SWISS_16_BRONZE",
      "FIXED_SWISS_32",
      "FIXED_SWISS_32_BRONZE",
      "FIXED_SWISS_32R4_2_3_mesta",
      "FIXED_SWISS_32R4_1_3_mesto",
      "FIXED_SWISS_32R8",
      "FIXED_SWISS_32R8_2_3_mesta",
      "FIXED_SWISS_32R8_1_3_mesto",
      "FIXED_SWISS_32R8_BRONZE",
      "FIXED_SWISS_64",
      "FIXED_SWISS_64_BRONZE",
      "PAIR_OLYMPIC",
      "PAIR_OLYMPIC_1L_BRONZE",
      "PAIR_SWISS",
      "FIXED_PAIR_SWISS",
      "FIXED_PAIR_SWISS_16_BRONZE",
      "FIXED_PAIR_SWISS_32",
      "FIXED_PAIR_SWISS_32_BRONZE",
      "FIXED_PAIR_SWISS_64",
      "FIXED_PAIR_SWISS_64_BRONZE",
      "EXCEL_REF_64",
    ])
    .optional(),
  startsAt: z.string().optional().nullable(),
  status: z
    .enum(["DRAFT", "PENDING_CLUB_APPROVAL", "OPEN", "ACTIVE", "FINISHED"])
    .optional(),
  ratingMax: tournamentRatingMaxSchema.nullable().optional(),
  ratingSource: tournamentRatingSourceSchema.optional(),
  handicapHalfStep: z.boolean().optional(),
  suppressNotifications: z.boolean().optional(),
  /** true — снять лимит рейтинга (ratingMax → null) */
  clearRatingLimit: z.boolean().optional(),
});

export const tournamentPublishSchema = z.object({
  suppressNotifications: z.boolean().optional(),
});

export const tournamentRegistrationSchema = z.object({
  tournamentId: z.string().min(1),
  playerId: z.string().min(1),
  clubId: z.string().optional(),
  source: z.enum(["CLUB", "SELF"]),
});

export const tournamentRegistrationPatchSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["CONFIRMED", "REJECTED", "CANCELLED"]).optional(),
    feePaid: z.boolean().optional(),
  })
  .refine((d) => d.status !== undefined || d.feePaid !== undefined, {
    message: "Нечего обновлять",
  });

export const tournamentTeamSchema = z
  .object({
    tournamentId: z.string().min(1),
    player1Id: z.string().min(1),
    player2Id: z.string().min(1),
    name: z.string().max(120).optional().or(z.literal("")),
    clubId: z.string().optional(),
    source: z.enum(["CLUB", "SELF"]),
  })
  .refine((d) => d.player1Id !== d.player2Id, {
    message: "Выберите двух разных игроков",
    path: ["player2Id"],
  });

export const tournamentTeamUpdateSchema = z
  .object({
    id: z.string().min(1),
    player1Id: z.string().min(1).optional(),
    player2Id: z.string().min(1).optional(),
    name: z.string().max(120).optional().nullable(),
    status: z.enum(["CONFIRMED", "REJECTED", "CANCELLED"]).optional(),
    feePaid: z.boolean().optional(),
  })
  .refine(
    (d) => {
      if (d.player1Id || d.player2Id) {
        return Boolean(d.player1Id && d.player2Id);
      }
      return true;
    },
    { message: "Укажите обоих игроков", path: ["player2Id"] },
  )
  .refine(
    (d) => !d.player1Id || d.player1Id !== d.player2Id,
    { message: "Выберите двух разных игроков", path: ["player2Id"] },
  );

export const matchWinnerSchema = z.object({
  matchId: z.string().min(1),
  winnerTeamId: z.string().min(1),
});

export const matchCancelSchema = z.object({
  matchId: z.string().min(1),
});

export const bracketGenerateSchema = z
  .object({
    tournamentId: z.string().min(1),
    regenerate: z.boolean().optional(),
    deleteBracket: z.boolean().optional(),
  })
  .refine((data) => !(data.regenerate && data.deleteBracket), {
    message: "Укажите только одно действие: regenerate или deleteBracket",
  });

export const bracketResetSchema = z.object({
  tournamentId: z.string().min(1),
});

export const matchResultSchema = z.object({
  matchId: z.string().min(1),
  winnerTeamId: z.string().min(1).optional(),
  team1Score: z.coerce.number().int().min(0).nullable().optional(),
  team2Score: z.coerce.number().int().min(0).nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  tableId: z.string().min(1).nullable().optional(),
});

export const ideaCreateSchema = z.object({
  title: z.string().min(3, "Минимум 3 символа").max(120),
  body: z.string().min(10, "Минимум 10 символов").max(2000),
  clubId: z.string().min(1).optional(),
});

export const ideaModerateSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectReason: z.string().max(500).optional(),
});

export const clubNewsModerateSchema = z.object({
  action: z.enum(["approve", "reject", "unpublish"]),
  rejectReason: z.string().max(500).optional(),
});

export const ideaVoteSchema = z.object({
  value: z.enum(["LIKE", "DISLIKE"]),
});

export const playListingCreateSchema = z
  .object({
    title: z.string().min(3, "Минимум 3 символа").max(120),
    body: z.string().max(2000).optional().or(z.literal("")),
    kind: z.enum(["SPARRING", "PARTNER", "OPPONENT", "TRAINING", "OTHER"]),
    scheduleType: z.enum(["ONE_TIME", "RECURRING"]),
    cityId: z.string().min(1, "Выберите город"),
    clubId: z.string().min(1).optional().or(z.literal("")),
    playAt: z.string().datetime({ offset: true }).optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    timeFrom: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Формат ЧЧ:ММ")
      .optional()
      .or(z.literal("")),
    timeTo: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Формат ЧЧ:ММ")
      .optional()
      .or(z.literal("")),
    gameFormat: z.enum(tableFormatIds).optional().or(z.literal("")),
    ratingMin: ratingStepSchema.optional().nullable(),
    ratingMax: ratingStepSchema.optional().nullable(),
    playersNeeded: z
      .string()
      .trim()
      .min(1, "Укажите, сколько игроков")
      .max(48)
      .default("1"),
  })
  .superRefine((data, ctx) => {
    if (data.scheduleType === "ONE_TIME" && !data.playAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите дату и время для разовой игры",
        path: ["playAt"],
      });
    }
    if (data.scheduleType === "RECURRING") {
      if (!data.weekdays?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Выберите хотя бы один день недели",
          path: ["weekdays"],
        });
      }
      if (!data.timeFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Укажите время начала",
          path: ["timeFrom"],
        });
      }
    }
    if (
      data.ratingMin != null &&
      data.ratingMax != null &&
      data.ratingMin > data.ratingMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Минимальный рейтинг не может быть выше максимального",
        path: ["ratingMax"],
      });
    }
  });

export const playListingUpdateSchema = z.object({
  status: z.enum(["OPEN", "MATCHED", "CLOSED"]).optional(),
});

export const playListingRespondSchema = z.object({
  message: z.string().max(500).optional().or(z.literal("")),
});

export const playListingResponseUpdateSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "WITHDRAWN"]),
});

/** Эталон 64→32 из Excel 64-16 ×2gr.xls */
export const EXCEL_REF_64_FORMAT_LABEL = "тест с эксельки";

/** 64→32 + матч проигравших полуфиналистов за 3–4 место (#120). */
export const FIXED_SWISS_64_BRONZE_FORMAT_LABEL =
  "Сетка на 64 до 2 поражений, олимпийка с 1/8 с определением 3 и 4 места";

/** 64→32 (115 встреч) — #105–#112→#113–#116, #117 1/4, #118 полуфинал, #119 финал. */
export const FIXED_SWISS_64_FORMAT_LABEL =
  "Сетка на 64 до 2 поражений, олимпийка с 1/8 с двумя 3 местами";

/** 32→16 (56): 1/4 + матч за 3–4. */
export const FIXED_SWISS_32_BRONZE_FORMAT_LABEL =
  "Сетка на 32 до 2 поражений, олимпийка с 1/4 с определением 3 и 4 места (доп.игра)";

/** 32→16 (55/56): олимпийка с 1/4. */
export const FIXED_SWISS_32_FORMAT_LABEL =
  "Сетка на 32 до 2 поражений, олимпийка с 1/4 с двумя 3 местами";

/** 32→16 (60): 1/8 + матч за 3–4 (#60). */
export const FIXED_SWISS_32R8_BRONZE_FORMAT_LABEL =
  "Сетка на 32 до 2 поражений, олимпийка с 1/8 с определением 3 и 4 места (доп.игра)";

/** 32→16 (56): R8_2_3_mesta + матч проигравших полуфиналистов за 3–4 (#60). */
export const FIXED_SWISS_32R8_1_3_mesto_FORMAT_LABEL =
  "Сетка на 32 до 2 поражений, олимпийка с 1/8 с определением 3 и 4 места (доп.игра)";

/** 32→16 (59 встреч) — #41–#44 1/8, нижняя тур 3–4, 1/4 с #53. */
export const FIXED_SWISS_32R8_FORMAT_LABEL =
  "Сетка на 32 до 2 поражений, олимпийка с 1/8 с двумя 3 местами";

/** 16→8 (27 встреч, 7 колонок). */
export const FIXED_SWISS_16_8_FORMAT_LABEL =
  "Сетка на 16 до 2 поражений, олимпийка с 1/4 с двумя 3 местами";

/** 16→8 + отдельный матч проигравших полуфиналистов за 3–4 место (#28). */
export const FIXED_SWISS_16_BRONZE_FORMAT_LABEL =
  "Сетка на 16 до 2 поражений, олимпийка с 1/4 с определением 3 и 4 места (доп.игра)";

/** Одиночная олимпийская фикс. сетка (код OLYMPIC в Prisma). */
export const OLYMPIC_SINGLE_FORMAT_LABEL =
  "Сетка (олимпийская) до 1 поражения, с двумя 3 местами";

/** Олимпийская с матчем проигравших полуфиналистов за 3–4 место. */
export const OLYMPIC_1L_BRONZE_FORMAT_LABEL =
  "Сетка (олимпийская) до 1 поражения, с определением 3 и 4 места (доп.игра)";

export const TOURNAMENT_FORMAT_LABELS: Record<string, string> = {
  OLYMPIC: OLYMPIC_SINGLE_FORMAT_LABEL,
  OLYMPIC_1L_BRONZE: OLYMPIC_1L_BRONZE_FORMAT_LABEL,
  SWISS: "Швейцарская (по турам)",
  FIXED_SWISS: FIXED_SWISS_16_8_FORMAT_LABEL,
  FIXED_SWISS_16_BRONZE: FIXED_SWISS_16_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32: FIXED_SWISS_32_FORMAT_LABEL,
  FIXED_SWISS_32_BRONZE: FIXED_SWISS_32_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32R4_2_3_mesta: FIXED_SWISS_32_FORMAT_LABEL,
  FIXED_SWISS_32R4_1_3_mesto: FIXED_SWISS_32_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32R8: FIXED_SWISS_32R8_FORMAT_LABEL,
  FIXED_SWISS_32R8_2_3_mesta: FIXED_SWISS_32R8_FORMAT_LABEL,
  FIXED_SWISS_32R8_1_3_mesto: FIXED_SWISS_32R8_1_3_mesto_FORMAT_LABEL,
  FIXED_SWISS_32R8_BRONZE: FIXED_SWISS_32R8_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_64: FIXED_SWISS_64_FORMAT_LABEL,
  FIXED_SWISS_64_BRONZE: FIXED_SWISS_64_BRONZE_FORMAT_LABEL,
  PAIR_OLYMPIC: "Парный (фикс. сетка)",
  PAIR_OLYMPIC_1L_BRONZE: `Парная: ${OLYMPIC_1L_BRONZE_FORMAT_LABEL}`,
  PAIR_SWISS: "Парный швейцарская (по турам)",
  FIXED_PAIR_SWISS: `Парная: ${FIXED_SWISS_16_8_FORMAT_LABEL}`,
  FIXED_PAIR_SWISS_16_BRONZE: `Парная: ${FIXED_SWISS_16_BRONZE_FORMAT_LABEL}`,
  FIXED_PAIR_SWISS_32: `Парная: ${FIXED_SWISS_32_FORMAT_LABEL}`,
  FIXED_PAIR_SWISS_32_BRONZE: `Парная: ${FIXED_SWISS_32_BRONZE_FORMAT_LABEL}`,
  FIXED_PAIR_SWISS_64: `Парная: ${FIXED_SWISS_64_FORMAT_LABEL}`,
  FIXED_PAIR_SWISS_64_BRONZE: `Парная: ${FIXED_SWISS_64_BRONZE_FORMAT_LABEL}`,
  EXCEL_REF_64: EXCEL_REF_64_FORMAT_LABEL,
};

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает подтверждения",
  CONFIRMED: "Подтверждена",
  REJECTED: "Отклонена",
  CANCELLED: "Отменена",
};

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING_CLUB_APPROVAL: "Ожидает подтверждения клуба",
  OPEN: "Открыта регистрация",
  ACTIVE: "Идёт",
  FINISHED: "Завершён",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  PLAYER: "Игрок",
  SUPERADMIN: "Суперадмин",
};

export const IDEA_STATUS_LABELS: Record<string, string> = {
  PENDING: "На модерации",
  APPROVED: "Опубликована",
  REJECTED: "Отклонена",
  UNPUBLISHED: "Снята с публикации",
};

/** Подписи статусов новостей клуба (включая снятие с публикации). */
export const CLUB_NEWS_STATUS_LABELS: Record<string, string> = IDEA_STATUS_LABELS;
