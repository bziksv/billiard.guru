import { linkifyContactText } from "@/lib/contact-links";

export function LinkifiedText({ text }: { text: string }) {
  return <>{linkifyContactText(text)}</>;
}
