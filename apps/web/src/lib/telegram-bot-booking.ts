import { writeAuditLog } from "@/lib/audit";
import { renderFloorPlanPngForBooking } from "@/lib/floor-plan-image";
import { parseFloorPlan } from "@/lib/club-floor-plan";
import { clubTableFormatLabel, type ClubTableFormatId } from "@/lib/club-table-formats";
import { notifyClubNewBooking } from "@/lib/club-booking-notify";
import {
  floorTableAvailability,
  floorTableLabel,
  floorTablesForFormat,
} from "@/lib/floor-plan-booking";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_BOOKING_STATUSES,
  bookingDateOptions,
  bookingFormatLabel,
  bookingStepMinutes,
  buildBookingSlots,
  clubBookingFormatEntries,
  durationOptionsForSlot,
  formatBookingDuration,
  formatBookingRange,
  type ClubBookingContext,
  validateBookingRequest,
} from "@/lib/table-booking";
import {
  answerCallbackQuery,
  editTelegramMessage,
  editTelegramPhotoCaption,
  sendTelegramMessage,
  sendTelegramPhoto,
} from "@/lib/telegram";

const FMT_CODES: Record<ClubTableFormatId, string> = {
  PYRAMID: "P",
  POOL: "O",
  SNOOKER: "S",
  CHINESE_POOL: "C",
  CAROM: "R",
};

const CODE_TO_FMT = Object.fromEntries(
  Object.entries(FMT_CODES).map(([k, v]) => [v, k]),
) as Record<string, ClubTableFormatId>;

const SLOT_PAGE_SIZE = 8;
const NO_TABLE = "n";

type InlineButton =
  | { text: string; callback_data: string }
  | { text: string; url: string };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function appUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3010";
  return base.replace(/\/$/, "");
}

function clubBookingContext(club: {
  id: string;
  bookingEnabled: boolean;
  bookingSlotMinutes: number;
  bookingAdvanceDays: number;
  weeklyHours: unknown;
  workingHours: string | null;
  tableCounts: unknown;
  floorPlan: unknown;
}): ClubBookingContext {
  return {
    id: club.id,
    bookingEnabled: club.bookingEnabled,
    bookingSlotMinutes: club.bookingSlotMinutes,
    bookingAdvanceDays: club.bookingAdvanceDays,
    weeklyHours: club.weeklyHours,
    workingHours: club.workingHours,
    tableCounts: club.tableCounts,
    floorPlan: club.floorPlan,
  };
}

const clubSelect = {
  id: true,
  name: true,
  cityId: true,
  bookingEnabled: true,
  bookingSlotMinutes: true,
  bookingAdvanceDays: true,
  weeklyHours: true,
  workingHours: true,
  tableCounts: true,
  floorPlan: true,
} as const;

type ClubRow = NonNullable<Awaited<ReturnType<typeof loadClubById>>>;

async function loadClubById(clubId: string) {
  return prisma.club.findUnique({
    where: { id: clubId },
    select: clubSelect,
  });
}

