/** Можно ли отменить регистрацию / снять подтверждение */
export function canCancelRegistration(
  tournamentStatus: string,
  role: "player" | "organizer",
): boolean {
  if (tournamentStatus === "FINISHED") return false;
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
