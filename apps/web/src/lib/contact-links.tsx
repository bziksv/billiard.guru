import { Fragment, type ReactNode } from "react";

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

export function TelegramLink({
  username,
  className = SITE_CONTACT_LINK_CLASS,
}: {
  username: string;
  className?: string;
}) {
  const handle = username.replace(/^@/, "");
  return (
    <a
      href={`https://t.me/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      @{handle}
    </a>
  );
}

export function PhoneLink({
  phone,
  className = SITE_CONTACT_LINK_CLASS,
}: {
  phone: string;
  className?: string;
}) {
  return (
    <a href={phoneTelHref(phone)} className={className}>
      {phone}
    </a>
  );
}
