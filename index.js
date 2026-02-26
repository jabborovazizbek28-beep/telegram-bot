const express = require("express");
const { Telegraf } = require("telegraf");

const app = express();
const PORT = process.env.PORT || 3000;

// Web server (Render uchun majburiy)
app.get("/", (req, res) => {
  res.send("Bot ishlayapti 🚀");
});

app.listen(PORT, () => {
  console.log("Server port:", PORT);
});

// Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("✅ Bot ishlayapti!");
});

bot.launch();