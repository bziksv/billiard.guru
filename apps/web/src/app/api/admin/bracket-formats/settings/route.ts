import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { validateParticipantOverrides } from "@/lib/bracket-participant-rules";
import { isBracketFormatCode } from "@/lib/bracket-formats/catalog";
import {
  deleteBracketFormatSettings,
  getAllBracketFormatSettings,
  saveBracketFormatSettings,
} from "@/lib/bracket-formats/settings-server";
import { z } from "zod";

const patchSchema = z
  .object({
    formatCode: z.string(),
    enabled: z.boolean().optional(),
    maintenanceMode: z.boolean().optional(),
    hiddenInAdmin: z.boolean().optional(),
    isReference: z.boolean().optional(),
    participantMin: z.number().int().nullable().optional(),
    participantMax: z.number().int().nullable().optional(),
    participantExact: z.number().int().nullable().optional(),
    resetParticipantLimits: z.boolean().optional(),
    adminLabel: z.string().trim().min(1).max(500).nullable().optional(),
    resetAdminLabel: z.boolean().optional(),
  })
  .refine(
    (b) =>
      b.enabled !== undefined ||
      b.maintenanceMode !== undefined ||
      b.hiddenInAdmin !== undefined ||
      b.isReference !== undefined ||
      b.participantMin !== undefined ||
      b.participantMax !== undefined ||
      b.participantExact !== undefined ||
      b.resetParticipantLimits === true ||
      b.adminLabel !== undefined ||
      b.resetAdminLabel === true,
    { message: "Нет полей для сохранения" },
  );

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await getAllBracketFormatSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = patchSchema.parse(await request.json());
    if (!isBracketFormatCode(body.formatCode)) {
      return NextResponse.json({ error: "Неизвестный формат сетки" }, { status: 400 });
    }

    const participantPatch = body.resetParticipantLimits
      ? {
          participantMin: null,
          participantMax: null,
          participantExact: null,
        }
      : {
          ...(body.participantMin !== undefined
            ? { participantMin: body.participantMin }
            : {}),
          ...(body.participantMax !== undefined
            ? { participantMax: body.participantMax }
            : {}),
          ...(body.participantExact !== undefined
            ? { participantExact: body.participantExact }
            : {}),
        };

    const validationError = validateParticipantOverrides(participantPatch);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const labelPatch = body.resetAdminLabel
      ? { adminLabel: null }
      : body.adminLabel !== undefined
        ? { adminLabel: body.adminLabel }
        : {};

    await saveBracketFormatSettings(body.formatCode, {
      enabled: body.enabled,
      maintenanceMode: body.maintenanceMode,
      hiddenInAdmin: body.hiddenInAdmin,
      isReference: body.isReference,
      ...participantPatch,
      ...labelPatch,
    });
    const settings = await getAllBracketFormatSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  formatCode: z.string(),
});

export async function DELETE(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = deleteSchema.parse(await request.json());
    if (!isBracketFormatCode(body.formatCode)) {
      return NextResponse.json({ error: "Неизвестный формат сетки" }, { status: 400 });
    }

    await deleteBracketFormatSettings(body.formatCode);
    const settings = await getAllBracketFormatSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
