const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// تنظیم توکن ربات تلگرام و ایجاد ربات
const token = "8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs";
const bot = new TelegramBot(token, { polling: true });

// API Key برای OMDB
const OMDB_API_KEY = "9c5e2fdd"; // اینجا API Key خود را وارد کنید

// متغیرهای وضعیت ربات
let isPaused = false;
let persianNames = [];
let englishNames = [];
let linksList = [];
let countryNames = [];
let awaitingResponse = false;

// تابع برای تقسیم پیام‌ها بر اساس تعداد خطوط
const sendMessageInChunks = async (chatId, message, bot, linesPerChunk = 50) => {
  const lines = message.split("\n");
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    const chunk = lines.slice(i, i + linesPerChunk).join("\n");
    await bot.sendMessage(chatId, chunk, { parse_mode: "HTML" });
  }
};

// مدیریت دستور `/start`
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // ریست کردن تمام داده‌های قبلی
  persianNames = [];
  englishNames = [];
  linksList = [];
  countryNames = [];
  awaitingResponse = true;
  isPaused = false;

  bot.sendMessage(
    chatId,
    "ربات از اول شروع شد! لطفا ابتدا یک لیست از نام‌های فارسی ارسال کنید. هر نام باید در یک خط جدید باشد."
  );
});

// مدیریت دستور `/pause`
bot.onText(/\/pause/, (msg) => {
  const chatId = msg.chat.id;
  if (!isPaused) {
    isPaused = true;
    bot.sendMessage(chatId, "⏸️ ربات متوقف شد. برای ادامه از دستور /resume استفاده کنید.");
  } else {
    bot.sendMessage(chatId, "⏸️ ربات قبلاً متوقف شده است.");
  }
});

// مدیریت دستور `/resume`
bot.onText(/\/resume/, (msg) => {
  const chatId = msg.chat.id;
  if (isPaused) {
    isPaused = false;
    bot.sendMessage(chatId, "▶️ ربات فعال شد. می‌توانید ادامه دهید.");
  } else {
    bot.sendMessage(chatId, "▶️ ربات از قبل فعال است.");
  }
});

// دریافت اطلاعات موردنیاز به ترتیب
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (isPaused) {
    bot.sendMessage(chatId, "⏸️ ربات متوقف است. لطفاً با دستور /resume آن را فعال کنید.");
    return;
  }

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
      bot.sendMessage(
        chatId,
        "لیست لینک‌ها دریافت شد. حالا لطفا یک لیست از نام کشورها (به فارسی) ارسال کنید."
      );
    }
    // ذخیره لیست نام کشورها
    else if (countryNames.length === 0) {
      countryNames = msg.text.split("\n");

      if (
        persianNames.length === englishNames.length &&
        englishNames.length === linksList.length &&
        linksList.length === countryNames.length
      ) {
        let message = "";

        for (let i = 0; i < englishNames.length; i++) {
          const name = englishNames[i];
          try {
            const response = await axios.get(
              `http://www.omdbapi.com/?t=${name}&apikey=${OMDB_API_KEY}`
            );
            const data = response.data;

            const releaseYear = data.Response === "True" ? data.Year || "Unknown Year" : "No Data";

            message += `✅ ${i + 1} ${persianNames[i]} (${releaseYear}) ${countryNames[i]} 👇 👇 👇\n⬇️ <a href="${linksList[i]}">${name}</a>\n\n`;
          } catch (error) {
            console.error(`Error fetching data for ${name}:`, error.message);
            message += `❌ ${i + 1} ${persianNames[i]} - خطا در دریافت اطلاعات.\n\n`;
          }
        }

        // ارسال نتیجه به صورت تقسیم‌شده
        await sendMessageInChunks(chatId, message, bot);
      } else {
        bot.sendMessage(
          chatId,
          "تعداد نام‌های فارسی، انگلیسی، لینک‌ها و کشورها باید برابر باشد. لطفا دوباره امتحان کنید."
        );
      }
      awaitingResponse = false; // پایان انتظار
    }
  }
});
