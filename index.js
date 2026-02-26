const express = require("express");
const { Telegraf, Markup } = require("telegraf");

// =====================
// ENV CHECK
// =====================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN yo‘q!");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const CHANNEL = process.env.CHANNEL;
const ADMIN_ID = Number(process.env.ADMIN_ID);

// =====================
// EXPRESS (RENDER UCHUN MUHIM)
// =====================
const app = express();

// Render PORT beradi!
const PORT = process.env.PORT;

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
  } catch (err) {
    console.log("Subscription error:", err.message);
    return false;
  }
}

// =====================
// START
// =====================
bot.start(async (ctx) => {
  const ok = await isSubscribed(ctx);

  if (!ok) {
    return ctx.reply(
      "🔒 Botdan foydalanish uchun kanalga obuna bo‘ling.",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "📢 Kanal",
            `https://t.me/${CHANNEL?.replace("@", "")}`
          )
        ],
        [Markup.button.callback("🔄 Tekshirish", "check_sub")]
      ])
    );
  }

  ctx.reply(
    "💎 <b>PRO BOT</b>\n\nMenyuni tanlang:",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("➕ E’lon joylash", "new_ad")]
      ])
    }
  );
});

// =====================
// CHECK BUTTON
// =====================
bot.action("check_sub", async (ctx) => {
  const ok = await isSubscribed(ctx);

  if (!ok) return ctx.answerCbQuery("❌ Obuna yo‘q");

  ctx.answerCbQuery("✅ Tasdiqlandi");
  ctx.reply("🚀 /start bosing");
});

// =====================
// SIMPLE AD FLOW
// =====================
const sessions = new Map();

bot.action("new_ad", (ctx) => {
  sessions.set(ctx.from.id, { step: "photo" });
  ctx.answerCbQuery();
  ctx.reply("📸 Rasm yuboring:");
});

bot.on("photo", (ctx) => {
  const session = sessions.get(ctx.from.id);
  if (!session || session.step !== "photo") return;

  session.photo = ctx.message.photo.at(-1).file_id;
  session.step = "model";

  ctx.reply("📱 Model yozing:");
});

bot.on("text", async (ctx) => {
  const session = sessions.get(ctx.from.id);
  if (!session) return;

  const text = ctx.message.text.trim();

  if (session.step === "model") {
    session.model = text;
    session.step = "price";
    return ctx.reply("💰 Narx yozing:");
  }

  if (session.step === "price") {
    if (!/^\d+$/.test(text))
      return ctx.reply("❌ Narx faqat raqam bo‘lsin");

    session.price = text;

    if (ADMIN_ID) {
      await ctx.telegram.sendPhoto(
        ADMIN_ID,
        session.photo,
        {
          caption:
            `📱 ${session.model}\n\n` +
            `💰 ${session.price}`
        }
      );
    }

    ctx.reply("✅ E’lon yuborildi!");
    sessions.delete(ctx.from.id);
  }
});

// =====================
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log("💎 RENDER READY BOT");