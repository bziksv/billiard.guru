import { SiteContainer } from "@/components/site/site-container";

export function SiteDevBanner() {
  return (
    <div className="site-dev-banner" role="status">
      <SiteContainer className="py-2.5 text-center text-sm leading-snug">
        <span className="site-dev-banner-label">Бета</span>
        Уважаемые друзья, проект находится в стадии разработки и тестирования. Уже
        сейчас вы можете{" "}
        <a href="/login" className="site-dev-banner-link">
          регистрироваться
        </a>{" "}
        и начинать пользоваться функционалом.
      </SiteContainer>
    </div>
  );
}
