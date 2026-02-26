require("dotenv").config()
const { Telegraf, Markup } = require("telegraf")
const mongoose = require("mongoose")

// ================= DATABASE CONNECT =================
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log("🗄 Database ulandi")
    } catch (err) {
        console.log("❌ DB xato:", err)
    }
}

// ================= SCHEMA =================
const AdSchema = new mongoose.Schema({
    userId: Number,
    name: String,
    text: String,
    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    premium: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
})

const Ad = mongoose.model("Ad", AdSchema)

// ================= BOT =================
const bot = new Telegraf(process.env.BOT_TOKEN)

const ADMIN_ID = Number(process.env.ADMIN_ID)
const CHANNEL = process.env.CHANNEL

const userState = new Map()

// ================= START =================
bot.start(async (ctx) => {
    await ctx.reply(
        "🚀 Professional Bot",
        Markup.inlineKeyboard([
            [Markup.button.callback("📢 E’lon berish", "create")],
            [Markup.button.callback("📊 Statistika", "stats")]
        ])
    )
})

// ================= CREATE =================
bot.action("create", async (ctx) => {
    await ctx.answerCbQuery()
    userState.set(ctx.from.id, "waiting_ad")
    await ctx.reply("📩 E’lon matnini yuboring:")
})

// ================= TEXT =================
bot.on("text", async (ctx) => {
    if (userState.get(ctx.from.id) !== "waiting_ad") return

    userState.delete(ctx.from.id)

    await Ad.create({
        userId: ctx.from.id,
        name: ctx.from.first_name,
        text: ctx.message.text
    })

    await ctx.reply("⏳ E’lon saqlandi. Admin tekshiradi.")
})

// ================= ADMIN APPROVE =================
bot.command("approve", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const ad = await Ad.findOne({ premium: false })
    if (!ad) return ctx.reply("E’lon yo‘q")

    ad.premium = true
    await ad.save()

    await bot.telegram.sendMessage(
        CHANNEL,
        `🔥 PREMIUM E’LON\n\n${ad.text}\n\n👤 ${ad.name}`,
        Markup.inlineKeyboard([
            [Markup.button.callback("❤️ Like", `like_${ad._id}`)]
        ])
    )

    ctx.reply("✅ Tasdiqlandi")
})

// ================= LIKE =================
bot.action(/like_(.+)/, async (ctx) => {
    await ctx.answerCbQuery()

    const ad = await Ad.findById(ctx.match[1])
    if (!ad) return

    ad.likes += 1
    await ad.save()
})

// ================= STATS =================
bot.action("stats", async (ctx) => {
    const total = await Ad.countDocuments()
    const premium = await Ad.countDocuments({ premium: true })

    await ctx.reply(
        `📊 Statistika:\n\n` +
        `Jami e’lonlar: ${total}\n` +
        `Premium: ${premium}`
    )
})

// ================= START SERVER =================
const start = async () => {
    await connectDB()
    bot.launch()
    console.log("🚀 Bot ishga tushdi")
}

start()

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))