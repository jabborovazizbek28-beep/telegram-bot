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

const CHANNEL = process.env.CHANNEL;   // @channel
const ADMIN_ID = Number(process.env.ADMIN_ID);

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// WEB SERVER (RENDER)
// =====================
app.get("/", (req, res) => {
  res.send("🚀 FINAL PRO BOT ONLINE");
});

app.listen(PORT, () => {
  console.log("🌍 Server port:", PORT);
});

// =====================
// MEMORY STORAGE
// =====================
const ads = new Map();
const sessions = new Map();

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
        [Markup.button.callback("🔄 Tekshirish", "check_sub")]
      ])
    );
  }

  return next();
}

// =====================
// START
// =====================
bot.start(requireSub, (ctx) => {
  sessions.set(ctx.from.id, {});

  ctx.reply(
    "📱 <b>TELEFON MARKET</b>",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("➕ E’lon joylash", "new_ad")]
      ])
    }
  );
});

// =====================
// CHECK SUB BUTTON
// =====================
bot.action("check_sub", async (ctx) => {
  const ok = await isSubscribed(ctx);

  if (!ok) return ctx.answerCbQuery("❌ Hali obuna yo‘q");

  ctx.answerCbQuery("✅ Tasdiqlandi");
});

// =====================
// NEW AD
// =====================
bot.action("new_ad", requireSub, (ctx) => {
  sessions.set(ctx.from.id, { step: "photo" });
  ctx.answerCbQuery();
  ctx.reply("📸 Telefon rasmini yuboring:");
});

// =====================
// PHOTO
// =====================
bot.on("photo", (ctx) => {
  const session = sessions.get(ctx.from.id);
  if (!session || session.step !== "photo") return;

  session.photo = ctx.message.photo.at(-1).file_id;
  session.step = "model";

  ctx.reply("📱 Model yozing:");
});

// =====================
// TEXT FLOW
// =====================
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

    const adId = Date.now().toString();

    ads.set(adId, {
      ...session,
      userId: ctx.from.id,
      likes: 0
    });

    // ADMIN TASDIQLASH
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
              Markup.button.callback("✅ Publish", `publish_${adId}`),
              Markup.button.callback("❌ Reject", `reject_${adId}`)
            ]
          ])
        }
      );
    }

    ctx.reply("⏳ Admin tasdig‘ini kutmoqda...");
    sessions.delete(ctx.from.id);
  }
});

// =====================
// ADMIN APPROVE
// =====================
bot.action(/publish_(.+)/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID)
    return ctx.answerCbQuery("❌ Ruxsat yo‘q");

  const ad = ads.get(ctx.match[1]);
  if (!ad) return;

  await ctx.telegram.sendPhoto(
    CHANNEL,
    ad.photo,
    {
      caption:
        `📱 ${ad.model}\n\n` +
        `📝 ${ad.description}\n\n` +
        `💰 ${ad.price}\n\n` +
        `❤️ ${ad.likes}`,
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❤️ Like", `like_${ctx.match[1]}`)]
      ])
    }
  );

  ctx.answerCbQuery("✅ Published");
});

// =====================
// LIKE SYSTEM
// =====================
bot.action(/like_(.+)/, (ctx) => {
  const ad = ads.get(ctx.match[1]);
  if (!ad) return;

  ad.likes++;
  ctx.answerCbQuery("❤️ Yoqdi!");
});

// =====================
bot.catch((err) => {
  console.error("🚨 ERROR:", err);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.launch();
console.log("💎 FINAL PRO SYSTEM READY");