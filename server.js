const { Telegraf } = require("telegraf");
const ExcelJS = require("exceljs");
const fetch = require("node-fetch"); // اطمینان از نصب این کتابخانه در پروژه

const bot = new Telegraf("8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs");

// تابع برای فرار دادن کاراکترهای خاص MarkdownV2
function escapeMarkdownV2(text) {
  if (typeof text !== "string") {
    return text; // اگر داده از نوع رشته نبود، بدون تغییر بازگشت می‌دهد
  }
  return text.replace(/([\\`*_\[\](){}#+\-.!])/g, '\\$1');
}

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

        // اگر فیلدها خالی باشند، ردیف را نادیده می‌گیریم
        if (rowData.nameFarsi && rowData.nameEnglish && rowData.link) {
          data.push(rowData);
        }
      }
    });

    console.log("Data extracted:", data); // بررسی داده‌های استخراج‌شده

    if (data.length === 0) {
      return ctx.reply("❌ داده‌ای برای پردازش پیدا نشد.");
    }

    // ارسال نتایج در قالب مورد نظر
    let messages = [];
    let count = 1;

    for (let row of data) {
      try {
        // تصحیح لینک: اطمینان از اینکه row.link یک رشته است
        const link = String(row.link); 

        const message = `
${count}. ${row.nameFarsi} ${row.country} ${new Date().getFullYear()} ⬇️⬇️⬇️
[${row.nameEnglish}](${link})`;

        messages.push(message);
        count++;

        // اگر تعداد 40 پیام رسید، ارسال می‌کنیم و بعد از آن ادامه می‌دهیم
        if (messages.length === 40) {
          await ctx.reply(messages.join("\n\n"));
          messages = []; // پاک کردن پیام‌ها برای ارسال بعدی
        }
      } catch (error) {
        console.error("خطا در پردازش ردیف:", row, error);
        ctx.reply("❌ خطایی در پردازش برخی داده‌ها رخ داد.");
      }
    }

    // ارسال پیام‌های باقی‌مانده
    if (messages.length > 0) {
      await ctx.reply(messages.join("\n\n"));
    }
  } catch (error) {
    console.error("خطای کل در پردازش فایل:", error);
    ctx.reply("❌ خطایی در پردازش فایل رخ داد. لطفاً دوباره تلاش کنید.");
  }
});

bot.launch();
