import { NextRequest, NextResponse } from "next/server";
import {
  calculateHandicap,
  describeHandicap,
  getHandicapForGame,
} from "@/lib/handicap";
import { formatRating } from "@/lib/rating";
import { playerRatingExceedsTournamentMax } from "@/lib/tournament-rating-limit-server";

function parseOptionalRatingMax(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function registrationEligibility(
  rating: number,
  ratingMax: number | null,
): { eligible: boolean; message: string | null } {
  if (ratingMax == null) {
    return { eligible: true, message: null };
  }
  if (playerRatingExceedsTournamentMax(rating, ratingMax)) {
    return {
      eligible: false,
      message: `Рейтинг ${formatRating(rating)} выше лимита (до ${formatRating(ratingMax)}). Запись на турнир недоступна.`,
    };
  }
  return {
    eligible: true,
    message: `Допуск на турнир с лимитом до ${formatRating(ratingMax)}.`,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ratingA = parseFloat(params.get("ratingA") ?? "0");
  const ratingB = parseFloat(params.get("ratingB") ?? "0");
  const game = parseInt(params.get("game") ?? "1", 10);
  const halfStep = params.get("halfStep") !== "0";
  const ratingMax = parseOptionalRatingMax(params.get("ratingMax"));

  const higher = Math.max(ratingA, ratingB);
  const lower = Math.min(ratingA, ratingB);
  const strongerIsA = ratingA >= ratingB;
  const handicapOpts = { halfStep };

  const breakdown = calculateHandicap(higher, lower, handicapOpts);
  const balls = getHandicapForGame(higher, lower, game, handicapOpts);

  return NextResponse.json({
    ratingA,
    ratingB,
    strongerPlayer: strongerIsA ? "A" : "B",
    halfStep,
    ratingMax,
    playerA: registrationEligibility(ratingA, ratingMax),
    playerB: registrationEligibility(ratingB, ratingMax),
    breakdown,
    description: describeHandicap(higher, lower, handicapOpts),
    game,
    handicapBalls: balls,
  });
}
