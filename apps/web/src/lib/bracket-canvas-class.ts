import { cn } from "@/lib/cn";

/** Классы контейнера прокрутки сетки (обычный / полноэкранный режим). */
export function bracketCanvasClassName(options: {
  presentation?: boolean;
  fixedGrid?: boolean;
  demoPreview?: boolean;
}): string {
  const { presentation, fixedGrid, demoPreview } = options;
  if (presentation) {
    return "bracket-canvas bracket-canvas--presentation h-full min-h-0 overflow-hidden pb-3 pt-0";
  }
  if (fixedGrid) {
    if (demoPreview) {
      return "bracket-canvas max-h-[420px] overflow-x-auto overflow-y-auto pb-6 pt-2";
    }
    return "bracket-canvas max-h-[min(90vh,1400px)] overflow-x-auto overflow-y-auto pb-6 pt-2";
  }
  return "bracket-canvas max-h-[75vh] overflow-x-auto overflow-y-auto pb-6 pt-2";
}

export function bracketViewRootClassName(presentation?: boolean): string {
  return cn(
    presentation
      ? "flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden"
      : "w-full min-w-0 max-w-full space-y-3 overflow-hidden",
  );
}

export function bracketShellClassName(presentation?: boolean): string {
  return cn(
    "bracket-shell bg-[var(--bracket-canvas-bg)]",
    presentation
      ? "flex h-full min-h-0 flex-col rounded-md border border-[var(--bracket-canvas-border)]"
      : "rounded-xl border border-[var(--admin-border)]",
  );
}
