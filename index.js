require("dotenv").config();
const { Telegraf, Markup, session } = require("telegraf");
const express = require("express");

// =====================
// ENV CHECK
// =====================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN yo‘q");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const CHANNEL = process.env.CHANNEL;

// =====================
// EXPRESS SERVER (MUHIM)
// =====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🚀 Bot ishlayapti");
});

app.listen(PORT, () => {
  console.log("🌍 Server port:", PORT);
});

// =====================
// SUBSCRIPTION CHECK
// =====================
async function isSubscribed(ctx) {
  if (!CHANNEL) return true;

  try {
    const member = await ctx.telegram.getChatMember(
      CHANNEL,
      ctx.from.id
    );

    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

async function requireSub(ctx, next) {
  const ok = await isSubscribed(ctx);

  if (!ok) {
    return ctx.reply(
      "🔒 Kanalga obuna bo‘ling:",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "📢 Kanal",
            `https://t.me/${CHANNEL.replace("@", "")}`
          )
        ],
        [Markup.button.callback("🔄 Tekshirish", "check")]
      ])
    );
  }

  return next();
}

// =====================
// START
// =====================
bot.start(requireSub, (ctx) => {
  ctx.session = {};

  ctx.reply(
    "💎 ULTRA MARKETPLACE",
    Markup.inlineKeyboard([
      [Markup.button.callback("➕ E’lon joylash", "create")]
    ])
  );
});

// =====================
// CREATE
// =====================
bot.action("create", requireSub, (ctx) => {
  ctx.session = { step: "photo" };
  ctx.answerCbQuery();
  ctx.reply("📸 Rasm yuboring:");
});

// =====================
// PHOTO
// =====================
bot.on("photo", (ctx) => {
  if (!ctx.session || ctx.session.step !== "photo") return;

  ctx.session.photo = ctx.message.photo.at(-1).file_id;
  ctx.session.step = "model";

  ctx.reply("📱 Model yozing:");
});

// =====================
// TEXT FLOW
// =====================
bot.on("text", (ctx) => {
  if (!ctx.session || !ctx.session.step) return;

  const text = ctx.message.text.trim();

  if (ctx.session.step === "model") {
    ctx.session.model = text;
    ctx.session.step = "description";
    return ctx.reply("📝 Tavsif yozing:");
  }

  if (ctx.session.step === "description") {
    ctx.session.description = text;
    ctx.session.step = "price";
    return ctx.reply("💰 Narx yozing:");
  }

  if (ctx.session.step === "price") {
    if (!/^\d+$/.test(text))
      return ctx.reply("❌ Narx faqat raqam bo‘lsin");

    ctx.reply("✅ E’lon qabul qilindi!");

    ctx.session = {};
  }
});

// =====================
// ERROR HANDLER
// =====================
bot.catch((err) => {
  console.error("🚨 Xato:", err);
});

// =====================
// START BOT
// =====================
bot.launch();

console.log("💎 WEB SERVICE BOT READY");