const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const XLSX = require("xlsx"); // برای خواندن فایل اکسل

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
const sendMessageInChunks = async (chatId, message, bot, linesPerChunk = 150) => {
  const lines = message.split("\n");
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    const chunk = lines.slice(i, i + linesPerChunk).join("\n");
    await bot.sendMessage(chatId, chunk, { parse_mode: "HTML", disable_web_page_preview: true });
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
    "ربات از اول شروع شد! لطفا ابتدا یک فایل اکسل ارسال کنید که شامل نام‌های فارسی، نام‌های انگلیسی، کشورها و لینک‌ها باشد."
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

// دریافت فایل اکسل
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  if (isPaused) {
    bot.sendMessage(chatId, "⏸️ ربات متوقف است. لطفاً با دستور /resume آن را فعال کنید.");
    return;
  }

  try {
    // دریافت فایل
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    
    // خواندن فایل اکسل
    const workbook = XLSX.read(response.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // اولین شیت
    const sheet = workbook.Sheets[sheetName];

    // استخراج داده‌ها از شیت اکسل
    const data = XLSX.utils.sheet_to_json(sheet);

    // فیلتر کردن داده‌ها و فقط گرفتن ستون‌های مورد نظر
    persianNames = data.map((row) => row["نام فارسی"] || "");
    englishNames = data.map((row) => row["نام انگلیسی"] || "");
    linksList = data.map((row) => row["لینک در کانال"] || "");
    countryNames = data.map((row) => row["کشور"] || "");

    bot.sendMessage(chatId, "فایل اکسل با موفقیت بارگذاری شد. در حال پردازش اطلاعات...");

    // حالا اطلاعات را پردازش و ارسال می‌کنیم
    if (
      persianNames.length === englishNames.length &&
      englishNames.length === linksList.length &&
      linksList.length === countryNames.length
    ) {
      let message = "";
      let count = 0;

      for (let i = 0; i < englishNames.length; i++) {
        // بررسی فیلدهای خالی
        if (!persianNames[i] || !englishNames[i] || !linksList[i] || !countryNames[i]) {
          break; // اگر یکی از فیلدها خالی بود، پردازش متوقف می‌شود
        }

        const name = englishNames[i];
        try {
          const response = await axios.get(
            `http://www.omdbapi.com/?t=${name}&apikey=${OMDB_API_KEY}`
          );
          const data = response.data;

          const releaseYear = data.Response === "True" ? data.Year || "Unknown Year" : "No Data";

          message += ` ${i + 1} -<b> ${persianNames[i]} </b> (${releaseYear}) ${countryNames[i]}  👇\n`;
          message += `😍 <a href="${linksList[i]}">${name}</a>\n\n`;

          count++;

          // اگر تعداد فیلم‌ها به 40 رسید، ارسال پیام و شروع پیام جدید
          if (count === 40 || i === englishNames.length - 1) {
            message += "\n@GlobCinema\n@Filmoseriyalerooz_Bot";
            await sendMessageInChunks(chatId, message, bot, 150); // ارسال پیام
            message = ""; // ریست کردن پیام
            count = 0; // ریست کردن شمارنده
          }
        } catch (error) {
          console.error(`Error fetching data for ${name}:`, error.message);
          message += `❌ ${persianNames[i]} - خطا در دریافت اطلاعات.\n\n`;
        }
      }
    } else {
      bot.sendMessage(
        chatId,
        "تعداد نام‌های فارسی، نام‌های انگلیسی، لینک‌ها و کشورها باید برابر باشد. لطفا دوباره امتحان کنید."
      );
    }
    awaitingResponse = false; // پایان انتظار
  } catch (error) {
    console.error("Error processing the Excel file:", error);
    bot.sendMessage(chatId, "❌ خطا در پردازش فایل اکسل.");
  }
});
