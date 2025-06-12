const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const { Telegraf } = require('telegraf');
const { getUserId } = require('./db');

const bot = new Telegraf(process.env.BOT_TOKEN);

const app = express();
app.use(express.urlencoded({ extended: true }));

app.post('/webhook', async (req, res) => {
  const { order_id, status, invoice_id, amount_crypto } = req.body;

  console.log('order_id', order_id);

  const userId = await getUserId(order_id);
  console.log('userId', userId);

  if (!userId) return res.status(400).send('Unknown order');

  console.log('status', status);

  if (status === 'success') {
    await bot.telegram.sendMessage(userId, '✅ Оплата успішна! Ось ваш доступ: https://google.com');
  } else if (status === 'expired' || status === 'cancel') {
    await bot.telegram.sendMessage(userId, '❌ Оплата не пройшла або скасована.');
  } else {
    await bot.telegram.sendMessage(userId, '⏳ Очікується оплата...');
  }

  res.send('ok');
});

app.listen(3000, () => {
  console.log('🌐 Webhook-сервер запущено на порту 3000');
});
