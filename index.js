require("dotenv").config();
const { Telegraf, Markup, session } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);
const CHANNEL = process.env.CHANNEL;
const ADMIN_ID = Number(process.env.ADMIN_ID);

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN yo‘q");
  process.exit(1);
}

bot.use(session());

const users = new Set();
const pendingAds = new Map();

/* =========================
   MAJBURIY OBUNA
========================= */

async function checkSub(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL, ctx.from.id);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

/* =========================
   START
========================= */

bot.start(async (ctx) => {
  users.add(ctx.from.id);

  const isSub = await checkSub(ctx);

  if (!isSub) {
    return ctx.reply(
      "❌ Botdan foydalanish uchun kanalga obuna bo‘ling!",
      Markup.inlineKeyboard([
        [Markup.button.url("📢 Kanal", `https://t.me/${CHANNEL.replace("@","")}`)],
        [Markup.button.callback("✅ Tekshirish", "check_sub")]
      ])
    );
  }

  ctx.session = {};
  ctx.reply("📸 E’lon joylash uchun rasm yuboring.");
});

bot.action("check_sub", async (ctx) => {
  const isSub = await checkSub(ctx);

  if (!isSub) {
    return ctx.answerCbQuery("❌ Hali obuna bo‘lmagansiz!", { show_alert: true });
  }

  await ctx.answerCbQuery("✅ Tasdiqlandi!");
  await ctx.editMessageText("📸 Endi rasm yuboring.");
});

/* =========================
   E’LON YARATISH
========================= */

bot.on("photo", (ctx) => {
  ctx.session.photo = ctx.message.photo.at(-1).file_id;
  ctx.reply("💰 Narxni yozing:");
});

bot.on("text", async (ctx, next) => {

  if (ctx.session.broadcast && ctx.from.id === ADMIN_ID) {
    for (let id of users) {
      try {
        await ctx.telegram.sendMessage(id, ctx.message.text);
      } catch {}
    }
    ctx.session.broadcast = false;
    return ctx.reply("✅ Barchaga yuborildi");
  }

  if (!ctx.session.photo) return next();

  if (!ctx.session.price) {
    ctx.session.price = ctx.message.text;
    return ctx.reply("📞 Telefon raqamingizni yozing:");
  }

  if (!ctx.session.phone) {

    const phone = ctx.message.text;

    if (!/^\+?\d{9,15}$/.test(phone)) {
      return ctx.reply("❌ Telefon noto‘g‘ri formatda.");
    }

    ctx.session.phone = phone;

    const adId = Date.now();

    pendingAds.set(adId, {
      photo: ctx.session.photo,
      price: ctx.session.price,
      phone: ctx.session.phone,
      user: ctx.from.username || "yo‘q"
    });

    await ctx.telegram.sendPhoto(
      ADMIN_ID,
      ctx.session.photo,
      {
        caption:
          `📢 Yangi e’lon\n\n` +
          `💰 ${ctx.session.price}\n` +
          `📞 ${ctx.session.phone}\n` +
          `👤 @${ctx.from.username || "yo‘q"}`,
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Tasdiqlash", `approve_${adId}`),
            Markup.button.callback("❌ Bekor", `reject_${adId}`)
          ]
        ])
      }
    );

    ctx.reply("⏳ E’lon admin tasdig‘ini kutmoqda.");
    ctx.session = {};
  }
});

/* =========================
   ADMIN TASDIQLASH
========================= */

bot.action(/approve_(.+)/, async (ctx) => {

  const adId = Number(ctx.match[1]);
  const ad = pendingAds.get(adId);

  if (!ad) return;

  await ctx.telegram.sendPhoto(
    CHANNEL,
    ad.photo,
    {
      caption:
        `💰 ${ad.price}\n\n` +
        `📞 ${ad.phone}`
    }
  );

  pendingAds.delete(adId);

  await ctx.answerCbQuery("Kanalga joylandi ✅");
  await ctx.editMessageReplyMarkup();
});

bot.action(/reject_(.+)/, async (ctx) => {
  const adId = Number(ctx.match[1]);
  pendingAds.delete(adId);

  await ctx.answerCbQuery("Rad etildi ❌");
  await ctx.editMessageReplyMarkup();
});

/* =========================
   ADMIN PANEL
========================= */

bot.command("admin", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  ctx.reply(
    "🎛 Admin panel",
    Markup.keyboard([
      ["📊 Statistika"],
      ["📢 Broadcast"]
    ]).resize()
  );
});

bot.hears("📊 Statistika", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  ctx.reply(`👥 Foydalanuvchilar: ${users.size}`);
});

bot.hears("📢 Broadcast", (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  ctx.session.broadcast = true;
  ctx.reply("Yuboriladigan xabarni yozing:");
});

/* ========================= */

bot.launch();
console.log("🚀 E’lon bot ishga tushdi");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));