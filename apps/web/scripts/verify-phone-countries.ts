/**
 * Проверка нормализации телефонов по странам.
 * Запуск: npm run verify:phones
 */
import {
  COUNTRY_PHONE_RULES,
  normalizePhone,
  normalizePhoneAuto,
  resolveCountryFromE164,
} from "../src/lib/phone";

type Case = {
  label: string;
  input: string;
  country?: string;
  expectValid: boolean;
  expectE164?: string;
  expectCountry?: string;
};

const CASES: Case[] = [
  // Россия
  { label: "RU local", input: "9172345678", country: "Россия", expectValid: true, expectE164: "+79172345678" },
  { label: "RU trunk 8", input: "89172345678", country: "Россия", expectValid: true, expectE164: "+79172345678" },
  { label: "RU E164", input: "+79172345678", country: "Россия", expectValid: true, expectE164: "+79172345678" },
  { label: "RU E164 auto (no hint)", input: "+79172345678", expectValid: true, expectE164: "+79172345678", expectCountry: "Россия" },
  // Казахстан (+7 — нужен hint)
  { label: "KZ local", input: "7012345678", country: "Казахстан", expectValid: true, expectE164: "+77012345678" },
  { label: "KZ E164 with hint", input: "+77012345678", country: "Казахстан", expectValid: true, expectE164: "+77012345678", expectCountry: "Казахстан" },
  // Беларусь — баг из скриншота
  { label: "BY local", input: "293123456", country: "Беларусь", expectValid: true, expectE164: "+375293123456" },
  { label: "BY E164 auto", input: "+375323123232", expectValid: true, expectE164: "+375323123232", expectCountry: "Беларусь" },
  { label: "BY E164 wrong hint RU", input: "+375323123232", country: "Россия", expectValid: true, expectE164: "+375323123232", expectCountry: "Беларусь" },
  // Украина
  { label: "UA local", input: "501234567", country: "Украина", expectValid: true, expectE164: "+380501234567" },
  { label: "UA E164 auto", input: "+380501234567", expectValid: true, expectE164: "+380501234567", expectCountry: "Украина" },
  // Узбекистан
  { label: "UZ local", input: "901234567", country: "Узбекистан", expectValid: true, expectE164: "+998901234567" },
  // Армения
  { label: "AM local", input: "91123456", country: "Армения", expectValid: true, expectE164: "+37491123456" },
  // Грузия
  { label: "GE local", input: "555123456", country: "Грузия", expectValid: true, expectE164: "+995555123456" },
  // Азербайджан
  { label: "AZ local", input: "501234567", country: "Азербайджан", expectValid: true, expectE164: "+994501234567" },
  // Кыргызстан
  { label: "KG local", input: "700123456", country: "Кыргызстан", expectValid: true, expectE164: "+996700123456" },
  // Молдова
  { label: "MD local", input: "69123456", country: "Молдова", expectValid: true, expectE164: "+37369123456" },
  // Невалидные
  { label: "RU too short", input: "917234", country: "Россия", expectValid: false },
  { label: "BY too many local", input: "2931234567", country: "Беларусь", expectValid: false },
  { label: "empty", input: "", country: "Россия", expectValid: false },
];

function runCase(c: Case): string | null {
  const fn = c.country !== undefined && c.expectCountry === undefined
    ? () => normalizePhone(c.input, c.country!)
    : () => normalizePhoneAuto(c.input, c.country);

  const result = fn();

  if (result.valid !== c.expectValid) {
    return `${c.label}: expected valid=${c.expectValid}, got ${result.valid} (${result.error ?? result.e164})`;
  }
  if (c.expectE164 && result.e164 !== c.expectE164) {
    return `${c.label}: expected e164=${c.expectE164}, got ${result.e164}`;
  }
  if (c.expectCountry && "countryName" in result && result.countryName !== c.expectCountry) {
    return `${c.label}: expected country=${c.expectCountry}, got ${result.countryName}`;
  }
  return null;
}

let failed = 0;
for (const c of CASES) {
  const err = runCase(c);
  if (err) {
    console.error("FAIL:", err);
    failed++;
  }
}

// Каждая страна из правил — пример из example парсится
for (const [country, rule] of Object.entries(COUNTRY_PHONE_RULES)) {
  const digits = rule.example.replace(/\D/g, "");
  const r = normalizePhone(digits, country);
  if (!r.valid) {
    console.error(`FAIL: example for ${country} (${rule.example}) not valid: ${r.error}`);
    failed++;
  }
  const detected = resolveCountryFromE164(r.e164);
  if (rule.dial !== "7" && detected !== country) {
    console.error(`FAIL: resolveCountryFromE164(${r.e164}) = ${detected}, expected ${country}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log(`OK: ${CASES.length + Object.keys(COUNTRY_PHONE_RULES).length} phone checks passed`);
