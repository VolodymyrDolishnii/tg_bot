const express = require("express");
require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { createInvoice } = require("./payment");
const { saveOrder, getUserId } = require("./db");

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ADMINS = [963613663];

// --- Telegram bot logic ---
bot.start((ctx) => {
  ctx.reply(
    "Choose a plan:",
    Markup.inlineKeyboard([
      [Markup.button.callback("Starter ($5)", "pay_starter")],
      [Markup.button.callback("Base ($10)", "pay_base")],
      [Markup.button.callback("Full Access ($25)", "pay_full")],
    ])
  );
});

bot.action(/^pay_/, async (ctx) => {
  const userId = ctx.from.id;
  const mapping = {
    pay_starter: { name: "Starter", price: 5 },
    pay_base: { name: "Base", price: 10 },
    pay_full: { name: "Full Access", price: 25 },
  };

  const { name, price } = mapping[ctx.match.input];
  const { url, orderId } = await createInvoice(userId, name, price);

  await saveOrder(orderId, userId, {
    first_name: ctx.from.first_name,
    last_name: ctx.from.last_name,
    username: ctx.from.username,
    invoice_url: url,
  });

  await ctx.reply(
    `🔗 Here is the link to pay for the ${name} plan:`,
    Markup.inlineKeyboard([[Markup.button.url("Go to payment", url)]])
  );
});

// Command /reply <userId> <text message>
bot.command("reply", async (ctx) => {
  const senderId = ctx.from.id;

  // Check if the sender is an admin
  if (!ADMINS.includes(senderId)) {
    return ctx.reply('❌ You do not have access to this command.');
  }

  const args = ctx.message.text.split(' ').slice(1);
  const userId = args[0];
  const message = args.slice(1).join(' ');

  // Check if the arguments are valid
  if (!userId || !message) {
    return ctx.reply('❗ Format: /reply <userId> <message>');
  }

  try {
    await ctx.telegram.sendMessage(userId, message);
    ctx.reply('✅ Message sent.');
  } catch (error) {
    console.error('Send error:', error);
    ctx.reply(`❌ Error sending message: ${error.description || error.message}`);
  }
});


// --- Webhook for CryptoCloud ---
app.post("/webhook", async (req, res) => {
  const { order_id, status } = req.body;
  const userId = await getUserId(order_id);

  if (!userId) return res.status(400).send("Unknown order");

  if (status === "success") {
    await bot.telegram.sendMessage(
      userId,
      "✅ Payment successful! Here is your access: https://google.com"
    );
    await updateOrder(order_id, true);
  } else if (status === "expired" || status === "cancel") {
    await bot.telegram.sendMessage(userId, "❌ Payment failed or canceled.");
    await updateOrder(order_id, false);
  } else {
    await bot.telegram.sendMessage(userId, "⏳ Waiting for payment...");
  }

  res.send("ok");
});

// --- Telegram webhook setup ---
const URL =
  process.env.RENDER_EXTERNAL_URL ||
  `https://${process.env.RENDER_SERVICE_NAME}.onrender.com`;
bot.telegram.setWebhook(`${URL}/bot${process.env.BOT_TOKEN}`);
app.use(bot.webhookCallback(`/bot${process.env.BOT_TOKEN}`));

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Webhook-server started on port ${PORT}`);
});
