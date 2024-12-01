const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');  // برای درخواست به API

// توکن ربات تلگرام خود را وارد کنید
const bot = new TelegramBot('8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs', { polling: true });

// برای ذخیره لیست‌ها
let persianNames = [];
let englishNames = [];
let linksList = [];
let awaitingResponse = false;  // متغیر برای جلوگیری از ارسال پیام‌های پشت سر هم

// OMDb API Key
const OMDB_API_KEY = 'http://www.omdbapi.com/?i=tt3896198&apikey=9c5e2fdd';  // توکن خود را اینجا قرار دهید

// دستور /start برای ارسال پیام خوش‌آمدگویی
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (awaitingResponse) return; // اگر در حال انتظار برای پاسخ از کاربر هستیم، اجازه ارسال پیام جدید را نمی‌دهیم

  awaitingResponse = true;  // ربات در حال انتظار است
  bot.sendMessage(chatId, 'سلام! لطفا ابتدا یک لیست از نام‌های فارسی ارسال کنید. هر نام باید در یک خط جدید باشد.');
  
  // حالت منتظر بودن برای نام‌های فارسی
  bot.once('message', (response) => {
    persianNames = response.text.split('\n');  // تقسیم متن به نام‌های فارسی
    bot.sendMessage(chatId, 'لیست نام‌های فارسی دریافت شد. حالا لطفا یک لیست از نام‌های انگلیسی ارسال کنید.');
    
    // حالت منتظر بودن برای نام‌های انگلیسی
    bot.once('message', (response) => {
      englishNames = response.text.split('\n');  // تقسیم متن به نام‌های انگلیسی
      bot.sendMessage(chatId, 'لیست نام‌های انگلیسی دریافت شد. حالا لطفا یک لیست از لینک‌ها ارسال کنید.');
      
      // حالت منتظر بودن برای لینک‌ها
      bot.once('message', (response) => {
        linksList = response.text.split('\n');  // تقسیم متن به لینک‌ها
        
        // بررسی اینکه تعداد نام‌ها و لینک‌ها برابر باشد
        if (englishNames.length === linksList.length) {
          let message = '';
          
          // برای هر فیلم درخواست به API ارسال می‌کنیم
          let promises = englishNames.map(async (name, i) => {
            let response = await axios.get(`http://www.omdbapi.com/?t=${name}&apikey=${OMDB_API_KEY}`);
            let data = response.data;
            
            // اگر اطلاعات پیدا شد
            if (data.Response === "True") {
              const releaseYear = data.Year || 'Unknown Year';
              const countries = data.Country ? data.Country.split(', ') : ['Unknown Country'];
              const countriesEmojis = countries.map(country => getFlagEmoji(country)).join(' ');  // تبدیل کشورها به اموجی پرچم
              
              // ساخت فرمت خروجی
              message += `✅ ${i + 1} ${persianNames[i]} (${releaseYear}) ${countriesEmojis} 👇 👇 👇\n⬇️ <a href="${linksList[i]}">${name}</a>\n\n`;
            } else {
              // اگر اطلاعات پیدا نشد
              message += `✅ ${i + 1} ${persianNames[i]} (No Data) 👇 👇 👇\n⬇️ <a href="${linksList[i]}">${name}</a>\n\n`;
            }
          });

          // منتظر می‌مانیم تا همه درخواست‌ها تکمیل شوند
          await Promise.all(promises);
          
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

// برای دریافت اموجی پرچم کشورهای مختلف
function getFlagEmoji(countryCode) {
  const flag = {
    'USA': '🇺🇸',
    'UK': '🇬🇧',
    'Iran': '🇮🇷',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Italy': '🇮🇹',
    // سایر کشورها را به این صورت اضافه کنید
  };

  return flag[countryCode] || '🏳️';  // در صورتی که کشور شناسایی نشود پرچم سفید را برمی‌گرداند
}

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
