const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// تنظیم توکن ربات تلگرام و ایجاد ربات
const token = "8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs";
const bot = new TelegramBot(token, { polling: true });

// API Key برای OMDB
const OMDB_API_KEY = "9c5e2fdd"; // اینجا API Key خود را وارد کنید

// تابع برای گرفتن اموجی پرچم بر اساس نام کشور
function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

// متغیر برای ذخیره نام‌ها و لینک‌ها
let persianNames = [];
let englishNames = [];
let linksList = [];
let awaitingResponse = false;

// هنگامی که ربات شروع می‌شود، از کاربر می‌خواهد نام‌ها را وارد کند
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (!awaitingResponse) {
    awaitingResponse = true;
    bot.sendMessage(
      chatId,
      "سلام! لطفا ابتدا یک لیست از نام‌های فارسی ارسال کنید. هر نام باید در یک خط جدید باشد."
    );
  }
});

// دریافت نام‌های فارسی و درخواست نام‌های انگلیسی
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (awaitingResponse && !msg.text.startsWith("/")) {
    // ذخیره لیست نام‌های فارسی
    if (persianNames.length === 0) {
      persianNames = msg.text.split("\n");
      bot.sendMessage(
        chatId,
        "لیست نام‌های فارسی دریافت شد. حالا لطفا یک لیست از نام‌های انگلیسی ارسال کنید."
      );
    }
    // ذخیره لیست نام‌های انگلیسی
    else if (englishNames.length === 0) {
      englishNames = msg.text.split("\n");
      bot.sendMessage(
        chatId,
        "لیست نام‌های انگلیسی دریافت شد. حالا لطفا یک لیست از لینک‌ها ارسال کنید."
      );
    }
    // ذخیره لینک‌ها
    else if (linksList.length === 0) {
      linksList = msg.text.split("\n");

      if (englishNames.length === linksList.length) {
        let message = "";

        let promises = englishNames.map(async (name, i) => {
          let response = await axios.get(
            `http://www.omdbapi.com/?t=${name}&apikey=${OMDB_API_KEY}`
          );
          let data = response.data;

          // اگر اطلاعات پیدا شد
          if (data.Response === "True") {
            const releaseYear = data.Year || "Unknown Year";
            const countries = data.Country
              ? data.Country.split(", ")
              : ["Unknown Country"];
            const countriesEmojis = countries
              .map((country) => getFlagEmoji(country))
              .join(" ");

            // ساخت فرمت خروجی
            message += `✅ ${i + 1} ${
              persianNames[i]
            } (${releaseYear}) ${countriesEmojis} 👇 👇 👇\n⬇️ <a href="${
              linksList[i]
            }">${name}</a>\n\n`;
          } else {
            // اگر اطلاعات پیدا نشد
            message += `✅ ${i + 1} ${
              persianNames[i]
            } (No Data) 👇 👇 👇\n⬇️ <a href="${linksList[i]}">${name}</a>\n\n`;
          }
        });

        // منتظر می‌مانیم تا همه درخواست‌ها تکمیل شوند
        await Promise.all(promises);

        // ارسال نتیجه به کاربر
        bot.sendMessage(chatId, message, { parse_mode: "HTML" });
      } else {
        bot.sendMessage(
          chatId,
          "تعداد نام‌های انگلیسی و لینک‌ها باید برابر باشد. لطفا دوباره امتحان کنید."
        );
      }
      awaitingResponse = false; // پایان انتظار
    }
  }
});
