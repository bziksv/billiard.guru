"use client";

import { useTranslations } from "next-intl";
import { ThemeToggle, type ThemeToggleLabels } from "@/components/theme/theme-toggle";

type Props = Omit<React.ComponentProps<typeof ThemeToggle>, "variant" | "themeLabels">;

export function SiteThemeToggle(props: Props) {
  const t = useTranslations("theme");
  const themeLabels: ThemeToggleLabels = {
    dark: t("dark"),
    light: t("light"),
    switchToLight: t("switchToLight"),
    switchToDark: t("switchToDark"),
    aria: t("aria"),
  };

  return <ThemeToggle variant="site" themeLabels={themeLabels} {...props} />;
}
