import { SiteContainer } from "@/components/site/site-container";

export function SiteDevBanner() {
  return (
    <div className="site-dev-banner" role="status">
      <SiteContainer className="py-2 text-center text-xs leading-snug sm:py-2.5 sm:text-sm">
        <span className="site-dev-banner-label">Бета</span>
        <span className="hidden sm:inline">
          Уважаемые друзья, проект находится в стадии разработки и тестирования. Уже сейчас
          вы можете{" "}
        </span>
        <span className="sm:hidden">Тестирование — </span>
        <a href="/login" className="site-dev-banner-link">
          регистрация
        </a>
        <span className="hidden sm:inline"> и начинать пользоваться функционалом.</span>
        <span className="sm:hidden"> открыта</span>
      </SiteContainer>
    </div>
  );
}
