const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const XLSX = require("xlsx"); // برای خواندن فایل اکسل
const fs = require("fs"); // ماژول فایل سیستم برای ذخیره و حذف فایل‌ها
const path = require("path");

// تنظیم توکن ربات تلگرام و ایجاد ربات
const token = "8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs"; // توکن ربات خود را جایگزین کنید
const bot = new TelegramBot(token, { polling: true });

// متغیرهای وضعیت ربات
let isPaused = false;
let persianNames = [];
let englishNames = [];
let linksList = [];
let countryNames = [];
let productionYears = [];
let awaitingResponse = false;

// مسیر ذخیره فایل اکسل
const tempFilePath = path.join(__dirname, 'tempFile.xlsx');

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

    // ذخیره فایل اکسل در مسیر موقت
    fs.writeFileSync(tempFilePath, response.data);

    // خواندن فایل اکسل
    const workbook = XLSX.read(response.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // اولین شیت
    const sheet = workbook.Sheets[sheetName];

    // استخراج داده‌ها از شیت اکسل
    const data = XLSX.utils.sheet_to_json(sheet);

    // درخواست شماره ردیف از کاربر
    bot.sendMessage(chatId, "لطفاً شماره ردیفی که می‌خواهید پردازش از آن شروع شود را وارد کنید.");

    // منتظر گرفتن شماره ردیف از کاربر
    awaitingResponse = true;
    bot.on("message", async (msg) => {
      if (awaitingResponse && !isNaN(msg.text)) {
        const startRow = parseInt(msg.text, 10) - 1; // تبدیل به ایندکس صفر
        awaitingResponse = false;

        // بررسی اینکه شماره ردیف صحیح است
        if (startRow < 0 || startRow >= data.length) {
          bot.sendMessage(chatId, "شماره ردیف وارد شده نامعتبر است. لطفاً دوباره امتحان کنید.");
          return;
        }

        // پردازش داده‌ها از ردیف مشخص شده
        let message = ""; // پیام اصلی
        let maxMessageLength = 3800; // محدودیت تلگرام
        for (let i = startRow; i < data.length; i++) {
          // بررسی فیلدهای خالی
          if (
            !data[i]["نام فارسی"] ||
            !data[i]["نام انگلیسی"] ||
            !data[i]["لینک در کانال"] ||
            !data[i]["کشور"]
          ) {
            break; // اگر یکی از فیلدها خالی بود، پردازش متوقف می‌شود
          }

          // ساخت متن هر رکورد
          const filmMessage = `${i + 1} - <b>${data[i]["نام فارسی"]}</b> (${
            data[i]["سال تولید"]
          }) ${data[i]["کشور"]}  👇\n😍 <a href="${data[i]["لینک در کانال"]}">"${
            data[i]["نام انگلیسی"]
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
      } else if (awaitingResponse) {
        bot.sendMessage(chatId, "لطفاً یک شماره ردیف معتبر وارد کنید.");
      }
    });
  } catch (error) {
    console.error("Error processing the Excel file:", error);
    bot.sendMessage(chatId, "❌ خطا در پردازش فایل اکسل.");
  }
});
