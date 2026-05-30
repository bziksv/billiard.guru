import { NextRequest, NextResponse } from "next/server";
import {
  calculateHandicap,
  describeHandicap,
  getHandicapForGame,
} from "@/lib/handicap";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ratingA = parseFloat(params.get("ratingA") ?? "0");
  const ratingB = parseFloat(params.get("ratingB") ?? "0");
  const game = parseInt(params.get("game") ?? "1", 10);

  const higher = Math.max(ratingA, ratingB);
  const lower = Math.min(ratingA, ratingB);
  const strongerIsA = ratingA >= ratingB;

  const breakdown = calculateHandicap(higher, lower);
  const balls = getHandicapForGame(higher, lower, game);

  return NextResponse.json({
    ratingA,
    ratingB,
    strongerPlayer: strongerIsA ? "A" : "B",
    breakdown,
    description: describeHandicap(higher, lower),
    game,
    handicapBalls: balls,
  });
}
