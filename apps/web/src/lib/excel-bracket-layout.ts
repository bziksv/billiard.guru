import excelRef from "@/lib/excel-bracket-64-reference.json";
import {
  GRID_CARD_W,
  GRID_FOOTER_LINE_H,
  GRID_LABEL_OFFSET,
  GRID_META_H,
  GRID_PAD,
  GRID_ROW_H,
  gridCardInset,
} from "@/lib/swiss-bracket-layout";

export type ExcelMatchRef = {
  no: number;
  row: number;
  col: number;
  seed1?: number;
  seed2?: number;
  footer?: string;
  linkTo?: number;
};

/**
 * Колонки листа «Сетка» слева → направо (как в LibreOffice при открытии xls):
 * нижняя (1,6,11,16) · первый тур (21) · верхняя (26…51).
 */
export const EXCEL_BRACKET_COL_ORDER = [
  1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51,
] as const;

/** В xls между кластерами колонки идут с шагом 5 (1, 6, 11, …). */
const EXCEL_COL_INDEX_STEP = 5;
/** Ширина «шага» колонки на экране — пропорционально листу. */
const EXCEL_COL_W = 248;
const FIRST_ROUND_COL = 21;

const FOOTER_LINES = 2;
/** Зазор между карточками в одной колонке, если row из xls слишком плотный. */
const MIN_CARD_GAP_Y = 6;

/**
 * В xls в 1-м туре (col 21) соседние # идут через 4 строки; в fixed-swiss это ~184px.
 * 184 / 4 ≈ 46 — иначе карточки наезжают друг на друга.
 */
const EXCEL_ROW_PX = 46;

export function excelColToVisualIndex(excelCol: number): number {
  return (excelCol - 1) / EXCEL_COL_INDEX_STEP;
}

export function excelColToX(excelCol: number): number {
  return GRID_PAD + excelColToVisualIndex(excelCol) * EXCEL_COL_W;
}

export function excelCardHeight(hasFooter: boolean) {
  const footerH = hasFooter ? FOOTER_LINES * GRID_FOOTER_LINE_H + 8 : 0;
  return GRID_META_H + GRID_ROW_H * 2 + footerH;
}

export type ExcelMatchPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExcelBracketLayout = {
  positions: Map<number, ExcelMatchPosition>;
  links: { from: number; to: number }[];
  totalWidth: number;
  totalHeight: number;
  /** Центр прокрутки — колонка «первый тур» (#1–#32). */
  centerX: number;
  colLabels: Record<string, string>;
  colOrder: readonly number[];
};

export function buildExcelBracketLayout(
  matches: ExcelMatchRef[] = excelRef.matches as ExcelMatchRef[],
): ExcelBracketLayout {
  const positions = new Map<number, ExcelMatchPosition>();
  const baseY = GRID_PAD + GRID_LABEL_OFFSET;

  const byCol = new Map<number, ExcelMatchRef[]>();
  for (const m of matches) {
    if (!EXCEL_BRACKET_COL_ORDER.includes(m.col as (typeof EXCEL_BRACKET_COL_ORDER)[number])) {
      continue;
    }
    const list = byCol.get(m.col) ?? [];
    list.push(m);
    byCol.set(m.col, list);
  }

  let maxY = 0;
  for (const colMatches of byCol.values()) {
    const sorted = [...colMatches].sort((a, b) => a.row - b.row);
    let prevBottom = baseY;
    for (const m of sorted) {
      const hasFooter = Boolean(m.footer);
      const height = excelCardHeight(hasFooter);
      const x = excelColToX(m.col) + gridCardInset();
      const idealY = baseY + m.row * EXCEL_ROW_PX;
      const y = Math.max(idealY, prevBottom + MIN_CARD_GAP_Y);
      prevBottom = y + height;
      maxY = Math.max(maxY, prevBottom);
      positions.set(m.no, { x, y, width: GRID_CARD_W, height });
    }
  }

  const links: { from: number; to: number }[] = [];
  for (const m of matches) {
    if (m.linkTo != null) links.push({ from: m.no, to: m.linkTo });
  }

  const maxCol = EXCEL_BRACKET_COL_ORDER[EXCEL_BRACKET_COL_ORDER.length - 1];
  const totalWidth = excelColToX(maxCol) + GRID_CARD_W + GRID_PAD;
  const totalHeight = maxY + GRID_PAD;
  const centerX = excelColToX(FIRST_ROUND_COL) + GRID_CARD_W / 2;

  return {
    positions,
    links,
    totalWidth,
    totalHeight,
    centerX,
    colLabels: excelRef.colLabels as Record<string, string>,
    colOrder: EXCEL_BRACKET_COL_ORDER,
  };
}

export function excelColHeaderLeft(excelCol: number): number | null {
  if (!EXCEL_BRACKET_COL_ORDER.includes(excelCol as (typeof EXCEL_BRACKET_COL_ORDER)[number])) {
    return null;
  }
  return excelColToX(excelCol) + gridCardInset();
}
