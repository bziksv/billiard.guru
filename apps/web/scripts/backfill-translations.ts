/**
 * Заполнить titleEn/bodyEn/descriptionEn для существующих записей без перевода.
 *
 *   cd apps/web && npx tsx scripts/backfill-translations.ts
 *   cd apps/web && npx tsx scripts/backfill-translations.ts --dry-run
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";
import {
  isTranslationEnabled,
  syncLocalizedDescription,
  syncLocalizedLabel,
  syncLocalizedTitleBody,
  syncLocalizedClubTextFields,
  translateText,
} from "../src/lib/translation";
import { parsePriceTiers } from "../src/lib/club-schedule";
import { COUNTRY_NAME_EN } from "../src/lib/geo-display";

const dryRun = process.argv.includes("--dry-run");

async function backfillTitleBody(
  label: string,
  rows: Array<{ id: string; title: string; body: string }>,
  update: (id: string, data: { titleEn: string | null; bodyEn: string | null }) => Promise<void>,
) {
  let updated = 0;
  for (const row of rows) {
    const localized = await syncLocalizedTitleBody({ title: row.title, body: row.body });
    if (!localized.titleEn) continue;
    console.log(`[${label}] ${row.id}: ${row.title.slice(0, 50)}…`);
    if (!dryRun) {
      await update(row.id, { titleEn: localized.titleEn, bodyEn: localized.bodyEn });
    }
    updated += 1;
  }
  return updated;
}

async function main() {
  if (!isTranslationEnabled()) {
    console.error("DEEPSEEK_API_KEY не задан или TRANSLATION_ENABLED=false");
    process.exit(1);
  }

  if (dryRun) console.log("Dry run — записи в БД не меняются\n");

  const siteNews = await prisma.siteNews.findMany({
    where: { OR: [{ titleEn: null }, { bodyEn: null }] },
    select: { id: true, title: true, body: true },
  });
  const siteCount = await backfillTitleBody("siteNews", siteNews, async (id, data) => {
    await prisma.siteNews.update({ where: { id }, data });
  });

  const clubNews = await prisma.clubNews.findMany({
    where: {
      status: "APPROVED",
      OR: [{ titleEn: null }, { bodyEn: null }],
    },
    select: { id: true, title: true, body: true },
  });
  const clubNewsCount = await backfillTitleBody("clubNews", clubNews, async (id, data) => {
    await prisma.clubNews.update({ where: { id }, data });
  });

  const listings = await prisma.playListing.findMany({
    where: { titleEn: null },
    select: { id: true, title: true, body: true },
  });
  const listingCount = await backfillTitleBody("playListing", listings, async (id, data) => {
    await prisma.playListing.update({ where: { id }, data });
  });

  let clubDescCount = 0;
  let clubExtraCount = 0;
  const clubs = await prisma.club.findMany({
    select: {
      id: true,
      description: true,
      descriptionEn: true,
      address: true,
      addressEn: true,
      gamePrice: true,
      gamePriceEn: true,
      workingHours: true,
      workingHoursEn: true,
      priceTiers: true,
      priceTiersEn: true,
    },
  });
  for (const club of clubs) {
    const patch: Record<string, unknown> = {};

    if (club.description && !club.descriptionEn) {
      const desc = await syncLocalizedDescription({ description: club.description });
      if (desc.descriptionEn) {
        patch.descriptionEn = desc.descriptionEn;
        clubDescCount += 1;
      }
    }

    const textFields = await syncLocalizedClubTextFields({
      ...(club.address && !club.addressEn ? { address: club.address } : {}),
      ...(club.gamePrice && !club.gamePriceEn ? { gamePrice: club.gamePrice } : {}),
      ...(club.workingHours && !club.workingHoursEn ? { workingHours: club.workingHours } : {}),
      ...(!club.priceTiersEn && club.priceTiers
        ? { priceTiers: parsePriceTiers(club.priceTiers) }
        : {}),
    });

    if (textFields.addressEn) patch.addressEn = textFields.addressEn;
    if (textFields.gamePriceEn) patch.gamePriceEn = textFields.gamePriceEn;
    if (textFields.workingHoursEn) patch.workingHoursEn = textFields.workingHoursEn;
    if (textFields.priceTiersEn) patch.priceTiersEn = textFields.priceTiersEn;

    if (Object.keys(patch).length === 0) continue;
    console.log(`[club] ${club.id}: ${Object.keys(patch).join(", ")}`);
    if (!dryRun) {
      await prisma.club.update({ where: { id: club.id }, data: patch });
    }
    if (Object.keys(patch).some((k) => k !== "descriptionEn")) clubExtraCount += 1;
  }

  let tournamentDescCount = 0;
  let tournamentNameCount = 0;
  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true, description: true, nameEn: true, descriptionEn: true },
  });
  for (const row of tournaments) {
    if (!row.nameEn) {
      const label = await syncLocalizedLabel({ text: row.name });
      if (label.textEn) {
        console.log(`[tournament-name] ${row.id}: ${row.name.slice(0, 50)}…`);
        if (!dryRun) {
          await prisma.tournament.update({
            where: { id: row.id },
            data: { nameEn: label.textEn },
          });
        }
        tournamentNameCount += 1;
      }
    }
    if (row.description && !row.descriptionEn) {
      const desc = await syncLocalizedDescription({ description: row.description });
      if (!desc.descriptionEn) continue;
      console.log(`[tournament-desc] ${row.id}: description`);
      if (!dryRun) {
        await prisma.tournament.update({
          where: { id: row.id },
          data: { descriptionEn: desc.descriptionEn },
        });
      }
      tournamentDescCount += 1;
    }
  }

  const ideas = await prisma.idea.findMany({
    where: {
      status: "APPROVED",
      OR: [{ titleEn: null }, { bodyEn: null }],
    },
    select: { id: true, title: true, body: true },
  });
  const ideaCount = await backfillTitleBody("idea", ideas, async (id, data) => {
    await prisma.idea.update({ where: { id }, data });
  });

  let countryCount = 0;
  const countries = await prisma.country.findMany({
    where: { nameEn: null },
    select: { id: true, nameRu: true },
  });
  for (const country of countries) {
    const nameEn =
      COUNTRY_NAME_EN[country.nameRu] ??
      (await translateText(country.nameRu, "ru", "en"));
    if (!nameEn) continue;
    console.log(`[country] ${country.nameRu} → ${nameEn}`);
    if (!dryRun) {
      await prisma.country.update({ where: { id: country.id }, data: { nameEn } });
    }
    countryCount += 1;
  }

  let cityCount = 0;
  const cities = await prisma.city.findMany({
    where: { nameEn: null },
    select: { id: true, nameRu: true },
    orderBy: { nameRu: "asc" },
  });
  for (const city of cities) {
    const nameEn = await translateText(city.nameRu, "ru", "en");
    if (!nameEn) continue;
    console.log(`[city] ${city.nameRu} → ${nameEn}`);
    if (!dryRun) {
      await prisma.city.update({ where: { id: city.id }, data: { nameEn } });
    }
    cityCount += 1;
  }

  let coachBioCount = 0;
  const coaches = await prisma.player.findMany({
    where: {
      isCoach: true,
      coachBio: { not: null },
      coachBioEn: null,
    },
    select: { id: true, coachBio: true },
  });
  for (const coach of coaches) {
    const bio = await syncLocalizedDescription({ description: coach.coachBio });
    if (!bio.descriptionEn) continue;
    console.log(`[coachBio] ${coach.id}: ${coach.coachBio!.slice(0, 50)}…`);
    if (!dryRun) {
      await prisma.player.update({
        where: { id: coach.id },
        data: { coachBioEn: bio.descriptionEn },
      });
    }
    coachBioCount += 1;
  }

  let aboutCount = 0;
  const playersWithAbout = await prisma.player.findMany({
    where: { about: { not: null }, aboutEn: null },
    select: { id: true, about: true },
  });
  for (const row of playersWithAbout) {
    const aboutEn = await translateText(row.about!, "ru", "en");
    if (!aboutEn) continue;
    console.log(`[about] ${row.id}`);
    if (!dryRun) {
      await prisma.player.update({ where: { id: row.id }, data: { aboutEn } });
    }
    aboutCount += 1;
  }

  let coachCommentCount = 0;
  const reviews = await prisma.coachRating.findMany({
    where: { comment: { not: null }, commentEn: null },
    select: { id: true, comment: true },
  });
  for (const review of reviews) {
    const commentEn = await translateText(review.comment!, "ru", "en");
    if (!commentEn) continue;
    console.log(`[coachComment] ${review.id}`);
    if (!dryRun) {
      await prisma.coachRating.update({ where: { id: review.id }, data: { commentEn } });
    }
    coachCommentCount += 1;
  }

  let responseMsgCount = 0;
  const responses = await prisma.playListingResponse.findMany({
    where: { message: { not: null }, messageEn: null },
    select: { id: true, message: true },
  });
  for (const row of responses) {
    const messageEn = await translateText(row.message!, "ru", "en");
    if (!messageEn) continue;
    console.log(`[playResponse] ${row.id}`);
    if (!dryRun) {
      await prisma.playListingResponse.update({ where: { id: row.id }, data: { messageEn } });
    }
    responseMsgCount += 1;
  }

  console.log(
    `\nDone${dryRun ? " (dry run)" : ""}: siteNews=${siteCount}, clubNews=${clubNewsCount}, ` +
      `playListing=${listingCount}, clubDesc=${clubDescCount}, clubExtra=${clubExtraCount}, ` +
      `tournamentDesc=${tournamentDescCount}, ` +
      `tournamentNames=${tournamentNameCount}, ideas=${ideaCount}, coachBio=${coachBioCount}, ` +
      `about=${aboutCount}, coachComments=${coachCommentCount}, playResponses=${responseMsgCount}, ` +
      `countries=${countryCount}, cities=${cityCount}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
