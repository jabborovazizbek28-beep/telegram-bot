const { Telegraf, Markup, session } = require("telegraf")
const express = require("express")

// 🔥 O‘Z MA’LUMOTLARINGIZNI YOZING
const bot = new Telegraf("8699404271:AAHOlXnkHVxAGhqG4g6LJatZDjKQP2hSzWY")

const ADMIN_ID = 6952175243
const ADS_CHANNEL = "@Telefon_bozor_Qarshi_n1"
const CHANNEL_LINK = "https://t.me/Telefon_bozor_Qarshi_n1"
const RENDER_URL = "https://telegram-bot-ldyk.onrender.com"

const app = express()
bot.use(session())

const pendingAds = new Map()

// =====================
// START
// =====================
bot.start((ctx) => {
    ctx.reply(
        "🚀 Botga xush kelibsiz!",
        Markup.inlineKeyboard([
            [Markup.button.callback("📢 E’lon berish", "create")]
        ])
    )
})

// =====================
// E’LON YOZISH
// =====================
bot.action("create", (ctx) => {
    ctx.session.creating = true
    ctx.reply("📩 E’lon matnini yuboring:")
})

// =====================
// MATN QABUL QILISH
// =====================
bot.on("text", async (ctx) => {
    if (!ctx.session.creating) return

    ctx.session.creating = false

    const adId = Date.now()

    pendingAds.set(adId, {
        userId: ctx.from.id,
        name: ctx.from.first_name,
        text: ctx.message.text
    })

    await bot.telegram.sendMessage(
        ADMIN_ID,
        `📢 Yangi e’lon:\n\n${ctx.message.text}\n\n👤 ${ctx.from.first_name}`,
        Markup.inlineKeyboard([
            [
                Markup.button.callback("✅ Tasdiqlash", `approve_${adId}`),
                Markup.button.callback("❌ Rad etish", `reject_${adId}`)
            ]
        ])
    )

    ctx.reply("⏳ E’lon adminga yuborildi.")
})

// =====================
// TASDIQLASH
// =====================
bot.action(/approve_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.reply("❌ Siz admin emassiz")
    }

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    try {
        await bot.telegram.sendMessage(
            ADS_CHANNEL,
            `📢 YANGI E’LON\n\n${ad.text}\n\n👤 ${ad.name}`
        )

        await bot.telegram.sendMessage(ad.userId, "✅ E’loningiz tasdiqlandi!")

        pendingAds.delete(adId)
        ctx.editMessageText("✅ Tasdiqlandi.")

    } catch (err) {
        console.log(err)
        ctx.reply("❌ Kanalga yuborishda xatolik!")
    }
})

// =====================
// RAD ETISH
// =====================
bot.action(/reject_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.reply("❌ Siz admin emassiz")
    }

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    await bot.telegram.sendMessage(ad.userId, "❌ E’loningiz rad etildi.")

    pendingAds.delete(adId)
    ctx.editMessageText("❌ Rad etildi.")
})

// =====================
// WEBHOOK (RENDER)
// =====================
app.use(bot.webhookCallback("/webhook"))

app.listen(process.env.PORT || 10000, async () => {
    console.log("🚀 Bot ishladi")

    await bot.telegram.setWebhook(`${RENDER_URL}/webhook`)
})