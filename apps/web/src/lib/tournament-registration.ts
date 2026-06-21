/** Публичная регистрация: OPEN или сетка снесена у идущего турнира. */
export function isTournamentRegistrationOpen(
  tournamentStatus: string,
  bracketFormed: boolean,
): boolean {
  if (tournamentStatus === "FINISHED") return false;
  if (tournamentStatus === "OPEN") return true;
  if (tournamentStatus === "ACTIVE" && !bracketFormed) return true;
  return false;
}

/** Организатор может добавлять участников до формирования сетки (в т.ч. до публикации). */
export function canOrganizerRegisterParticipants(
  tournamentStatus: string,
  bracketFormed: boolean,
): boolean {
  if (tournamentStatus === "FINISHED") return false;
  if (bracketFormed) return false;
  return (
    tournamentStatus === "DRAFT" ||
    tournamentStatus === "PENDING_CLUB_APPROVAL" ||
    tournamentStatus === "OPEN" ||
    tournamentStatus === "ACTIVE"
  );
}

/** Можно ли отменить регистрацию / снять подтверждение */
export function canCancelRegistration(
  tournamentStatus: string,
  role: "player" | "organizer",
  bracketFormed = false,
): boolean {
  if (tournamentStatus === "FINISHED") return false;
  if (bracketFormed) return false;
  if (role === "organizer") {
    return tournamentStatus === "OPEN" || tournamentStatus === "ACTIVE";
  }
  return tournamentStatus === "OPEN";
}

export function cancelRegistrationLabel(registrationStatus: string): string {
  if (registrationStatus === "PENDING") return "Отозвать заявку";
  if (registrationStatus === "CONFIRMED") return "Отказаться от участия";
  return "Отменить";
}
