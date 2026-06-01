import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { CLUB_TABLE_FORMATS, type ClubTableFormatId } from "@/lib/club-table-formats";

const tableFormatIds = CLUB_TABLE_FORMATS.map((f) => f.id) as [
  ClubTableFormatId,
  ...ClubTableFormatId[],
];

const tableCountsSchema = z
  .record(z.enum(tableFormatIds), z.coerce.number().int().min(0).max(500))
  .optional()
  .nullable();

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
    "SWISS",
    "FIXED_SWISS",
    "PAIR_OLYMPIC",
    "PAIR_SWISS",
    "FIXED_PAIR_SWISS",
  ]),
  startsAt: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING_CLUB_APPROVAL", "OPEN", "ACTIVE", "FINISHED"]).optional(),
});

export const tournamentUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(5000).optional().or(z.literal("")),
  clubId: z.string().min(1).optional(),
  format: z
    .enum([
      "OLYMPIC",
      "SWISS",
      "FIXED_SWISS",
      "PAIR_OLYMPIC",
      "PAIR_SWISS",
      "FIXED_PAIR_SWISS",
    ])
    .optional(),
  startsAt: z.string().optional().nullable(),
  status: z
    .enum(["DRAFT", "PENDING_CLUB_APPROVAL", "OPEN", "ACTIVE", "FINISHED"])
    .optional(),
});

export const tournamentRegistrationSchema = z.object({
  tournamentId: z.string().min(1),
  playerId: z.string().min(1),
  clubId: z.string().optional(),
  source: z.enum(["CLUB", "SELF"]),
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

export const matchResultSchema = z.object({
  matchId: z.string().min(1),
  winnerTeamId: z.string().min(1).optional(),
  team1Score: z.coerce.number().int().min(0).nullable().optional(),
  team2Score: z.coerce.number().int().min(0).nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
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

export const ideaVoteSchema = z.object({
  value: z.enum(["LIKE", "DISLIKE"]),
});

export const TOURNAMENT_FORMAT_LABELS: Record<string, string> = {
  OLYMPIC: "Олимпийская (фикс. сетка)",
  SWISS: "Швейцарская (по турам)",
  FIXED_SWISS: "Швейцарская (фикс. сетка)",
  PAIR_OLYMPIC: "Парный (фикс. сетка)",
  PAIR_SWISS: "Парный швейцарская (по турам)",
  FIXED_PAIR_SWISS: "Парный швейцарская (фикс. сетка)",
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
};
