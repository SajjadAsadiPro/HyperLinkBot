// دریافت فایل اکسل از کاربر
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  if (isPaused) {
    bot.sendMessage(chatId, "⏸️ ربات متوقف است. لطفاً با دستور /resume آن را فعال کنید.");
    return;
  }

  try {
    // دانلود فایل اکسل
    console.log("در حال دانلود فایل از تلگرام...");
    const file = await bot.getFile(fileId);
    const filePath = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const fileResponse = await axios.get(filePath, { responseType: "arraybuffer" });
    
    // ذخیره فایل اکسل به صورت موقت
    const fileName = `temp_${file.document.file_name}`;
    fs.writeFileSync(fileName, fileResponse.data);
    console.log("فایل اکسل دانلود شد و ذخیره گردید.");

    // خواندن داده‌ها از فایل اکسل
    const workbook = xlsx.readFile(fileName);
    const sheet = workbook.Sheets[workbook.SheetNames[0]]; // فرض می‌کنیم اطلاعات در اولین شیت هستند
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    if (!jsonData || jsonData.length === 0) {
      throw new Error("داده‌های موجود در فایل اکسل خالی است یا به درستی استخراج نشده‌اند.");
    }

    console.log("داده‌ها از فایل اکسل خوانده شدند.");

    // استخراج داده‌ها از JSON
    const persianNames = [];
    const englishNames = [];
    const linksList = [];
    const countryNames = [];

    // فرض می‌کنیم سرتیترهای شما به این شکل باشند:
    const columns = {
      persian: "نام فارسی",
      english: "نام انگلیسی",
      link: "لینک در کانال",
      country: "کشور"
    };

    jsonData.forEach((row) => {
      persianNames.push(row[columns.persian]);
      englishNames.push(row[columns.english]);
      linksList.push(row[columns.link]);
      countryNames.push(row[columns.country]);
    });

    // ارسال اطلاعات به کاربر
    let message = "";
    for (let i = 0; i < englishNames.length; i++) {
      const name = englishNames[i];
      try {
        const response = await axios.get(
          `http://www.omdbapi.com/?t=${name}&apikey=${OMDB_API_KEY}`
        );
        const data = response.data;

        const releaseYear = data.Response === "True" ? data.Year || "Unknown Year" : "No Data";

        message += `✅ ${i + 1} ${persianNames[i]} (${releaseYear}) ${countryNames[i]} 👇 👇 👇\n⬇️ <a href="${linksList[i]}">${name}</a>\n\n`;
      } catch (error) {
        console.error(`Error fetching data for ${name}:`, error.message);
        message += `❌ ${i + 1} ${persianNames[i]} - خطا در دریافت اطلاعات.\n\n`;
      }
    }

    // ارسال نتیجه به صورت تقسیم‌شده
    await sendMessageInChunks(chatId, message, bot, 150); // هر پیام شامل 150 خط

    // حذف فایل موقت بعد از استفاده
    fs.unlinkSync(fileName);
  } catch (error) {
    console.error("Error processing file:", error.message);
    bot.sendMessage(chatId, `❌ خطایی در پردازش فایل رخ داد: ${error.message}. لطفا دوباره تلاش کنید.`);
  }
});
