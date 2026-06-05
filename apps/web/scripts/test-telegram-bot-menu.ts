import assert from "node:assert/strict";
import {
  BOT_MENU_PROFILE,
  formatPlayerProfileTelegram,
  isProfileMenuRequest,
} from "../src/lib/telegram-bot-menu";

assert.equal(isProfileMenuRequest(BOT_MENU_PROFILE), true);
assert.equal(isProfileMenuRequest("/profile"), true);
assert.equal(isProfileMenuRequest("/profile@BilliardGuruBot"), true);
assert.equal(isProfileMenuRequest("/start"), false);

const text = formatPlayerProfileTelegram({
  id: "p1",
  firstName: "Иван",
  lastName: "Петров",
  middleName: null,
  phone: "+7 900 123-45-67",
  rating: 5.5,
  role: "PLAYER",
  telegramUsername: "ivan_p",
  about: "Люблю пул",
  cityId: "c1",
  email: null,
  birthDate: null,
  photoUrl: null,
  telegramId: "123",
  isCoach: false,
  isVerified: true,
  confirmToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  city: {
    id: "c1",
    nameRu: "Москва",
    countryId: "ru",
    latitude: 0,
    longitude: 0,
    country: { id: "ru", nameRu: "Россия" },
  },
});

assert.match(text, /Мой профиль/);
assert.match(text, /Петров Иван/);
assert.match(text, /Москва/);
assert.match(text, /5\.5/);
assert.match(text, /@ivan_p/);
assert.match(text, /Люблю пул/);

console.log("telegram-bot-menu tests passed");
