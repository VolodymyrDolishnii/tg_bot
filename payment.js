const axios = require("axios");
require("dotenv").config();

async function createInvoice(userId, tariffName, amount) {
  const orderId = `order_${userId}_${Date.now()}`;

  const response = await axios.post(
    "https://api.cryptocloud.plus/v1/invoice/create",
    {
      shop_id: process.env.CC_SHOP_ID,
      amount,
      currency: "USD",
      order_id: orderId,
      comment: `Тариф: ${tariffName}`,
    },
    {
      headers: {
        Authorization: `Token ${process.env.CC_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(response.data);

  return {
    url: response.data.pay_url,
    orderId,
  };
}

module.exports = { createInvoice };
