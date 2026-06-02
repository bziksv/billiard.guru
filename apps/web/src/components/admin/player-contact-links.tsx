export function PlayerContactLinks({
  phone,
  telegramUsername,
}: {
  phone: string;
  telegramUsername?: string | null;
}) {
  return (
    <span className="tournament-participant-meta flex flex-wrap items-center gap-x-3 gap-y-0.5">
      <a href={`tel:${phone}`} className="font-mono hover:text-emerald-600 dark:hover:text-emerald-400">
        {phone}
      </a>
      {telegramUsername ? (
        <a
          href={`https://t.me/${telegramUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-sky-600 dark:hover:text-sky-400"
        >
          @{telegramUsername}
        </a>
      ) : (
        <span className="opacity-70">нет Telegram</span>
      )}
    </span>
  );
}
