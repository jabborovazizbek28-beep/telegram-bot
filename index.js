require("dotenv").config()
const { Telegraf, Markup, session } = require("telegraf")
const express = require("express")

// 🔥 TOKENNI ENV DAN OLADI
const bot = new Telegraf(process.env.BOT_TOKEN)

const app = express()
bot.use(session())

// 🔥 ENV DAN OLINADI
const ADMIN_ID = Number(process.env.ADMIN_ID)
const ADS_CHANNEL = process.env.ADS_CHANNEL
const CHANNEL_LINK = process.env.CHANNEL_LINK
const RENDER_URL = process.env.RENDER_URL

const pendingAds = new Map()

// =====================
// 🔒 OBUNA TEKSHIRISH
// =====================
async function isSubscribed(ctx) {
    try {
        const member = await ctx.telegram.getChatMember(ADS_CHANNEL, ctx.from.id)
        return member.status !== "left"
    } catch (err) {
        console.log("Subscription error:", err)
        return false
    }
}

function subscribeButtons() {
    return Markup.inlineKeyboard([
        [Markup.button.url("📢 Kanalga obuna bo‘lish", CHANNEL_LINK)],
        [Markup.button.callback("✅ Tekshirish", "check_sub")]
    ])
}

function mainMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback("📢 E’lon berish", "create")],
        [Markup.button.callback("👤 Profil", "profile")]
    ])
}

// =====================
// 🚀 START
// =====================
bot.start(async (ctx) => {
    const subscribed = await isSubscribed(ctx)

    if (!subscribed) {
        return ctx.reply(
            "📢 Botdan foydalanish uchun kanalga obuna bo‘ling.",
            subscribeButtons()
        )
    }

    ctx.reply("🚀 Xush kelibsiz!", mainMenu())
})

// =====================
// 🔁 OBUNANI TEKSHIRISH
// =====================
bot.action("check_sub", async (ctx) => {
    const subscribed = await isSubscribed(ctx)

    if (subscribed) {
        await ctx.editMessageText("✅ Obuna tasdiqlandi!", mainMenu())
    } else {
        await ctx.answerCbQuery("❌ Hali obuna bo‘lmagansiz!", { show_alert: true })
    }
})

// =====================
// 📢 E’LON YARATISH
// =====================
bot.action("create", (ctx) => {
    ctx.session.creatingAd = true
    ctx.reply("📢 E’lon matnini yuboring:")
})

// =====================
// 📨 E’LONNI ADMINGA YUBORISH
// =====================
bot.on("text", async (ctx) => {
    if (!ctx.session.creatingAd) return

    ctx.session.creatingAd = false

    const adId = Date.now()

    pendingAds.set(adId, {
        userId: ctx.from.id,
        name: ctx.from.first_name,
        text: ctx.message.text
    })

    await bot.telegram.sendMessage(
        ADMIN_ID,
`📢 Yangi e’lon:

${ctx.message.text}

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}`,
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
// ✅ TASDIQLASH
// =====================
bot.action(/approve_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    try {
        await bot.telegram.sendMessage(
            ADS_CHANNEL,
`📢 YANGI E’LON

${ad.text}

👤 ${ad.name}`
        )

        await bot.telegram.sendMessage(ad.userId, "✅ E’loningiz tasdiqlandi!")

        pendingAds.delete(adId)
        ctx.editMessageText("✅ Tasdiqlandi.")

    } catch (error) {
        console.log("Channel error:", error)
        ctx.reply("❌ Kanalga yuborishda xatolik!")
    }
})

// =====================
// ❌ RAD ETISH
// =====================
bot.action(/reject_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    await bot.telegram.sendMessage(ad.userId, "❌ E’loningiz rad etildi.")

    pendingAds.delete(adId)
    ctx.editMessageText("❌ Rad etildi.")
})

// =====================
// 👤 PROFIL
// =====================
bot.action("profile", (ctx) => {
    ctx.reply(`👤 Sizning ID: ${ctx.from.id}`)
})

// =====================
// 🌍 WEBHOOK (RENDER)
// =====================
app.use(bot.webhookCallback("/webhook"))

app.listen(process.env.PORT || 10000, async () => {
    console.log("🚀 Bot Render’da ishladi")

    await bot.telegram.setWebhook(
        `${RENDER_URL}/webhook`
    )
})