export async function loadBookableClubsInCity(cityId: string) {
  return prisma.club.findMany({
    where: { cityId, bookingEnabled: true, isVerified: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 8,
  });
}

export function bookingClubsInlineKeyboard(clubs: { id: string; name: string }[]) {
  const rows: InlineButton[][] = [];
  for (const club of clubs) {
    const label = club.name.length > 28 ? `${club.name.slice(0, 25)}…` : club.name;
    rows.push([{ text: `📍 ${label}`, callback_data: `bk1_${club.id}` }]);
  }
  rows.push([{ text: "📅 Все клубы города", callback_data: "bk0" }]);
  return { inline_keyboard: rows };
}

function fmtCode(format: ClubTableFormatId): string {
  return FMT_CODES[format];
}

function parseFmtCode(code: string): ClubTableFormatId | null {
  return CODE_TO_FMT[code] ?? null;
}

function dateKeyCompact(date: string) {
  return date.replace(/-/g, "");
}

function dateFromCompact(compact: string) {
  if (!/^\d{8}$/.test(compact)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

async function loadExistingForDay(clubId: string, date: string) {
  const dayStart = new Date(`${date}T00:00:00+03:00`);
  const dayEnd = new Date(`${date}T23:59:59+03:00`);
  return prisma.tableBooking.findMany({
    where: {
      clubId,
      startsAt: { gte: dayStart, lte: dayEnd },
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
    select: {
      tableFormat: true,
      startsAt: true,
      endsAt: true,
      status: true,
      playerId: true,
      floorItemId: true,
      kind: true,
    },
  });
}

async function loadExistingForRange(clubId: string, startsAt: Date, endsAt: Date) {
  const rangeStart = new Date(startsAt.getTime() - 24 * 60 * 60_000);
  const rangeEnd = new Date(endsAt.getTime() + 24 * 60 * 60_000);
  return prisma.tableBooking.findMany({
    where: {
      clubId,
      startsAt: { gte: rangeStart, lte: rangeEnd },
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
    select: {
      tableFormat: true,
      startsAt: true,
      endsAt: true,
      status: true,
      playerId: true,
      floorItemId: true,
      kind: true,
    },
  });
}

async function findVerifiedPlayer(telegramId: string) {
  return prisma.player.findFirst({
    where: { telegramId, isVerified: true },
    include: { city: { include: { country: true } } },
  });
}

async function editBookingWizardMessage(
  chatId: string,
  messageId: number,
  text: string,
  keyboard?: { inline_keyboard: InlineButton[][] },
) {
  const opts = keyboard ? { replyMarkup: keyboard } : { replyMarkup: { inline_keyboard: [] } };
  const captionOk = await editTelegramPhotoCaption(chatId, messageId, text, opts);
  if (captionOk) return;
  await editTelegramMessage(chatId, messageId, text, opts);
}

async function replyOrEdit(
  telegramId: string,
  text: string,
  keyboard: { inline_keyboard: InlineButton[][] },
  sourceMessage?: { chatId: string; messageId: number },
) {
  if (sourceMessage) {
    await editBookingWizardMessage(
      sourceMessage.chatId,
      sourceMessage.messageId,
      text,
      keyboard,
    );
  } else {
    await sendTelegramMessage(telegramId, text, { replyMarkup: keyboard });
  }
}

export async function startBookingClubList(
  telegramId: string,
  sourceMessage?: { chatId: string; messageId: number },
) {
  const player = await findVerifiedPlayer(telegramId);
  if (!player) {
    await sendTelegramMessage(telegramId, "❌ Сначала привяжите профиль через /start");
    return;
  }

  const clubs = await loadBookableClubsInCity(player.cityId);
  const text =
    clubs.length === 0
      ? `📅 <b>Забронировать стол</b>\n\nВ городе ${escapeHtml(player.city.nameRu)} пока нет клубов с онлайн-бронированием.`
      : `📅 <b>Забронировать стол</b>\n\nКлубы в ${escapeHtml(player.city.nameRu)}:`;

  const rows: InlineButton[][] = [];
  for (const club of clubs) {
    const label = club.name.length > 28 ? `${club.name.slice(0, 25)}…` : club.name;
    rows.push([{ text: `📍 ${label}`, callback_data: `bk1_${club.id}` }]);
  }
  if (clubs.length === 0) {
    rows.push([{ text: "Все клубы на сайте", url: `${appUrl()}/clubs` }]);
  }
  rows.push([{ text: "Отмена", callback_data: "bkc" }]);

  await replyOrEdit(telegramId, text, { inline_keyboard: rows }, sourceMessage);
}

async function showFormatStep(
  telegramId: string,
  club: ClubRow,
  sourceMessage?: { chatId: string; messageId: number },
  note?: string,
) {
  const formats = clubBookingFormatEntries(club.tableCounts, club.floorPlan);
  if (formats.length === 0) {
    await replyOrEdit(
      telegramId,
      `📅 <b>${escapeHtml(club.name)}</b>\n\nБронирование недоступно — нет столов.`,
      { inline_keyboard: [[{ text: "← Назад", callback_data: "bk0" }]] },
      sourceMessage,
    );
    return;
  }

  const rows: InlineButton[][] = formats.map((f) => [
    {
      text: `${f.label} (${f.count})`,
      callback_data: `bk2_${club.id}_${fmtCode(f.id)}`,
    },
  ]);
  rows.push([{ text: "← К клубам", callback_data: "bk0" }]);

  const noteBlock = note ? `\n\n${note}` : "";

  await replyOrEdit(
    telegramId,
    `📅 <b>${escapeHtml(club.name)}</b>\n\nВыберите формат стола:${noteBlock}`,
    { inline_keyboard: rows },
    sourceMessage,
  );
}

export async function startBookingForClub(telegramId: string, clubId: string) {
  const player = await findVerifiedPlayer(telegramId);
  if (!player) {
    await sendTelegramMessage(
      telegramId,
      "❌ Для бронирования нужен профиль на billiard.guru.\n\nПодтвердите номер через /start, затем снова откройте ссылку клуба.",
    );
    return;
  }

  const club = await prisma.club.findFirst({
    where: { id: clubId, bookingEnabled: true, isVerified: true },
    select: clubSelect,
  });

  if (!club) {
    await sendTelegramMessage(
      telegramId,
      "❌ Клуб недоступен для бронирования.\n\nВозможно, бронирование отключено или клуб ещё не подтверждён.",
    );
    return;
  }

  const note =
    club.cityId !== player.cityId
      ? "<i>Клуб в другом городе — бронирование по прямой ссылке.</i>"
      : undefined;

  await showFormatStep(telegramId, club, undefined, note);
}

async function showDateStep(
  telegramId: string,
  club: ClubRow,
  format: ClubTableFormatId,
  sourceMessage?: { chatId: string; messageId: number },
) {
  const dates = bookingDateOptions(club.bookingAdvanceDays);
  const rows: InlineButton[][] = dates.slice(0, 7).map((d) => [
    {
      text: d.label,
      callback_data: `bk3_${club.id}_${fmtCode(format)}_${dateKeyCompact(d.value)}`,
    },
  ]);
  rows.push([{ text: "← Формат", callback_data: `bk1_${club.id}` }]);

  await replyOrEdit(
    telegramId,
    `📅 <b>${escapeHtml(club.name)}</b>\n${escapeHtml(bookingFormatLabel(format))}\n\nВыберите дату:`,
    { inline_keyboard: rows },
    sourceMessage,
  );
}

async function showSlotStep(
  telegramId: string,
  club: ClubRow,
  format: ClubTableFormatId,
  date: string,
  page: number,
  sourceMessage?: { chatId: string; messageId: number },
) {
  const ctx = clubBookingContext(club);
  const existing = await loadExistingForDay(club.id, date);
  const slots = buildBookingSlots(ctx, date, format, existing);
  const slice = slots.slice(page * SLOT_PAGE_SIZE, (page + 1) * SLOT_PAGE_SIZE);

  if (slots.length === 0) {
    await replyOrEdit(
      telegramId,
      `📅 <b>${escapeHtml(club.name)}</b>\n${escapeHtml(bookingFormatLabel(format))}\n\nНа ${escapeHtml(date)} свободных слотов нет.`,
      {
        inline_keyboard: [
          [{ text: "← Другая дата", callback_data: `bk2_${club.id}_${fmtCode(format)}` }],
        ],
      },
      sourceMessage,
    );
    return;
  }

  const rows: InlineButton[][] = slice.map((slot) => {
    const unix = Math.floor(new Date(slot.startsAt).getTime() / 1000);
    return [
      {
        text: `${slot.label} (${slot.available}/${slot.capacity})`,
        callback_data: `bk4_${club.id}_${fmtCode(format)}_${unix}`,
      },
    ];
  });

  const nav: InlineButton[] = [];
  if (page > 0) {
    nav.push({
      text: "◀️",
      callback_data: `bk3p_${club.id}_${fmtCode(format)}_${dateKeyCompact(date)}_${page - 1}`,
    });
  }
  if ((page + 1) * SLOT_PAGE_SIZE < slots.length) {
    nav.push({
      text: "▶️",
      callback_data: `bk3p_${club.id}_${fmtCode(format)}_${dateKeyCompact(date)}_${page + 1}`,
    });
  }
  if (nav.length) rows.push(nav);
  rows.push([{ text: "← Дата", callback_data: `bk2_${club.id}_${fmtCode(format)}` }]);

  await replyOrEdit(
    telegramId,
    `📅 <b>${escapeHtml(club.name)}</b>\n${escapeHtml(bookingFormatLabel(format))}\n${escapeHtml(date)}\n\nВыберите время:`,
    { inline_keyboard: rows },
    sourceMessage,
  );
}

async function showDurationStep(
  telegramId: string,
  club: ClubRow,
  format: ClubTableFormatId,
  startsAt: Date,
  sourceMessage?: { chatId: string; messageId: number },
) {
  const ctx = clubBookingContext(club);
  const date = startsAt.toISOString().slice(0, 10);
  const options = durationOptionsForSlot(ctx, date, startsAt);
  const unix = Math.floor(startsAt.getTime() / 1000);

  if (options.length <= 1) {
    const dur = options[0] ?? bookingStepMinutes(ctx);
    return showTableOrConfirmStep(telegramId, club, format, startsAt, dur, sourceMessage);
  }

  const rows: InlineButton[][] = options.map((dur) => [
    {
      text: formatBookingDuration(dur),
      callback_data: `bk5_${club.id}_${fmtCode(format)}_${unix}_${dur}`,
    },
  ]);
  rows.push([
    {
      text: "← Время",
      callback_data: `bk3_${club.id}_${fmtCode(format)}_${dateKeyCompact(date)}`,
    },
  ]);

  await replyOrEdit(
    telegramId,
    `📅 <b>${escapeHtml(club.name)}</b>\n${escapeHtml(formatBookingRange(startsAt, new Date(startsAt.getTime() + bookingStepMinutes(ctx) * 60_000)))}\n\nНа сколько забронировать?`,
    { inline_keyboard: rows },
    sourceMessage,
  );
}

async function showTableOrConfirmStep(
  telegramId: string,
  club: ClubRow,
  format: ClubTableFormatId,
  startsAt: Date,
  durationMin: number,
  sourceMessage?: { chatId: string; messageId: number },
) {
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const floorPlan = parseFloorPlan(club.floorPlan);
  const planTables = floorTablesForFormat(floorPlan, format);
  const unix = Math.floor(startsAt.getTime() / 1000);

  if (planTables.length === 0) {
    return showConfirmStep(
      telegramId,
      club,
      format,
      startsAt,
      endsAt,
      null,
      `bk4_${club.id}_${fmtCode(format)}_${unix}`,
      sourceMessage,
    );
  }

  const existing = await loadExistingForRange(club.id, startsAt, endsAt);
  const tables = floorTableAvailability(floorPlan, format, startsAt, endsAt, existing);
  const free = tables.filter((t) => t.status === "free");

  if (free.length === 0) {
    await replyOrEdit(
      telegramId,
      "📅 Нет свободных столов на это время.\n\nВыберите другое время.",
      {
        inline_keyboard: [
          [
            {
              text: "← Время",
              callback_data: `bk3_${club.id}_${fmtCode(format)}_${dateKeyCompact(startsAt.toISOString().slice(0, 10))}`,
            },
          ],
        ],
      },
      sourceMessage,
    );
    return;
  }

  if (free.length === 1) {
    return showConfirmStep(
      telegramId,
      club,
      format,
      startsAt,
      endsAt,
      free[0]!.id,
      `bk5_${club.id}_${fmtCode(format)}_${unix}_${durationMin}`,
      sourceMessage,
    );
  }

  const rows: InlineButton[][] = free.slice(0, 8).map((t, idx) => [
    {
      text: t.label,
      callback_data: `bk6_${club.id}_${fmtCode(format)}_${unix}_${durationMin}_${idx}`,
    },
  ]);
  rows.push([
    {
      text: "← Длительность",
      callback_data: `bk4_${club.id}_${fmtCode(format)}_${unix}`,
    },
  ]);

  const caption = [
    `📅 <b>${escapeHtml(club.name)}</b>`,
    escapeHtml(formatBookingRange(startsAt, endsAt)),
    "",
    "Выберите стол на плане:",
  ].join("\n");

  const png = await renderFloorPlanPngForBooking(club.floorPlan, format, tables);
  if (png) {
    if (sourceMessage) {
      await editTelegramMessage(
        sourceMessage.chatId,
        sourceMessage.messageId,
        `📅 <b>${escapeHtml(club.name)}</b>\n${escapeHtml(formatBookingRange(startsAt, endsAt))}`,
        { replyMarkup: { inline_keyboard: [] } },
      );
    }
    await sendTelegramPhoto(telegramId, png, caption, {
      replyMarkup: { inline_keyboard: rows },
    });
    return;
  }

  await replyOrEdit(telegramId, `${caption}\n\n(План зала недоступен)`, { inline_keyboard: rows }, sourceMessage);
}

async function resolveTableByIndex(
  club: ClubRow,
  format: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  tableIndex: number,
) {
  const floorPlan = parseFloorPlan(club.floorPlan);
  const existing = await loadExistingForRange(club.id, startsAt, endsAt);
  const tables = floorTableAvailability(floorPlan, format, startsAt, endsAt, existing);
  const free = tables.filter((t) => t.status === "free");
  return free[tableIndex]?.id ?? null;
}

async function tableIndexForId(
  club: ClubRow,
  format: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  floorItemId: string,
) {
  const floorPlan = parseFloorPlan(club.floorPlan);
  const existing = await loadExistingForRange(club.id, startsAt, endsAt);
  const tables = floorTableAvailability(floorPlan, format, startsAt, endsAt, existing);
  const free = tables.filter((t) => t.status === "free");
  const idx = free.findIndex((t) => t.id === floorItemId);
  return idx >= 0 ? String(idx) : NO_TABLE;
}

async function showConfirmStep(
  telegramId: string,
  club: ClubRow,
  format: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  floorItemId: string | null,
  backCallback: string,
  sourceMessage?: { chatId: string; messageId: number },
) {
  const floorPlan = parseFloorPlan(club.floorPlan);
  const tableLabel = floorItemId
    ? floorTableLabel(floorPlan, floorItemId)
    : clubTableFormatLabel(format);
  const unix = Math.floor(startsAt.getTime() / 1000);
  const dur = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
  const tableIdx = floorItemId
    ? await tableIndexForId(club, format, startsAt, endsAt, floorItemId)
    : NO_TABLE;

  const lines = [
    "📅 <b>Подтвердите бронь</b>",
    "",
    `<b>${escapeHtml(club.name)}</b>`,
    `🪑 ${escapeHtml(tableLabel ?? bookingFormatLabel(format))}`,
    `🕐 ${escapeHtml(formatBookingRange(startsAt, endsAt))}`,
    "",
    "Отправить заявку клубу?",
  ];

  await replyOrEdit(
    telegramId,
    lines.join("\n"),
    {
      inline_keyboard: [
        [
          {
            text: "✅ Забронировать",
            callback_data: `bk7_${club.id}_${fmtCode(format)}_${unix}_${dur}_${tableIdx}`,
          },
        ],
        [{ text: "← Назад", callback_data: backCallback }],
        [{ text: "Отмена", callback_data: "bkc" }],
      ],
    },
    sourceMessage,
  );
}

async function createBooking(
  playerId: string,
  club: ClubRow,
  format: ClubTableFormatId,
  startsAt: Date,
  endsAt: Date,
  floorItemId: string | null,
) {
  const ctx = clubBookingContext(club);
  const floorPlan = parseFloorPlan(club.floorPlan);
  const existing = await loadExistingForRange(club.id, startsAt, endsAt);

  const error = validateBookingRequest(
    ctx,
    format,
    startsAt,
    endsAt,
    existing,
    playerId,
    new Date(),
    floorItemId,
    floorPlan,
  );
  if (error) return { ok: false as const, error };

  const booking = await prisma.tableBooking.create({
    data: {
      clubId: club.id,
      playerId,
      kind: "PLAYER",
      tableFormat: format,
      floorItemId,
      startsAt,
      endsAt,
      status: "PENDING",
    },
    include: {
      club: { select: { name: true, telegramId: true } },
      player: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  void notifyClubNewBooking(booking.id);

  await writeAuditLog({
    actorType: "player",
    actorId: playerId,
    action: "table_booking.create",
    entityType: "table_booking",
    entityId: booking.id,
    payload: { clubId: club.id, tableFormat: format, source: "telegram" },
  });

  return { ok: true as const, booking };
}

export async function handleBookingCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
  sourceMessage?: { chatId: string; messageId: number },
): Promise<boolean> {
  if (!data.startsWith("bk")) return false;

  const player = await findVerifiedPlayer(telegramId);
  if (!player) {
    await answerCallbackQuery(callbackQueryId, "Привяжите профиль");
    return true;
  }

  try {
    if (data === "bkc") {
      await answerCallbackQuery(callbackQueryId, "Отменено");
      const cancelledText = "❌ <b>Бронирование отменено</b>";
      const keyboard = {
        inline_keyboard: [[{ text: "📅 Забронировать снова", callback_data: "bk0" }]],
      };
      if (sourceMessage) {
        await editBookingWizardMessage(
          sourceMessage.chatId,
          sourceMessage.messageId,
          cancelledText,
          keyboard,
        );
      } else {
        await sendTelegramMessage(telegramId, cancelledText, { replyMarkup: keyboard });
      }
      return true;
    }

    if (data === "bk0") {
      await answerCallbackQuery(callbackQueryId);
      await startBookingClubList(telegramId, sourceMessage);
      return true;
    }

    if (data.startsWith("bk1_")) {
      const clubId = data.slice(4);
      const club = await loadClubById(clubId);
      if (!club || club.cityId !== player.cityId || !club.bookingEnabled) {
        await answerCallbackQuery(callbackQueryId, "Клуб недоступен");
        return true;
      }
      await answerCallbackQuery(callbackQueryId);
      await showFormatStep(telegramId, club, sourceMessage);
      return true;
    }

    if (data.startsWith("bk2_")) {
      const [, clubId, code] = data.split("_");
      const format = code ? parseFmtCode(code) : null;
      const club = clubId ? await loadClubById(clubId) : null;
      if (!club || !format || !club.bookingEnabled) {
        await answerCallbackQuery(callbackQueryId, "Ошибка");
        return true;
      }
      await answerCallbackQuery(callbackQueryId);
      await showDateStep(telegramId, club, format, sourceMessage);
      return true;
    }

    if (data.startsWith("bk3p_")) {
      const parts = data.split("_");
      const clubId = parts[1];
      const code = parts[2];
      const compact = parts[3];
      const page = Number(parts[4] ?? 0);
      const format = code ? parseFmtCode(code) : null;
      const date = compact ? dateFromCompact(compact) : null;
      const club = clubId ? await loadClubById(clubId) : null;
      if (!club || !format || !date) {
        await answerCallbackQuery(callbackQueryId, "Ошибка");
        return true;
      }
      await answerCallbackQuery(callbackQueryId);
      await showSlotStep(telegramId, club, format, date, page, sourceMessage);
      return true;
    }

    if (data.startsWith("bk3_")) {
      const [, clubId, code, compact] = data.split("_");
      const format = code ? parseFmtCode(code) : null;
      const date = compact ? dateFromCompact(compact) : null;
      const club = clubId ? await loadClubById(clubId) : null;
      if (!club || !format || !date) {
        await answerCallbackQuery(callbackQueryId, "Ошибка");
        return true;
      }
      await answerCallbackQuery(callbackQueryId);
      await showSlotStep(telegramId, club, format, date, 0, sourceMessage);
      return true;
    }

    if (data.startsWith("bk4_")) {
      const [, clubId, code, unixStr] = data.split("_");
      const format = code ? parseFmtCode(code) : null;
      const unix = Number(unixStr);
      const club = clubId ? await loadClubById(clubId) : null;
      if (!club || !format || !Number.isFinite(unix)) {
        await answerCallbackQuery(callbackQueryId, "Ошибка");
        return true;
      }
      await answerCallbackQuery(callbackQueryId);
      await showDurationStep(telegramId, club, format, new Date(unix * 1000), sourceMessage);
      return true;
    }

    if (data.startsWith("bk5_")) {
      const [, clubId, code, unixStr, durStr] = data.split("_");
      const format = code ? parseFmtCode(code) : null;
      const unix = Number(unixStr);
      const dur = Number(durStr);
      const club = clubId ? await loadClubById(clubId) : null;
      if (!club || !format || !Number.isFinite(unix) || !Number.isFinite(dur)) {
        await answerCallbackQuery(callbackQueryId, "Ошибка");
        return true;
      }
      await answerCallbackQuery(callbackQueryId);
      await showTableOrConfirmStep(
        telegramId,
        club,
        format,
        new Date(unix * 1000),
        dur,
        sourceMessage,
      );
      return true;
    }

    if (data.startsWith("bk6_")) {
      const [, clubId, code, unixStr, durStr, idxStr] = data.split("_");
      const format = code ? parseFmtCode(code) : null;
      const unix = Number(unixStr);
      const dur = Number(durStr);
      const tableIndex = Number(idxStr);
      const club = clubId ? await loadClubById(clubId) : null;
      if (!club || !format || !Number.isFinite(unix) || !Number.isFinite(dur)) {
        await answerCallbackQuery(callbackQueryId, "Ошибка");
        return true;
      }
      const startsAt = new Date(unix * 1000);
      const endsAt = new Date(startsAt.getTime() + dur * 60_000);
      const floorItemId = await resolveTableByIndex(
        club,
        format,
        startsAt,
        endsAt,
        tableIndex,
      );
      if (!floorItemId) {
        await answerCallbackQuery(callbackQueryId, "Стол занят");
        return true;
      }
      await answerCallbackQuery(callbackQueryId);
      await showConfirmStep(
        telegramId,
        club,
        format,
        startsAt,
        endsAt,
        floorItemId,
        `bk5_${club.id}_${fmtCode(format)}_${unixStr}_${durStr}`,
        sourceMessage,
      );
      return true;
    }

    if (data.startsWith("bk7_")) {
      const [, clubId, code, unixStr, durStr, idxStr] = data.split("_");
      const format = code ? parseFmtCode(code) : null;
      const unix = Number(unixStr);
      const dur = Number(durStr);
      const club = clubId ? await loadClubById(clubId) : null;
      if (!club || !format || !Number.isFinite(unix) || !Number.isFinite(dur)) {
        await answerCallbackQuery(callbackQueryId, "Ошибка");
        return true;
      }
      const startsAt = new Date(unix * 1000);
      const endsAt = new Date(startsAt.getTime() + dur * 60_000);
      let floorItemId: string | null = null;
      if (idxStr && idxStr !== NO_TABLE) {
        floorItemId = await resolveTableByIndex(
          club,
          format,
          startsAt,
          endsAt,
          Number(idxStr),
        );
      }

      const result = await createBooking(player.id, club, format, startsAt, endsAt, floorItemId);
      if (!result.ok) {
        await answerCallbackQuery(callbackQueryId, result.error, { showAlert: true });
        return true;
      }

      await answerCallbackQuery(callbackQueryId, "Заявка отправлена");
      const text = [
        "✅ <b>Бронь отправлена</b>",
        "",
        `<b>${escapeHtml(club.name)}</b>`,
        `🕐 ${escapeHtml(formatBookingRange(result.booking.startsAt, result.booking.endsAt))}`,
        "",
        "Клуб подтвердит заявку. Статус — в «Мои брони» или кабинете на сайте.",
      ].join("\n");

      await replyOrEdit(
        telegramId,
        text,
        { inline_keyboard: [[{ text: "Кабинет", url: `${appUrl()}/cabinet` }]] },
        sourceMessage,
      );
      return true;
    }
  } catch {
    await answerCallbackQuery(callbackQueryId, "Ошибка сервера", { showAlert: true });
    return true;
  }

  return false;
}
