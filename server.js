const { Telegraf } = require("telegraf");
const ExcelJS = require("exceljs");
const fs = require("fs");
const fetch = require("node-fetch"); // اطمینان از نصب این کتابخانه در پروژه

const bot = new Telegraf("YOUR_BOT_API_KEY");

bot.on("document", async (ctx) => {
  try {
    console.log("Document received:", ctx.message.document.file_id); // برای بررسی فایل دریافتی

    const fileId = ctx.message.document.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    console.log("File link:", fileLink.href); // بررسی لینک فایل

    const filePath = fileLink.href;
    const response = await fetch(filePath);
    const buffer = await response.buffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    console.log("Worksheet loaded successfully");

    const data = [];
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex > 1) {
        const rowData = {
          nameFarsi: row.getCell(1).value,
          nameEnglish: row.getCell(2).value,
          country: row.getCell(3).value,
          link: row.getCell(4).value,
        };
        data.push(rowData);
      }
    });

    console.log("Data extracted:", data); // بررسی داده‌های استخراج‌شده

    if (data.length === 0) {
      return ctx.reply("❌ داده‌ای برای پردازش پیدا نشد.");
    }

    for (let row of data) {
      try {
        const message = `${row.nameFarsi} (${row.nameEnglish}) از کشور ${row.country} - [لینک]( ${row.link} )`;
        await ctx.reply(message);
      } catch (error) {
        console.error("خطا در پردازش ردیف:", row, error);
        ctx.reply("❌ خطایی در پردازش برخی داده‌ها رخ داد.");
      }
    }
  } catch (error) {
    console.error("خطای کل در پردازش فایل:", error);
    ctx.reply("❌ خطایی در پردازش فایل رخ داد. لطفاً دوباره تلاش کنید.");
  }
});

bot.launch();
