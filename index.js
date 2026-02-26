const express = require("express");
const { Telegraf, Markup } = require("telegraf");

// =============================
// ENV CHECK
// =============================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi!");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const CHANNEL = process.env.CHANNEL; // optional

// =============================
// EXPRESS (RENDER WEB SERVICE)
// =============================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("🚀 PRO MAX v2 ONLINE");
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

async function requireSub(ctx, next) {
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

  return next();
}

// =============================
// START
// =============================
bot.start(requireSub, (ctx) => {
  ctx.reply(
    "🔥 <b>UNIVERSAL PRO MAX v2</b>\n\nAsosiy menyu:",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📌 Help", "help")],
        [Markup.button.callback("ℹ️ About", "about")]
      ])
    }
  );
});

// =============================
// HELP
// =============================
bot.action("help", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    "📖 Buyruqlar:\n\n/start - Boshlash\n/help - Yordam"
  );
});

// =============================
// ABOUT
// =============================
bot.action("about", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("🤖 Bu professional universal template.");
});

// =============================
// CHECK SUB
// =============================
bot.action("check_sub", async (ctx) => {
  const ok = await isSubscribed(ctx);

  if (!ok) return ctx.answerCbQuery("❌ Hali obuna yo‘q");

  ctx.answerCbQuery("✅ Tasdiqlandi");
});

// =============================
// ERROR HANDLER
// =============================
bot.catch((err) => {
  console.error("🚨 ERROR:", err);
});

// =============================
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.launch();

console.log("💎 PRO MAX v2 READY");