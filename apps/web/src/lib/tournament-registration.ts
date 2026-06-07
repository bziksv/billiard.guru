/** Регистрация открыта: OPEN или сетка снесена у идущего турнира. */
export function isTournamentRegistrationOpen(
  tournamentStatus: string,
  bracketFormed: boolean,
): boolean {
  if (tournamentStatus === "FINISHED") return false;
  if (tournamentStatus === "OPEN") return true;
  if (tournamentStatus === "ACTIVE" && !bracketFormed) return true;
  return false;
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
