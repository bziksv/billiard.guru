import { cn } from "@/lib/cn";

export function adminTabClass(active: boolean) {
  return cn("admin-tab", active && "admin-tab--active");
}
