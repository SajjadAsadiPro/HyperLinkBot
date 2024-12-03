const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const XLSX = require("xlsx");
const fs = require("fs");

// تنظیم توکن ربات تلگرام و ایجاد ربات
const token = "8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs"; // توکن ربات خود را در اینجا قرار دهید
const bot = new TelegramBot(token, { polling: true });

// متغیرهای وضعیت ربات
let isPaused = false;
let persianNames = [];
let englishNames = [];
let linksList = [];
let countryNames = [];
let productionYears = [];
let awaitingResponse = false;

// مسیر فایل ذخیره وضعیت پردازش
const progressFilePath = './progress.json';

// تابع برای خواندن وضعیت پردازش قبلی
const readProgress = () => {
  if (fs.existsSync(progressFilePath)) {
    const data = fs.readFileSync(progressFilePath);
    return JSON.parse(data);
  }
  return { lastProcessedIndex: -1 }; // مقدار پیش‌فرض -1 یعنی هیچ رکوردی پردازش نشده
};

// تابع برای ذخیره وضعیت پردازش
const saveProgress = (lastIndex) => {
  const progress = { lastProcessedIndex: lastIndex };
  fs.writeFileSync(progressFilePath, JSON.stringify(progress));
};

// مدیریت دستور `/start`
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // ریست کردن تمام داده‌های قبلی
  persianNames = [];
  englishNames = [];
  linksList = [];
  countryNames = [];
  productionYears = [];
  awaitingResponse = true;
  isPaused = false;

  bot.sendMessage(
    chatId,
    "ربات از اول شروع شد! لطفا ابتدا یک فایل اکسل ارسال کنید که شامل نام‌های فارسی، نام‌های انگلیسی، سال تولید، کشورها و لینک‌ها باشد."
  );
});

// دریافت فایل اکسل
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  if (isPaused) {
    bot.sendMessage(
      chatId,
      "⏸️ ربات متوقف است. لطفاً با دستور /resume آن را فعال کنید."
    );
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
    productionYears = data.map((row) => row["سال تولید"] || "بدون اطلاعات");

    bot.sendMessage(
      chatId,
      "فایل اکسل با موفقیت بارگذاری شد. در حال پردازش اطلاعات..."
    );

    // دریافت آخرین رکورد پردازش‌شده
    const progress = readProgress();
    let lastProcessedIndex = progress.lastProcessedIndex;

    console.log("Last processed index:", lastProcessedIndex);

    // ساخت پیام خروجی
    let message = "";
    let maxMessageLength = 3800;
    let count = 0;

    for (let i = lastProcessedIndex + 1; i < persianNames.length; i++) {
      // بررسی فیلدهای خالی
      if (
        !persianNames[i] ||
        !englishNames[i] ||
        !linksList[i] ||
        !countryNames[i]
      ) {
        continue; // اگر یکی از فیلدها خالی بود، از آن صرف‌نظر کنید
      }

      // ساخت پیام
      message += `${i + 1} - <b>${persianNames[i]}</b> (${productionYears[i]}) ${countryNames[i]}  👇\n`;
      message += `😍 <a href="${linksList[i]}">"${englishNames[i]}"</a>\n\n`;

      count++;

      // بررسی محدودیت طول پیام
      if (message.length >= maxMessageLength || i === persianNames.length - 1) {
        message += "\n@GlobCinema\n@Filmoseriyalerooz_Bot";
        await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
        message = ""; // ریست کردن پیام
        saveProgress(i); // ذخیره آخرین ایندکس پردازش‌شده
      }
    }

    bot.sendMessage(chatId, "✅ پردازش فایل به پایان رسید.");

  } catch (error) {
    console.error("Error processing the Excel file:", error);
    bot.sendMessage(chatId, "❌ خطا در پردازش فایل اکسل.");
  }
});
