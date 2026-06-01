import { NextRequest, NextResponse } from "next/server";
import { registerPlayerByPhone } from "@/lib/auth-phone-flow";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, middleName, cityId, phone, email, birthDate } = body;

    if (!firstName || !lastName || !cityId || !phone) {
      return NextResponse.json(
        { error: "Укажите имя, фамилию, город и телефон" },
        { status: 400 },
      );
    }

    const { error, result } = await registerPlayerByPhone({
      firstName: String(firstName),
      lastName: String(lastName),
      middleName: middleName ? String(middleName) : undefined,
      cityId: String(cityId),
      phone: String(phone),
      email: email ? String(email) : undefined,
      birthDate: birthDate ? String(birthDate) : undefined,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Проверьте введённые данные" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось зарегистрироваться" }, { status: 500 });
  }
}
