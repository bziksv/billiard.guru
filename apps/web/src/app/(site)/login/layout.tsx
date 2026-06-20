import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.login);

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
