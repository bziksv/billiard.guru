import { getImpersonation, getSession } from "@/lib/auth";
import { PreviewBanner } from "@/components/site/preview-banner";

export async function PreviewBannerSlot() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") return null;

  const impersonation = await getImpersonation();
  if (!impersonation) return null;

  if (impersonation.clubId && impersonation.clubName) {
    return (
      <PreviewBanner
        mode="club"
        label={impersonation.clubName}
        sublabel={impersonation.playerName ? `как ${impersonation.playerName}` : undefined}
      />
    );
  }

  if (impersonation.playerName) {
    return <PreviewBanner mode="player" label={impersonation.playerName} />;
  }

  return null;
}
