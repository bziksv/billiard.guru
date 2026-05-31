export function PlayerContactLinks({
  phone,
  telegramUsername,
}: {
  phone: string;
  telegramUsername?: string | null;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
      <a href={`tel:${phone}`} className="font-mono hover:text-emerald-400">
        {phone}
      </a>
      {telegramUsername ? (
        <a
          href={`https://t.me/${telegramUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-sky-400"
        >
          @{telegramUsername}
        </a>
      ) : (
        <span className="text-zinc-600">нет Telegram</span>
      )}
    </span>
  );
}
