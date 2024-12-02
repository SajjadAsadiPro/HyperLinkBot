const { Telegraf } = require('telegraf');
const ExcelJS = require('exceljs');
const fetch = require('node-fetch');

const bot = new Telegraf('8085649416:AAHI2L0h8ncv5zn4uaus4VrbRcF9btCcBTs');

// متغیر برای شمارش تعداد پردازش‌ها
let processCount = 0;

// دستور استارت برای ارسال پیام
bot.start(async (ctx) => {
  processCount++; // افزایش شمارنده
  const startMessage = `🚀 ربات در حال اجراست. تعداد پردازش‌ها: ${processCount}`;
  const message = await ctx.reply(startMessage); // ارسال پیام استارت
  bot.context.startMessageId = message.message_id; // ذخیره ID پیام برای ویرایش در آینده
});

// زمانی که فایل دریافت می‌شود
bot.on('document', async (ctx) => {
  try {
    const fileId = ctx.message.document.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const filePath = fileLink.href;
    const response = await fetch(filePath);
    const buffer = await response.buffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const data = [];
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex > 1) {
        const rowData = {
          nameFarsi: row.getCell(1).value,
          nameEnglish: row.getCell(2).value,
          country: row.getCell(3).value,
          year: row.getCell(4).value, // سال تولید
          link: row.getCell(5).value, // لینک
        };
        data.push(rowData);
      }
    });

    let message = '';
    let counter = 1;

    for (let row of data) {
      // بررسی لینک و استفاده از آن
      let linkText = row.link ? row.link : ''; // اگر لینک نباشد، لینک خالی
      let linkMarkup = linkText ? `[${row.nameEnglish}](${linkText})` : row.nameEnglish; // اگر لینک باشد، هایپرلینک کنیم

      // ساخت پیام با استفاده از فرمت دلخواه
      message += `${counter}. ${row.nameFarsi} - ${row.country} ${row.year || ""} ⬇️⬇️⬇️\n`;
      message += `${linkMarkup}\n\n`;
      counter++;

      // ارسال پیام پس از هر 40 فیلم
      if (counter % 40 === 0) {
        await ctx.reply(message);
        message = ''; // پاک کردن پیام برای شروع پیام جدید
      }
    }

    // ارسال پیام باقی‌مانده
    if (message !== '') {
      await ctx.reply(message);
    }

    // ویرایش پیام استارت
    processCount++; // افزایش شمارنده
    await ctx.telegram.editMessageText(ctx.chat.id, bot.context.startMessageId, null, `🚀 ربات در حال اجراست. تعداد پردازش‌ها: ${processCount}`);

  } catch (error) {
    console.error('خطا در پردازش فایل:', error);
    ctx.reply('❌ خطایی در پردازش فایل رخ داد. لطفاً دوباره تلاش کنید.');
  }
});

bot.launch();
