// const express = require('express');
// const bodyParser = require('body-parser');
// require('dotenv').config();
// const { Telegraf } = require('telegraf');
// const { getUserId } = require('./db');

// const bot = new Telegraf(process.env.BOT_TOKEN);

// const app = express();
// app.use(express.urlencoded({ extended: true }));

// app.post('/webhook', async (req, res) => {
//   const { order_id, status, invoice_id, amount_crypto } = req.body;

//   console.log('order_id', order_id);

//   const userId = await getUserId(order_id);
//   console.log('userId', userId);

//   if (!userId) return res.status(400).send('Unknown order');

//   console.log('status', status);

//   if (status === 'success') {
//     await bot.telegram.sendMessage(userId, '✅ Оплата успішна! Ось ваш доступ: https://google.com');
//   } else if (status === 'expired' || status === 'cancel') {
//     await bot.telegram.sendMessage(userId, '❌ Оплата не пройшла або скасована.');
//   } else {
//     await bot.telegram.sendMessage(userId, '⏳ Очікується оплата...');
//   }

//   res.send('ok');
// });

// app.listen(3000, () => {
//   console.log('🌐 Webhook-сервер запущено на порту 3000');
// });

const express = require('express');
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { createInvoice } = require('./payment');
const { saveOrder, getUserId } = require('./db');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Telegram bot logic ---
bot.start((ctx) => {
  ctx.reply('Оберіть тариф:', Markup.inlineKeyboard([
    [Markup.button.callback('Starter ($5)', 'pay_starter')],
    [Markup.button.callback('Base ($10)', 'pay_base')],
    [Markup.button.callback('Full Access ($25)', 'pay_full')],
  ]));
});

bot.action(/^pay_/, async (ctx) => {
  const userId = ctx.from.id;
  const mapping = {
    pay_starter: { name: 'Starter', price: 5 },
    pay_base: { name: 'Base', price: 10 },
    pay_full: { name: 'Full Access', price: 25 },
  };

  const { name, price } = mapping[ctx.match.input];
  const { url, orderId } = await createInvoice(userId, name, price);

  await saveOrder(orderId, userId);

  await ctx.reply(`🔗 Ось посилання для оплати тарифу ${name}:`, Markup.inlineKeyboard([
    [Markup.button.url('Перейти до оплати', url)],
  ]));
});

// --- Webhook for CryptoCloud ---
app.post('/webhook', async (req, res) => {
  const { order_id, status } = req.body;
  const userId = await getUserId(order_id);

  if (!userId) return res.status(400).send('Unknown order');

  if (status === 'success') {
    await bot.telegram.sendMessage(userId, '✅ Оплата успішна! Ось ваш доступ: https://google.com');
  } else if (status === 'expired' || status === 'cancel') {
    await bot.telegram.sendMessage(userId, '❌ Оплата не пройшла або скасована.');
  } else {
    await bot.telegram.sendMessage(userId, '⏳ Очікується оплата...');
  }

  res.send('ok');
});

// --- Telegram webhook setup ---
const URL = process.env.RENDER_EXTERNAL_URL || `https://${process.env.RENDER_SERVICE_NAME}.onrender.com`;
bot.telegram.setWebhook(`${URL}/bot${process.env.BOT_TOKEN}`);
app.use(bot.webhookCallback(`/bot${process.env.BOT_TOKEN}`));

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Webhook-сервер запущено на порту ${PORT}`);
});
