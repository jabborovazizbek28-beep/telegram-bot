require("dotenv").config();

const { Telegraf, Markup, session } = require("telegraf");

const token = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL;
const ADMIN_ID = Number(process.env.ADMIN_ID);

if (!token) {
  console.error("❌ BOT_TOKEN topilmadi!");
  process.exit(1);
}

const bot = new Telegraf(token);
bot.use(session());

bot.catch((err) => {
  console.error("🚨 Bot xatosi:", err);
});

bot.start((ctx) => {
  ctx.session = {};
  ctx.reply("📸 E’lon joylash uchun rasm yuboring.");
});

// RASM
bot.on("photo", (ctx) => {
  ctx.session.photo = ctx.message.photo.at(-1).file_id;
  ctx.reply("💰 Endi narxni yozing.");
});

// TEXT FLOW
bot.on("text", async (ctx) => {
  if (!ctx.session.photo) return;

  if (!ctx.session.price) {
    ctx.session.price = ctx.message.text;
    return ctx.reply("📞 Telefon raqamingizni yozing.");
  }

  if (!ctx.session.phone) {
    const phone = ctx.message.text;

    if (!/^\+?\d{9,15}$/.test(phone)) {
      return ctx.reply("❌ Telefon noto‘g‘ri formatda.");
    }

    ctx.session.phone = phone;

    const data = Buffer.from(
      JSON.stringify({
        photo: ctx.session.photo,
        price: ctx.session.price,
        phone: ctx.session.phone
      })
    ).toString("base64");

    await ctx.telegram.sendPhoto(
      ADMIN_ID,
      ctx.session.photo,
      {
        caption:
          `📢 YANGI ELON\n\n` +
          `💰 Narx: ${ctx.session.price}\n` +
          `📞 Telefon: ${ctx.session.phone}\n` +
          `👤 @${ctx.from.username || "yo'q"}`,
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Tasdiqlash", `approve_${data}`),
            Markup.button.callback("❌ Bekor", `reject`)
          ]
        ])
      }
    );

    ctx.reply("⏳ E’lon admin tasdig‘ini kutmoqda.");
    ctx.session = {};
  }
});

// TASDIQLASH
bot.action(/approve_(.+)/, async (ctx) => {

  const decoded = JSON.parse(
    Buffer.from(ctx.match[1], "base64").toString()
  );

  await ctx.telegram.sendPhoto(
    CHANNEL,
    decoded.photo,
    {
      caption:
        `💰 ${decoded.price}\n\n` +
        `📞 Aloqa: ${decoded.phone}`
    }
  );

  await ctx.answerCbQuery("Kanalga joylandi ✅");
  ctx.editMessageReplyMarkup();
});

// BEKOR
bot.action("reject", async (ctx) => {
  await ctx.answerCbQuery("Bekor qilindi ❌");
  ctx.editMessageReplyMarkup();
});

bot.launch();
console.log("🚀 Professional bot ishga tushdi");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));