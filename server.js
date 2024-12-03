const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const XLSX = require("xlsx");
const fs = require("fs");
const htmlEscape = require("html-escape");

const token = "8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs";
const bot = new TelegramBot(token, { polling: true });

let persianNames = [];
let englishNames = [];
let linksList = [];
let countryNames = [];
let productionYears = [];
let lastProcessedIndex = 0; // ذخیره آخرین پردازش‌شده

// تابع برای تصفیه HTML
const sanitizeHTML = (text) => {
  return htmlEscape(text).replace(/<[^>]*>/g, ''); // جلوگیری از تگ‌های غیرمجاز
};

// تابع برای تقسیم پیام‌ها به بخش‌های کوچکتر
const sendMessageInChunks = async (chatId, message, bot, maxLength = 3800) => {
  while (message.length > maxLength) {
    // ارسال پیام بخش اول تا حداکثر اندازه مجاز
    await bot.sendMessage(chatId, message.substring(0, maxLength), {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    // ارسال باقی‌مانده پیام
    message = message.substring(maxLength);
  }

  // ارسال پیام باقی‌مانده (اگر طول پیام کمتر از حداکثر طول است)
  if (message.length > 0) {
    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }
};

// مدیریت دستور /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "ربات آماده است. لطفاً فایل اکسل حاوی اطلاعات فیلم را ارسال کنید."
  );
});

// دستور ریست کردن حافظه ربات
bot.onText(/\/reset/, (msg) => {
  const chatId = msg.chat.id;
  // ریست کردن تمام متغیرهای مربوط به داده‌ها
  persianNames = [];
  englishNames = [];
  linksList = [];
  countryNames = [];
  productionYears = [];
  lastProcessedIndex = 0;

  bot.sendMessage(chatId, "🔄 حافظه ربات به تنظیمات کارخانه بازگشت.");
});

// دریافت فایل اکسل
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  try {
    // دریافت فایل
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });

    // خواندن فایل اکسل
    const workbook = XLSX.read(response.data, { type: "buffer" });

    const sheetName = workbook.SheetNames[0]; // اولین شیت را انتخاب می‌کنیم
    const sheet = workbook.Sheets[sheetName];

    // استخراج داده‌ها از شیت اکسل
    const data = XLSX.utils.sheet_to_json(sheet);

    // درخواست شماره آخرین رکورد پردازش شده از کاربر
    bot.sendMessage(chatId, "لطفاً شماره آخرین رکورد پردازش شده را وارد کنید.");
    bot.on("message", async (msg) => {
      const userMessage = msg.text;

      // بررسی اگر پیام عددی است و می‌تواند به عنوان آخرین رکورد پردازش شده استفاده شود
      const lastIndex = parseInt(userMessage);
      if (isNaN(lastIndex)) {
        bot.sendMessage(chatId, "❌ لطفاً یک عدد معتبر وارد کنید.");
        return;
      }

      // ذخیره آخرین رکورد پردازش شده
      lastProcessedIndex = lastIndex;

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

      let message = "";
      // پردازش از آخرین رکورد پردازش شده
      for (let i = lastProcessedIndex; i < englishNames.length; i++) {
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
        message += `${i + 1} - <b>${sanitizeHTML(persianNames[i])}</b> (${
          productionYears[i]
        }) ${countryNames[i]}  👇\n`;
        message += `😍 <a href="${sanitizeHTML(linksList[i])}">"${sanitizeHTML(englishNames[i])}"</a>\n\n`;

        // ذخیره وضعیت پردازش برای ادامه در دفعات بعدی
        lastProcessedIndex = i + 1; // رکورد بعدی را برای پردازش در دفعات بعدی ذخیره می‌کنیم
      }

      // ارسال پیام کامل
      await sendMessageInChunks(chatId, message, bot, 3800);

      bot.sendMessage(chatId, "✅ پردازش فایل تکمیل شد.");
    });
  } catch (error) {
    console.error("Error processing the Excel file:", error);
    bot.sendMessage(chatId, "❌ خطا در پردازش فایل اکسل. لطفاً بررسی کنید که فایل به درستی فرمت شده باشد.");
  }
});
