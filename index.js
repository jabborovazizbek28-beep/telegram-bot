const { Telegraf, Markup, session } = require("telegraf");

const bot = new Telegraf("YOUR_BOT_TOKEN");

const CHANNEL = "@Telefon_bozor_Qarshi_n1";
const ADMIN_ID = 123456789;

bot.use(session());

// START
bot.start((ctx) => {
  ctx.session = {};
  ctx.reply("📸 E’lon joylash uchun rasm yuboring.");
});

// RASM
bot.on("photo", (ctx) => {
  ctx.session.photo =
    ctx.message.photo[ctx.message.photo.length - 1].file_id;

  ctx.reply("💰 Endi narxni yozing.");
});

// TEXT (narx + telefon)
bot.on("text", async (ctx) => {

  if (!ctx.session.photo) return;

  // Narx
  if (!ctx.session.price) {
    ctx.session.price = ctx.message.text;
    return ctx.reply("📞 Endi telefon raqamingizni yozing.");
  }

  // Telefon
  if (!ctx.session.phone) {

    const phone = ctx.message.text;

    if (!/^\+?\d{9,15}$/.test(phone)) {
      return ctx.reply("❌ Telefon noto‘g‘ri formatda.");
    }

    ctx.session.phone = phone;

    // Admin ga yuborish
    await ctx.telegram.sendPhoto(
      ADMIN_ID,
      ctx.session.photo,
      {
        caption:
          `📢 YANGI ELON\n\n` +
          `💰 Narx: ${ctx.session.price}\n` +
          `📞 Telefon: ${ctx.session.phone}\n\n` +
          `👤 @${ctx.from.username || "yo'q"}`,
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "✅ Tasdiqlash",
              `approve_${ctx.chat.id}_${ctx.message.message_id}`
            ),
            Markup.button.callback("❌ Bekor", "reject")
          ]
        ])
      }
    );

    ctx.reply("⏳ E’lon admin tasdig‘ini kutmoqda.");

    ctx.session = {};
  }
});

// TASDIQLASH
bot.action(/approve_(.+)_(.+)/, async (ctx) => {

  const chatId = ctx.match[1];

  const phone = ctx.session?.phone;
  const price = ctx.session?.price;
  const photo = ctx.session?.photo;

  await ctx.telegram.sendPhoto(
    CHANNEL,
    photo,
    {
      caption:
        `💰 ${price}\n\n` +
        `📞 Aloqa: ${phone}`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📩 Bog‘lanish",
              url: `https://t.me/${ctx.from.username || ""}`
            }
          ]
        ]
      }
    }
  );

  ctx.reply("✅ Kanalga joylandi");
});

// BEKOR
bot.action("reject", (ctx) => {
  ctx.reply("❌ Bekor qilindi");
});

bot.launch();
console.log("🚀 Professional bot ishlayapti");



professional darajada qil