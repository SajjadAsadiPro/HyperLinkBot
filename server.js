const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 3000;

const token = "YOUR_BOT_TOKEN"; // توکن ربات تلگرام
const bot = new TelegramBot(token, { polling: true });

// ذخیره تصویر تامبنیل به صورت فایل
let thumbnailPath = "";

// هنگامی که ربات پیامی دریافت می‌کند
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // ارسال پیام "ربات آنلاین است" زمانی که کاربر پیام می‌فرستد
  bot.sendMessage(chatId, "ربات آنلاین است!");

  // بررسی اینکه آیا پیام حاوی عکس است
  if (msg.photo) {
    const photoId = msg.photo[msg.photo.length - 1].file_id; // انتخاب عکس با کیفیت بالا

    // دریافت لینک عکس
    bot.getFileLink(photoId).then((photoUrl) => {
      thumbnailPath = photoUrl; // ذخیره لینک عکس برای استفاده به عنوان تامبنیل
      bot.sendMessage(
        chatId,
        "تصویر تامبنیل ذخیره شد. حالا می‌توانید ویدیو را ارسال کنید!"
      );
    });
  }

  // بررسی اینکه آیا پیام حاوی ویدیو است
  if (msg.video && thumbnailPath) {
    const videoFileId = msg.video.file_id;
    const messageId = msg.message_id;

    // دریافت لینک ویدیو
    bot.getFileLink(videoFileId).then((videoUrl) => {
      // تغییر تامبنیل ویدیو
      bot.editMessageMedia(
        {
          type: "video",
          media: {
            type: "video",
            media: videoUrl,
            thumb: thumbnailPath, // استفاده از تامبنیل ذخیره‌شده
          },
        },
        { chat_id: chatId, message_id: messageId }
      );

      bot.sendMessage(chatId, "تامبنیل ویدیو تغییر کرد!");
    });
  }
});

// پیکربندی Express برای روشن نگه داشتن سرور
app.get("/", (req, res) => {
  res.send("Your bot is running!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
