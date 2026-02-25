const { Telegraf } = require("telegraf");
const express = require("express");

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.error("❌ BOT_TOKEN topilmadi! Render Environment ga qo‘shing.");
  process.exit(1);
}

const bot = new Telegraf(botToken);

const app = express();
const PORT = process.env.PORT || 3000;

// Render uchun port ochish (Web Service ishlashi uchun)
app.get("/", (req, res) => {
  res.send("🚀 Bot ishlayapti");
});

app.listen(PORT, () => {
  console.log("🌍 Server portda ishlayapti:", PORT);
});

// START
bot.start((ctx) => {
  ctx.reply("👋 Bot ishlayapti!");
});

// HAR QANDAY TEXT
bot.on("text", (ctx) => {
  ctx.reply("✅ Xabaringiz qabul qilindi.");
});

bot.launch()
  .then(() => console.log("🤖 Telegram bot ishga tushdi"))
  .catch((err) => console.error("Bot xatosi:", err));

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));