import { PlayerContactLinks } from "@/components/admin/player-contact-links";
import { formatRating } from "@/lib/rating";

export function TournamentParticipantInfo({
  lastName,
  firstName,
  rating,
  phone,
  telegramUsername,
  note,
  hideRating,
}: {
  lastName: string;
  firstName: string;
  rating: number;
  phone: string;
  telegramUsername?: string | null;
  note?: string | null;
  hideRating?: boolean;
}) {
  return (
    <div className="tournament-participant-info">
      <div className="tournament-participant-name">
        {lastName} {firstName}
        {note ? (
          <span className="tournament-participant-note">{note}</span>
        ) : null}
      </div>
      <div className="tournament-participant-details">
        <PlayerContactLinks phone={phone} telegramUsername={telegramUsername} />
        {!hideRating ? (
          <span className="tournament-participant-rating" title="Рейтинг участника">
            <span className="tournament-participant-rating-label">Рейтинг</span>
            <span className="tournament-participant-rating-value">{formatRating(rating)}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
