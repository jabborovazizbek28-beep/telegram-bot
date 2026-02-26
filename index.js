require("dotenv").config()

const { Telegraf, Markup, session } = require("telegraf")
const express = require("express")

const bot = new Telegraf(process.env.BOT_TOKEN)

const app = express()
bot.use(session())

const ADMIN_ID = 6952175243
const CHANNEL = "@Telefon_bozor_Qarshi_n1"
const RENDER_URL = process.env.RENDER_URL

const pendingAds = new Map()
const adsStats = new Map()

// ================= START =================
bot.start((ctx) => {
    ctx.session.lang = ctx.session.lang || "uz"

    ctx.reply("🚀 Menu", Markup.inlineKeyboard([
        [Markup.button.callback("📢 E’lon", "create")],
        [Markup.button.callback("👤 Profil", "profile")],
        [Markup.button.callback("🌍 Til", "language")]
    ]))
})

// ================= LANGUAGE =================
bot.action("language", (ctx) => {
    ctx.reply("Tilni tanlang:", Markup.inlineKeyboard([
        [
            Markup.button.callback("🇺🇿 UZ", "lang_uz"),
            Markup.button.callback("🇷🇺 RU", "lang_ru"),
            Markup.button.callback("🇬🇧 EN", "lang_en")
        ]
    ]))
})

bot.action(/lang_(.+)/, (ctx) => {
    ctx.session.lang = ctx.match[1]
    ctx.answerCbQuery("✅ Saqlandi")
})

// ================= CREATE =================
bot.action("create", (ctx) => {
    ctx.session.creating = true
    ctx.reply("📩 E’lon matnini yuboring:")
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
        views: 0,
        premium: false
    })

    await bot.telegram.sendMessage(
        ADMIN_ID,
        `📢 Yangi e’lon:\n\n${ctx.message.text}`,
        Markup.inlineKeyboard([
            [
                Markup.button.callback("✅ Tasdiq", `approve_${adId}`),
                Markup.button.callback("❌ Rad", `reject_${adId}`)
            ]
        ])
    )

    ctx.reply("⏳ Admin ko‘rib chiqadi.")
})

// ================= APPROVE =================
bot.action(/approve_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery("⛔ Admin emas")

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    await bot.telegram.sendMessage(
        CHANNEL,
        `📢 YANGI E’LON\n\n${ad.text}\n\n👤 ${ad.name}\n👁 0 ❤️ 0`,
        Markup.inlineKeyboard([
            [
                Markup.button.callback("❤️ Like", `like_${adId}`),
                Markup.button.callback("👁 View", `view_${adId}`)
            ]
        ])
    )

    pendingAds.delete(adId)
    ctx.editMessageText("✅ Tasdiqlandi")
})

// ================= REJECT =================
bot.action(/reject_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    await bot.telegram.sendMessage(ad.userId, "❌ Rad etildi")
    pendingAds.delete(adId)

    ctx.editMessageText("❌ Rad etildi")
})

// ================= LIKE =================
bot.action(/like_(.+)/, async (ctx) => {
    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)

    if (!ad) return ctx.answerCbQuery("Topilmadi")

    ad.likes++
    ctx.answerCbQuery("❤️ Yoqdi")
})

// ================= VIEW =================
bot.action(/view_(.+)/, async (ctx) => {
    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)

    if (!ad) return

    ad.views++
    ctx.answerCbQuery("👁 Ko‘rildi")
})

// ================= PROFILE =================
bot.action("profile", (ctx) => {
    ctx.reply(`👤 ID: ${ctx.from.id}`)
})

// ================= ADMIN PANEL =================
bot.command("admin", (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    ctx.reply("🛠 Admin Panel", Markup.inlineKeyboard([
        [Markup.button.callback("📊 Statistika", "stats")]
    ]))
})

bot.action("stats", (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    ctx.reply(`📊 E’lonlar soni: ${pendingAds.size}`)
})

// ================= WEBHOOK =================
app.use(bot.webhookCallback("/webhook"))

app.listen(process.env.PORT || 10000, async () => {
    console.log("🚀 Bot ishladi")

    await bot.telegram.setWebhook(`${RENDER_URL}/webhook`)
})