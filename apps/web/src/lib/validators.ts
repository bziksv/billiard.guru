import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

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

export const clubRegisterSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  cityId: z.string().min(1, "Выберите город"),
  phone: phoneSchema,
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
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

export const tournamentSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(5000).optional().or(z.literal("")),
  clubId: z.string().min(1),
  format: z.enum(["OLYMPIC", "SWISS", "PAIR_OLYMPIC", "PAIR_SWISS"]),
  startsAt: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING_CLUB_APPROVAL", "OPEN", "ACTIVE", "FINISHED"]).optional(),
});

export const tournamentUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(5000).optional().or(z.literal("")),
  clubId: z.string().min(1).optional(),
  format: z.enum(["OLYMPIC", "SWISS", "PAIR_OLYMPIC", "PAIR_SWISS"]).optional(),
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

export const matchWinnerSchema = z.object({
  matchId: z.string().min(1),
  winnerTeamId: z.string().min(1),
});

export const TOURNAMENT_FORMAT_LABELS: Record<string, string> = {
  OLYMPIC: "Олимпийская система",
  SWISS: "Швейцарская система",
  PAIR_OLYMPIC: "Парный турнир (олимпийская)",
  PAIR_SWISS: "Парный турнир (швейцарская)",
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
