const { Telegraf, Markup } = require('telegraf');
const { createInvoice } = require('./payment');
require('dotenv').config();
const { saveOrder } = require('./db');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Command /start
bot.start((ctx) => {
  ctx.reply('Choose a plan:', Markup.inlineKeyboard([
    [Markup.button.callback('Starter ($5)', 'pay_starter')],
    [Markup.button.callback('Base ($10)', 'pay_base')],
    [Markup.button.callback('Full Access ($25)', 'pay_full')],
  ]));
});

// Handle clicks
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

  await ctx.reply(`🔗 Here is the link to pay for the ${name} plan:`, Markup.inlineKeyboard([
    [Markup.button.url('Go to payment', url)],
  ]));
});

// Start bot
bot.launch();

