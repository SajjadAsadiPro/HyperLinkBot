const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// توکن ربات تلگرام خود را وارد کنید
const bot = new TelegramBot('8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs', { polling: true });

// برای ذخیره لیست‌ها
let persianNames = [];
let englishNames = [];
let linksList = [];
let awaitingResponse = false;  // متغیر برای جلوگیری از ارسال پیام‌های پشت سر هم

// دستور /start برای ارسال پیام خوش‌آمدگویی
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (awaitingResponse) return; // اگر در حال انتظار برای پاسخ از کاربر هستیم، اجازه ارسال پیام جدید را نمی‌دهیم

  awaitingResponse = true;  // ربات در حال انتظار است
  bot.sendMessage(chatId, 'سلام! لطفا ابتدا یک لیست از نام‌های فارسی ارسال کنید. هر نام باید در یک خط جدید باشد.');

  // انتظار برای دریافت لیست نام‌ها
  bot.once('message', (response) => {
    persianNames = response.text.split('\n');  // تقسیم متن به نام‌های فارسی
    bot.sendMessage(chatId, 'لیست نام‌های فارسی دریافت شد. حالا لطفا یک لیست از نام‌های انگلیسی ارسال کنید.');
    
    // انتظار برای دریافت لیست نام‌های انگلیسی
    bot.once('message', (response) => {
      englishNames = response.text.split('\n');  // تقسیم متن به نام‌های انگلیسی
      bot.sendMessage(chatId, 'لیست نام‌های انگلیسی دریافت شد. حالا لطفا یک لیست از لینک‌ها ارسال کنید.');
      
      // انتظار برای دریافت لینک‌ها
      bot.once('message', (response) => {
        linksList = response.text.split('\n');  // تقسیم متن به لینک‌ها
        
        // بررسی اینکه تعداد نام‌ها و لینک‌ها برابر باشد
        if (englishNames.length === linksList.length) {
          let message = '';
          
          // ساخت پیام پیوندها (نام فارسی و انگلیسی کنار هم)
          for (let i = 0; i < englishNames.length; i++) {
            message += `${persianNames[i]} - <a href="${linksList[i]}">${englishNames[i]}</a>\n`;
          }
          
          // ارسال نتیجه به کاربر
          bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        } else {
          bot.sendMessage(chatId, 'تعداد نام‌های انگلیسی و لینک‌ها باید برابر باشد. لطفا دوباره امتحان کنید.');
        }
        awaitingResponse = false;  // پایان انتظار
      });
    });
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
  console.log('Server is running on port 3000');
});
