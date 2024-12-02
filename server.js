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

// گزینه‌های کیبورد
const keyboardOptions = {
  reply_markup: {
    keyboard: [
      [{ text: "شروع مجدد" }],
      [{ text: "⏸️ توقف" }, { text: "▶️ ادامه" }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// تابع برای تقسیم پیام‌ها بر اساس تعداد خطوط
const sendMessageInChunks = async (chatId, message, bot, linesPerChunk = 150) => {
  const lines = message.split("\n");
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    const chunk = lines.slice(i, i + linesPerChunk).join("\n");
    await bot.sendMessage(chatId, chunk, { parse_mode: "HTML", disable_web_page_preview: true });
  }
};

// مدیریت دستور `/start` و دکمه "شروع مجدد"
const startBot = (chatId) => {
  // ریست کردن تمام داده‌های قبلی
  persianNames = [];
  englishNames = [];
  linksList = [];
  countryNames = [];
  awaitingResponse = true;
  isPaused = false;

  bot.sendMessage(
    chatId,
    "ربات از اول شروع شد! لطفا ابتدا یک فایل اکسل ارسال کنید که شامل نام‌های فارسی، نام‌های انگلیسی، کشورها و لینک‌ها باشد.",
    keyboardOptions
  );
};

// مدیریت دستور `/start`
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  startBot(chatId);
});

// مدیریت دکمه "شروع مجدد"
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "شروع مجدد") {
    startBot(chatId);
    return;
  }

  if (msg.text === "⏸️ توقف") {
    if (!isPaused) {
      isPaused = true;
      bot.sendMessage(chatId, "⏸️ ربات متوقف شد. برای ادامه از دکمه ▶️ استفاده کنید.");
    } else {
      bot.sendMessage(chatId, "⏸️ ربات قبلاً متوقف شده است.");
    }
    return;
  }

  if (msg.text === "▶️ ادامه") {
    if (isPaused) {
      isPaused = false;
      bot.sendMessage(chatId, "▶️ ربات فعال شد. می‌توانید ادامه دهید.");
    } else {
      bot.sendMessage(chatId, "▶️ ربات از قبل فعال است.");
    }
    return;
  }
});

// ادامه بقیه کد شما برای پردازش فایل اکسل...
