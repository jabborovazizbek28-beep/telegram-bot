require("dotenv").config()

const { Telegraf, Markup, session } = require("telegraf")

const bot = new Telegraf(process.env.BOT_TOKEN)

const ADMIN_ID = 6952175243
const ADS_CHANNEL = "@Telefon_bozor_Qarshi_n1"

bot.use(session())

const pendingAds = new Map()

// ================= START =================
bot.start(async (ctx) => {
    await ctx.reply(
        "🚀 Xush kelibsiz!",
        Markup.inlineKeyboard([
            [Markup.button.callback("📢 E’lon berish", "create")],
            [Markup.button.callback("👤 Profil", "profile")]
        ])
    )
})

// ================= CREATE =================
bot.action("create", async (ctx) => {
    await ctx.answerCbQuery()

    ctx.session.creating = true

    await ctx.reply("📩 E’lon matnini yuboring:")
})

// ================= TEXT =================
bot.on("text", async (ctx) => {
    if (!ctx.session.creating) return

    ctx.session.creating = false

    const adId = Date.now()

    pendingAds.set(adId, {
        userId: ctx.from.id,
        name: ctx.from.first_name,
        text: ctx.message.text,
        likes: 0,
        views: 0
    })

    await bot.telegram.sendMessage(
        ADMIN_ID,
        `📢 Yangi e’lon:\n\n${ctx.message.text}`,
        Markup.inlineKeyboard([
            [
                Markup.button.callback("✅ Tasdiqlash", `approve_${adId}`),
                Markup.button.callback("❌ Rad etish", `reject_${adId}`)
            ]
        ])
    )

    await ctx.reply("⏳ E’lon adminga yuborildi.")
})

// ================= APPROVE =================
bot.action(/approve_(.+)/, async (ctx) => {
    await ctx.answerCbQuery()

    if (ctx.from.id !== ADMIN_ID)
        return ctx.answerCbQuery("⛔ Siz admin emassiz")

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    await bot.telegram.sendMessage(
        ADS_CHANNEL,
        `📢 YANGI E’LON\n\n${ad.text}\n\n👤 ${ad.name}`,
        Markup.inlineKeyboard([
            [
                Markup.button.callback("❤️ Like", `like_${adId}`)
            ]
        ])
    )

    pendingAds.delete(adId)

    await ctx.editMessageText("✅ Tasdiqlandi")
})

// ================= REJECT =================
bot.action(/reject_(.+)/, async (ctx) => {
    await ctx.answerCbQuery()

    if (ctx.from.id !== ADMIN_ID)
        return ctx.answerCbQuery("⛔ Siz admin emassiz")

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    await bot.telegram.sendMessage(ad.userId, "❌ E’lon rad etildi.")

    pendingAds.delete(adId)

    await ctx.editMessageText("❌ Rad etildi")
})

// ================= LIKE =================
bot.action(/like_(.+)/, async (ctx) => {
    await ctx.answerCbQuery("❤️ Yoqdi")
})

// ================= PROFILE =================
bot.action("profile", async (ctx) => {
    await ctx.answerCbQuery()

    await ctx.reply(`👤 Sizning ID: ${ctx.from.id}`)
})

// ================= ERROR HANDLER =================
bot.catch((err) => {
    console.log("XATO:", err)
})

// ================= START BOT =================
bot.launch()

console.log("🚀 Bot ishga tushdi")

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))