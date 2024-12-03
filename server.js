const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const XLSX = require("xlsx");
const fs = require("fs");

const token = "8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs";
const bot = new TelegramBot(token, { polling: true });

const progressFilePath = "./progress.json"; // فایل ذخیره‌سازی وضعیت

// متغیرهای وضعیت
let persianNames = [];
let englishNames = [];
let linksList = [];
let countryNames = [];
let productionYears = [];
let lastProcessedIndex = 0; // ذخیره آخرین پردازش‌شده

// تابع برای تقسیم پیام‌ها به بخش‌های کوچکتر
const sendMessageInChunks = async (chatId, message, bot, linesPerChunk = 150) => {
  const lines = message.split("\n");
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    const chunk = lines.slice(i, i + linesPerChunk).join("\n");
    await bot.sendMessage(chatId, chunk, {
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

// مدیریت دستور /pause
bot.onText(/\/pause/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "⏸️ ربات متوقف شد.");
});

// مدیریت دستور /resume
bot.onText(/\/resume/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "▶️ ربات فعال شد. می‌توانید ادامه دهید.");
});

// دستور ریست کردن حافظه ربات
bot.onText(/\/reset/, (msg) => {
  const chatId = msg.chat.id;
  // حذف فایل ذخیره‌سازی وضعیت پردازش (یعنی progress.json)
  if (fs.existsSync(progressFilePath)) {
    fs.unlinkSync(progressFilePath); // حذف فایل
    bot.sendMessage(chatId, "🔄 حافظه ربات ریست شد. تمامی اطلاعات پردازش شده پاک شد.");
  } else {
    bot.sendMessage(chatId, "❌ هیچ اطلاعات پردازش شده‌ای پیدا نشد.");
  }

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
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // استخراج داده‌ها از شیت اکسل
    const data = XLSX.utils.sheet_to_json(sheet);

    // اگر فایل قبلاً پردازش شده، از آخرین رکورد پردازش شده ادامه می‌دهیم
    if (fs.existsSync(progressFilePath)) {
      const progressData = JSON.parse(fs.readFileSync(progressFilePath, "utf-8"));
      lastProcessedIndex = progressData.lastProcessedIndex || 0;
    }

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
    let count = 0;
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
      message += `${i + 1} - <b>${persianNames[i]}</b> (${
        productionYears[i]
      }) ${countryNames[i]}  👇\n`;
      message += `😍 <a href="${linksList[i]}">"${englishNames[i]}"</a>\n\n`;

      count++;

      // اگر تعداد فیلم‌ها به 30 رسید، ارسال پیام و شروع پیام جدید
      if (count === 30 || i === englishNames.length - 1) {
        message += "\n@GlobCinema\n@Filmoseriyalerooz_Bot";
        await sendMessageInChunks(chatId, message, bot, 150); // ارسال پیام
        message = ""; // ریست کردن پیام
        count = 0; // ریست کردن شمارنده
      }

      // ذخیره وضعیت پردازش برای ادامه در دفعات بعدی
      lastProcessedIndex = i + 1; // رکورد بعدی را برای پردازش در دفعات بعدی ذخیره می‌کنیم
      fs.writeFileSync(progressFilePath, JSON.stringify({ lastProcessedIndex }));
    }

    bot.sendMessage(chatId, "✅ پردازش فایل تکمیل شد.");
  } catch (error) {
    console.error("Error processing the Excel file:", error);
    bot.sendMessage(chatId, "❌ خطا در پردازش فایل اکسل.");
  }
});
