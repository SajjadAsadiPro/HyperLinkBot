const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// توکن ربات تلگرام خود را وارد کنید
const bot = new TelegramBot("YOUR_BOT_TOKEN", { polling: true });

// برای ذخیره لیست‌ها
let namesList = [];
let linksList = [];

// دستور /start برای ارسال پیام خوش‌آمدگویی
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "سلام! برای ارسال پیوندها، ابتدا یک لیست نام ارسال کنید. هر نام باید در یک خط جداگانه باشد."
  );
});

// دریافت لیست نام‌ها از کاربر
bot.onText(/\/names/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "لطفا یک لیست از نام‌ها را ارسال کنید. هر نام در یک خط جدید باشد."
  );
  bot.once("message", (response) => {
    namesList = response.text.split("\n"); // تقسیم متن به نام‌ها
    bot.sendMessage(
      chatId,
      "لیست نام‌ها دریافت شد. حالا لطفا یک لیست از لینک‌ها ارسال کنید."
    );
  });
});

// دریافت لیست لینک‌ها از کاربر
bot.onText(/\/links/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "لطفا یک لیست از لینک‌ها را ارسال کنید. تعداد لینک‌ها باید با تعداد نام‌ها برابر باشد."
  );
  bot.once("message", (response) => {
    linksList = response.text.split("\n"); // تقسیم متن به لینک‌ها

    // بررسی اینکه تعداد لینک‌ها و نام‌ها برابر باشد
    if (namesList.length === linksList.length) {
      let message = "";

      // ساخت پیام پیوندها
      for (let i = 0; i < namesList.length; i++) {
        message += `<a href="${linksList[i]}">${namesList[i]}</a>\n`;
      }

      // ارسال نتیجه به کاربر
      bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    } else {
      bot.sendMessage(
        chatId,
        "تعداد نام‌ها و لینک‌ها باید برابر باشد. لطفا دوباره امتحان کنید."
      );
    }
  });
});

// برای جلوگیری از قطع شدن ربات در Glitch
// این مورد ضروری است تا ربات شما همیشه فعال باشد
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// سرور را در پورت 3000 اجرا کنید
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
