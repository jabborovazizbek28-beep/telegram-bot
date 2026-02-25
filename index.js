const { Telegraf, Markup, session } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

const CHANNEL = "@Telefon_bozor_Qarshi_n1";
const ADMIN_ID = 6952175243;

bot.use(session());

// Har user uchun vaqtinchalik saqlash
const posts = new Map();

bot.start((ctx) => {
  ctx.session = { photos: [] };
  ctx.reply("📸 Rasm yuboring. Tugatgach /done yozing.");
});

// Ko‘p rasm
bot.on("photo", (ctx) => {
  if (!ctx.session.photos) ctx.session.photos = [];

  const fileId =
    ctx.message.photo[ctx.message.photo.length - 1].file_id;

  ctx.session.photos.push(fileId);

  ctx.reply("✅ Rasm qo‘shildi.");
});

// Tugatish
bot.command("done", (ctx) => {
  if (!ctx.session.photos.length)
    return ctx.reply("❌ Rasm yo‘q.");

  ctx.session.step = "price";
  ctx.reply("💰 Narx yozing.");
});

// Text bosqich
bot.on("text", async (ctx) => {
  if (ctx.session.step === "price") {
    ctx.session.price = ctx.message.text;
    ctx.session.step = "phone";
    return ctx.reply("📞 Telefon yozing.");
  }

  if (ctx.session.step === "phone") {
    const phone = ctx.message.text;

    if (!/^\+?\d{9,15}$/.test(phone)) {
      return ctx.reply("❌ Telefon noto‘g‘ri.");
    }

    ctx.session.phone = phone;

    const id = Date.now().toString();

    posts.set(id, { ...ctx.session });

    await ctx.telegram.sendMessage(
      ADMIN_ID,
      `📢 Yangi e’lon\n💰 ${ctx.session.price}\n📞 ${phone}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Tasdiqlash", `approve_${id}`),
          Markup.button.callback("❌ Bekor", `reject_${id}`)
        ]
      ])
    );

    ctx.reply("⏳ Admin tasdiqlashi kutilmoqda.");

    ctx.session = {};
  }
});

// Tasdiqlash
bot.action(/approve_(.+)/, async (ctx) => {
  const id = ctx.match[1];
  const data = posts.get(id);

  if (!data) return;

  const media = data.photos.map((fileId, index) => ({
    type: "photo",
    media: fileId,
    caption:
      index === 0
        ? `💰 Narx: ${data.price}\n📞 Aloqa: ${data.phone}`
        : undefined
  }));

  await ctx.telegram.sendMediaGroup(CHANNEL, media);

  posts.delete(id);

  ctx.reply("✅ Kanalga joylandi.");
});

// Bekor
bot.action(/reject_(.+)/, (ctx) => {
  const id = ctx.match[1];
  posts.delete(id);
  ctx.reply("❌ Bekor qilindi.");
});

bot.launch();
console.log("🚀 Professional bot ishlayapti");