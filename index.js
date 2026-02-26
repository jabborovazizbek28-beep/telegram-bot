require("dotenv").config()
const { Telegraf, Markup, session } = require("telegraf")

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(session())

const ADMIN_ID = Number(process.env.ADMIN_ID)
const ADS_CHANNEL = process.env.ADS_CHANNEL
const CHANNEL_LINK = process.env.CHANNEL_LINK

const pendingAds = new Map()

// 🔒 Faqat e’lon kanaliga obuna tekshiramiz
async function isSubscribed(ctx) {
    try {
        const member = await ctx.telegram.getChatMember(ADS_CHANNEL, ctx.from.id)
        return member.status !== "left"
    } catch {
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

// 🚀 START
bot.start(async (ctx) => {
    const subscribed = await isSubscribed(ctx)

    if (!subscribed) {
        return ctx.reply(
            "📢 Botdan foydalanish uchun e’lon kanaliga obuna bo‘ling.",
            subscribeButtons()
        )
    }

    ctx.reply("🚀 E’lon Botga xush kelibsiz!", mainMenu())
})

// 🔁 Tekshirish
bot.action("check_sub", async (ctx) => {
    const subscribed = await isSubscribed(ctx)

    if (subscribed) {
        await ctx.editMessageText("✅ Obuna tasdiqlandi!", mainMenu())
    } else {
        await ctx.answerCbQuery("❌ Hali obuna bo‘lmagansiz!", { show_alert: true })
    }
})

// 🔒 Global himoya
bot.use(async (ctx, next) => {
    if (!ctx.from) return next()
    if (ctx.message?.text === "/start") return next()
    if (ctx.callbackQuery?.data === "check_sub") return next()

    const subscribed = await isSubscribed(ctx)

    if (!subscribed) {
        await ctx.reply(
            "❌ Avval e’lon kanaliga obuna bo‘ling!",
            subscribeButtons()
        )
        return
    }

    return next()
})

// 📢 E’lon berish
bot.action("create", (ctx) => {
    ctx.session.creatingAd = true
    ctx.reply("📢 E’lon matnini yuboring:")
})

// 📨 E’lon adminga boradi
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

// ✅ Tasdiqlash
bot.action(/approve_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    await bot.telegram.sendMessage(
        ADS_CHANNEL,
`📢 YANGI E’LON

${ad.text}

👤 ${ad.name}`
    )

    await bot.telegram.sendMessage(ad.userId, "✅ E’loningiz tasdiqlandi!")

    pendingAds.delete(adId)
    ctx.editMessageText("✅ Tasdiqlandi.")
})

// ❌ Rad etish
bot.action(/reject_(.+)/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const adId = Number(ctx.match[1])
    const ad = pendingAds.get(adId)
    if (!ad) return

    await bot.telegram.sendMessage(ad.userId, "❌ E’loningiz rad etildi.")

    pendingAds.delete(adId)
    ctx.editMessageText("❌ Rad etildi.")
})

// 👤 Profil
bot.action("profile", (ctx) => {
    ctx.reply(`👤 Sizning ID: ${ctx.from.id}`)
})

bot.launch()
console.log("🚀 E’LON BOT ISHLADI")