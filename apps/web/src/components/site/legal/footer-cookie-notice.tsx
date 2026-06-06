import Link from "next/link";
import { LEGAL_URLS } from "@/lib/legal";

export function FooterCookieNotice() {
  return (
    <p className="site-footer-legal-note">
      На нашем сайте используются{" "}
      <Link href={LEGAL_URLS.cookies} className="site-footer-legal-link">
        cookie-файлы
      </Link>{" "}
      и{" "}
      <Link href={LEGAL_URLS.recommendationTechnologies} className="site-footer-legal-link">
        рекомендательные технологии
      </Link>
      , которые помогают улучшать функциональность, адаптировать рекламу и собирать
      статистику посещений. Продолжая пользоваться сайтом, вы соглашаетесь с обработкой
      персональных данных согласно{" "}
      <Link href={LEGAL_URLS.privacy} className="site-footer-legal-link">
        политике конфиденциальности
      </Link>
      . Вы можете отключить cookies в настройках браузера.
    </p>
  );
}
