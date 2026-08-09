import type { Metadata } from "next";
import { ADMIN_PAGE_TITLES } from "@/lib/admin-page-title";

export const metadata: Metadata = { title: ADMIN_PAGE_TITLES.analytics };

export default function AdminAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
