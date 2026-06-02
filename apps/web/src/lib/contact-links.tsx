import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatE164Display } from "@/lib/phone";

export const SITE_CONTACT_LINK_CLASS = "text-emerald-600 hover:underline dark:text-emerald-400";

export function phoneTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized =
    digits.startsWith("8") && digits.length === 11 ? `7${digits.slice(1)}` : digits;
  return `tel:+${normalized}`;
}

function pushText(parts: ReactNode[], text: string, keyPrefix: string) {
  if (!text) return;
  parts.push(<Fragment key={`${keyPrefix}-text`}>{text}</Fragment>);
}

function linkifySegment(segment: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  const combined =
    /(?:\+7|8)\s*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}|(?:Telegram\s+)?@[a-zA-Z][a-zA-Z0-9_]{4,31}|(?:https?:\/\/)?t\.me\/[a-zA-Z][a-zA-Z0-9_]{4,31}/gi;

  for (const match of segment.matchAll(combined)) {
    const value = match[0];
    const index = match.index ?? 0;
    pushText(parts, segment.slice(lastIndex, index), `${keyPrefix}-pre-${index}`);
    lastIndex = index + value.length;

    if (/^(?:\+7|8)\s*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}$/.test(value)) {
      parts.push(
        <a
          key={`${keyPrefix}-phone-${index}`}
          href={phoneTelHref(value)}
          className={SITE_CONTACT_LINK_CLASS}
        >
          {value}
        </a>,
      );
      continue;
    }

    const atMatch = /^(?:Telegram\s+)?@([a-zA-Z][a-zA-Z0-9_]{4,31})$/i.exec(value);
    if (atMatch) {
      const username = atMatch[1];
      parts.push(
        <a
          key={`${keyPrefix}-tg-${index}`}
          href={`https://t.me/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className={SITE_CONTACT_LINK_CLASS}
        >
          {value.startsWith("Telegram") ? `Telegram @${username}` : `@${username}`}
        </a>,
      );
      continue;
    }

    const urlMatch = /(?:https?:\/\/)?t\.me\/([a-zA-Z][a-zA-Z0-9_]{4,31})/i.exec(value);
    if (urlMatch) {
      parts.push(
        <a
          key={`${keyPrefix}-tme-${index}`}
          href={`https://t.me/${urlMatch[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className={SITE_CONTACT_LINK_CLASS}
        >
          {value}
        </a>,
      );
    }
  }

  pushText(parts, segment.slice(lastIndex), `${keyPrefix}-tail`);
  return parts;
}

export function linkifyContactText(text: string): ReactNode[] {
  return linkifySegment(text, "root");
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.138-2.678-1.822-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.237s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function TelegramLink({
  username,
  className = SITE_CONTACT_LINK_CLASS,
  showIcon = false,
}: {
  username: string;
  className?: string;
  /** Иконка Telegram + @ник (для карточки клуба) */
  showIcon?: boolean;
}) {
  const handle = username.replace(/^@/, "");
  return (
    <a
      href={`https://t.me/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(showIcon && "site-telegram-link", className)}
      title={`Telegram @${handle}`}
    >
      {showIcon && <TelegramIcon className="h-5 w-5 shrink-0" />}
      <span>@{handle}</span>
    </a>
  );
}

export function PhoneLink({
  phone,
  countryName,
  className = SITE_CONTACT_LINK_CLASS,
}: {
  phone: string;
  countryName?: string;
  className?: string;
}) {
  const label = formatE164Display(phone, countryName);
  return (
    <a href={phoneTelHref(phone)} className={className}>
      {label}
    </a>
  );
}
