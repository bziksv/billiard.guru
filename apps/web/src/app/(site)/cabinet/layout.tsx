import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.cabinet);

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
