const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const ExcelJS = require("exceljs");

// تنظیم توکن ربات تلگرام و ایجاد ربات
const token = "8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs";
const bot = new TelegramBot(token, { polling: true });

// تابع برای پردازش داده‌ها از فایل Excel
async function processExcelFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);  // فرض کنید داده‌ها در اولین شیت هستند
  
  let message = "";

  // پردازش هر ردیف از داده‌ها
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) { // نادیده گرفتن ردیف اول (سرفصل‌ها)
      const persianName = row.getCell(1).text; // نام فارسی
      const englishName = row.getCell(2).text; // نام انگلیسی
      const country = row.getCell(3).text; // کشور
      const link = row.getCell(4).text; // لینک

      message += `✅ ${persianName} (${englishName}) - ${country} 👇\n⬇️ <a href="${link}">${englishName}</a>\n\n`;
    }
  });

  return message;
}

// هنگامی که ربات فایل اکسل را دریافت می‌کند
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  try {
    // دریافت فایل
    const file = await bot.getFile(fileId);
    const filePath = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    // بارگذاری فایل و پردازش داده‌ها
    const fileDownload = await fetch(filePath).then(res => res.buffer());
    fs.writeFileSync("data.xlsx", fileDownload); // ذخیره فایل به صورت محلی

    const message = await processExcelFile("data.xlsx");

    // ارسال پیام‌های پردازش شده
    bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error processing file:", error.message);
    bot.sendMessage(chatId, "❌ خطایی در پردازش فایل رخ داد. لطفا دوباره تلاش کنید.");
  }
});
