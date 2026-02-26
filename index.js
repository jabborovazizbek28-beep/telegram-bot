require("dotenv").config();

const express = require("express");
const { Telegraf, Markup } = require("telegraf");

// =============================
// ENV CHECK
// =============================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi!");
  process.exit(1);
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL = process.env.CHANNEL;
const ADMIN_ID = Number(process.env.ADMIN_ID);

const bot = new Telegraf(BOT_TOKEN);

// =============================
// EXPRESS (RENDER WEB SERVICE)
// =============================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("🚀 BOT ONLINE");
});

app.listen(PORT, () => {
  console.log("🌍 Server port:", PORT);
});

// =============================
// SUBSCRIPTION CHECK
// =============================
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

async function requireSubscription(ctx, next) {
  const ok = await isSubscribed(ctx);

  if (!ok) {
    return ctx.reply(
      "🔒 Botdan foydalanish uchun kanalga obuna bo‘ling:",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "📢 Kanalga o‘tish",
            `https://t.me/${CHANNEL?.replace("@", "")}`
          )
        ],
        [Markup.button.callback("🔄 Tekshirish", "check_sub")]
      ])
    );
  }

  return next();
}

// =============================
// START
// =============================
bot.start(requireSubscription, (ctx) => {
  ctx.reply(
    "💎 <b>PRO MARKET BOT</b>\n\nMenyuni tanlang:",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("➕ E’lon joylash", "new_ad")]
      ])
    }
  );
});

// =============================
// CHECK SUB BUTTON
// =============================
bot.action("check_sub", async (ctx) => {
  const ok = await isSubscribed(ctx);

  if (!ok) return ctx.answerCbQuery("❌ Obuna yo‘q");

  ctx.answerCbQuery("✅ Tasdiqlandi");
});

// =============================
// NEW AD FLOW
// =============================
const sessions = new Map();

bot.action("new_ad", requireSubscription, (ctx) => {
  sessions.set(ctx.from.id, { step: "photo" });
  ctx.answerCbQuery();
  ctx.reply("📸 Rasm yuboring:");
});

// =============================
// PHOTO
// =============================
bot.on("photo", (ctx) => {
  const session = sessions.get(ctx.from.id);
  if (!session || session.step !== "photo") return;

  session.photo = ctx.message.photo.at(-1).file_id;
  session.step = "model";

  ctx.reply("📱 Model yozing:");
});

// =============================
// TEXT FLOW
// =============================
bot.on("text", async (ctx) => {
  const session = sessions.get(ctx.from.id);
  if (!session) return;

  const text = ctx.message.text.trim();

  if (session.step === "model") {
    session.model = text;
    session.step = "description";
    return ctx.reply("📝 Tavsif yozing:");
  }

  if (session.step === "description") {
    session.description = text;
    session.step = "price";
    return ctx.reply("💰 Narx yozing:");
  }

  if (session.step === "price") {
    if (!/^\d+$/.test(text))
      return ctx.reply("❌ Narx faqat raqam bo‘lsin");

    session.price = text;

    // Admin ga yuborish
    if (ADMIN_ID) {
      await ctx.telegram.sendPhoto(
        ADMIN_ID,
        session.photo,
        {
          caption:
            `📱 ${session.model}\n\n` +
            `📝 ${session.description}\n\n` +
            `💰 ${session.price}`,
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ Publish", "publish"),
              Markup.button.callback("❌ Reject", "reject")
            ]
          ])
        }
      );
    }

    ctx.reply("⏳ Admin tasdig‘ini kutmoqda...");
    sessions.delete(ctx.from.id);
  }
});

// =============================
// ERROR HANDLER
// =============================
bot.catch((err) => {
  console.error("🚨 Error:", err);
});

// =============================
// START BOT
// =============================
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log("💎 FINAL PRO SYSTEM READY");