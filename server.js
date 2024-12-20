const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const XLSX = require("xlsx"); // برای خواندن فایل اکسل

// تنظیم توکن ربات تلگرام و ایجاد ربات
const token = "7507570606:AAHHGUTByGCeyKaVrcvSi3Lhn8D0BDvlLxI"; // توکن ربات خود را جایگزین کنید
const bot = new TelegramBot(token, { polling: true });

// متغیرهای وضعیت ربات
let rowIndexStart = 0; // ردیف شروع پردازش (ایندکس صفر)
let persianNames = [];
let englishNames = [];
let linksList = [];
let countryNames = [];
let productionYears = [];

// مدیریت دستور `/start`
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // ریست کردن تمام داده‌های قبلی
  persianNames = [];
  englishNames = [];
  linksList = [];
  countryNames = [];
  productionYears = [];
  rowIndexStart = 0;

  bot.sendMessage(
    chatId,
    "ربات از اول شروع شد! لطفا ابتدا یک فایل اکسل ارسال کنید که شامل نام‌های فارسی، نام‌های انگلیسی، سال تولید، کشورها و لینک‌ها باشد."
  );
});

// مدیریت دستور `/rowstart` برای تنظیم ردیف شروع
bot.onText(/\/rowstart (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;

  // بررسی صحت ورودی
  const rowStartInput = parseInt(match[1], 10); // دریافت ورودی عدد
  if (isNaN(rowStartInput) || rowStartInput < 1) {
    bot.sendMessage(chatId, "❌ لطفاً یک شماره معتبر (بزرگتر از ۰) وارد کنید.");
    return;
  }

  rowIndexStart = rowStartInput - 1; // تنظیم ردیف شروع (ایندکس صفر)
  bot.sendMessage(
    chatId,
    `✅ شماره ردیف شروع به ${rowStartInput} تنظیم شد. اکنون فایل اکسل را ارسال کنید.`
  );
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

    // حالا اطلاعات را پردازش و ارسال می‌کنیم
    if (
      persianNames.length === englishNames.length &&
      englishNames.length === linksList.length &&
      linksList.length === countryNames.length &&
      countryNames.length === productionYears.length
    ) {
      let message = ""; // پیام اصلی
      let maxMessageLength = 3800; // محدودیت تلگرام

      for (let i = rowIndexStart; i < englishNames.length; i++) {
        // بررسی فیلدهای خالی
        if (
          !persianNames[i] ||
          !englishNames[i] ||
          !linksList[i] ||
          !countryNames[i]
        ) {
          continue; // اگر یکی از فیلدها خالی بود، از آن صرف‌نظر کنید
        }

        // ساخت متن هر رکورد
        const filmMessage = `${i + 1} - <b>${persianNames[i]}</b> (${
          productionYears[i]
        }) ${countryNames[i]}  👇\n😍 <a href="${linksList[i]}">"${
          englishNames[i]
        }"</a>\n\n`;

        // اگر اضافه کردن این رکورد پیام را از 3800 کاراکتر فراتر ببرد
        if (message.length + filmMessage.length > maxMessageLength) {
          await bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
          });
          message = ""; // ریست کردن پیام
        }

        // اضافه کردن رکورد به پیام
        message += filmMessage;
      }

      // ارسال پیام باقی‌مانده
      if (message.trim().length > 0) {
        message += "\n@GlobCinema\n@Filmoseriyalerooz_Bot";
        await bot.sendMessage(chatId, message, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
        });
      }
    } else {
      bot.sendMessage(
        chatId,
        "تعداد نام‌های فارسی، نام‌های انگلیسی، لینک‌ها، سال تولید و کشورها باید برابر باشد. لطفا دوباره امتحان کنید."
      );
    }
  } catch (error) {
    console.error("Error processing the Excel file:", error);
    bot.sendMessage(chatId, "❌ خطا در پردازش فایل اکسل.");
  }
});
