# Fixed Swiss 64→32 — линии SVG

Масштаб [`FIXED_SWISS_BRACKET_LINES_32_16.md`](./FIXED_SWISS_BRACKET_LINES_32_16.md).

**Рисуем:** вилки R1; нижняя R2→крест; крест→тур 3 (R3→R4); тур 3→тур 4; вилка верхняя R2→1/8; вилка 1/8→1/4 (R3→R5); 1/4→полуфинал; полуфинал→финал.

**Не рисуем (только подвал):** верхняя→тур 4 bypass, loss в крест, «шины» между несоседними колонками.

Проверка: `cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts`
