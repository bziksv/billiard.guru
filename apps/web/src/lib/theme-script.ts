/** Inline script for zero-flash theme (must match ThemeProvider options). */
export const THEME_STORAGE_KEY = "setka-theme";
export type ThemeDefault = "light" | "dark";
export const THEME_DEFAULT: ThemeDefault = "light";

export function buildThemeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=${JSON.stringify(THEME_DEFAULT)};var t=localStorage.getItem(k)||d;if(t==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var el=document.documentElement;el.classList.remove("light","dark");el.classList.add(t);el.style.colorScheme=t;}catch(e){}})();`;
}
