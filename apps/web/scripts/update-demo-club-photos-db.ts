/**
 * Обновляет ссылки на демо-фото клубов в БД: /demo/club-test*.jpg → .webp.
 * Usage: npx tsx scripts/update-demo-club-photos-db.ts
 */
import { prisma } from "../src/lib/prisma";

function toWebp(url: unknown): unknown {
  if (typeof url !== "string") return url;
  return url.replace(/\/demo\/(club-test[^"']*?)\.jpg/gi, "/demo/$1.webp");
}

async function main() {
  const clubs = await prisma.club.findMany({
    select: { id: true, name: true, photoUrl: true, galleryUrls: true },
  });

  let updated = 0;
  for (const club of clubs) {
    const newPhoto = toWebp(club.photoUrl) as string | null;
    const gallery = Array.isArray(club.galleryUrls) ? club.galleryUrls : [];
    const newGallery = gallery.map(toWebp);

    const photoChanged = newPhoto !== club.photoUrl;
    const galleryChanged =
      JSON.stringify(newGallery) !== JSON.stringify(gallery);
    if (!photoChanged && !galleryChanged) continue;

    await prisma.club.update({
      where: { id: club.id },
      data: {
        ...(photoChanged ? { photoUrl: newPhoto } : {}),
        ...(galleryChanged ? { galleryUrls: newGallery as object } : {}),
      },
    });
    updated++;
    console.log(`✓ ${club.name} (${club.id})`);
    console.log(`   photoUrl: ${newPhoto}`);
    console.log(`   gallery:  ${JSON.stringify(newGallery)}`);
  }
  console.log(`Обновлено клубов: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
