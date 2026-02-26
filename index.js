const express = require("express");
const { Telegraf, Markup } = require("telegraf");

// =====================
// ENV CHECK
// =====================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi!");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const CHANNEL = process.env.CHANNEL; // optional

// =====================
// EXPRESS (RENDER)
// =====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("📱 TELEFON ELON BOT ISHLAYAPTI");
});

app.listen(PORT, () => {
  console.log("🌍 Server port:", PORT);
});

// =====================
// MEMORY
// =====================
const sessions = {};

// =====================
// START
// =====================
bot.start((ctx) => {
  sessions[ctx.from.id] = {};

  ctx.reply(
    "📱 <b>Telefon E’lon Bot</b>\n\n" +
    "➕ Yangi e’lon joylash uchun pastdagi tugmani bosing.",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("➕ E’lon joylash", "new_ad")]
      ])
    }
  );
});

// =====================
// NEW AD
// =====================
bot.action("new_ad", (ctx) => {
  sessions[ctx.from.id] = { step: "photo" };
  ctx.answerCbQuery();
  ctx.reply("📸 Telefon rasmini yuboring:");
});

// =====================
// PHOTO
// =====================
bot.on("photo", (ctx) => {
  const session = sessions[ctx.from.id];
  if (!session || session.step !== "photo") return;

  session.photo = ctx.message.photo.at(-1).file_id;
  session.step = "model";

  ctx.reply("📱 Telefon modelini yozing:");
});

// =====================
// TEXT FLOW
// =====================
bot.on("text", async (ctx) => {
  const session = sessions[ctx.from.id];
  if (!session) return;

  const text = ctx.message.text.trim();

  if (session.step === "model") {
    session.model = text;
    session.step = "description";
    return ctx.reply("📝 Telefon haqida tavsif yozing:");
  }

  if (session.step === "description") {
    session.description = text;
    session.step = "price";
    return ctx.reply("💰 Narx yozing (faqat raqam):");
  }

  if (session.step === "price") {
    if (!/^\d+$/.test(text))
      return ctx.reply("❌ Narx faqat raqam bo‘lsin");

    session.price = text;

    // Kanalga yuborish (agar CHANNEL bo‘lsa)
    if (CHANNEL) {
      await ctx.telegram.sendPhoto(
        CHANNEL,
        session.photo,
        {
          caption:
            `📱 <b>${session.model}</b>\n\n` +
            `📝 ${session.description}\n\n` +
            `💰 ${session.price} so‘m`,
          parse_mode: "HTML"
        }
      );
    }

    ctx.reply("✅ E’lon joylandi!");
    sessions[ctx.from.id] = {};
  }
});

// =====================
bot.launch();
console.log("🚀 TELEFON ELON BOT READY");