import { phoneTelHref } from "@/lib/contact-links";
import { formatE164Display } from "@/lib/phone";

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.138-2.678-1.822-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.237s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function PlayerContactLinks({
  phone,
  telegramUsername,
}: {
  phone: string;
  telegramUsername?: string | null;
}) {
  const phoneLabel = formatE164Display(phone);

  return (
    <span className="tournament-participant-contacts">
      <a
        href={phoneTelHref(phone)}
        className="tournament-participant-contact tournament-participant-contact--phone"
        title="Телефон"
      >
        <PhoneIcon className="tournament-participant-contact-icon" />
        <span className="font-mono tabular-nums">{phoneLabel}</span>
      </a>
      {telegramUsername ? (
        <a
          href={`https://t.me/${telegramUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tournament-participant-contact tournament-participant-contact--telegram"
          title="Telegram"
        >
          <TelegramIcon className="tournament-participant-contact-icon" />
          <span>@{telegramUsername}</span>
        </a>
      ) : (
        <span
          className="tournament-participant-contact tournament-participant-contact--empty"
          title="Telegram не указан"
        >
          <TelegramIcon className="tournament-participant-contact-icon" />
          <span>нет Telegram</span>
        </span>
      )}
    </span>
  );
}
