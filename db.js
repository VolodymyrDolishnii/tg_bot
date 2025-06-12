const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

async function connect() {
  await client.connect();
  return client.db("payment_bot");
}

async function saveOrder(orderId, userId) {
  const db = await connect();
  await db.collection("orders").insertOne({ orderId, userId });
}

async function getUserId(orderId) {
  const db = await connect();
  const order = await db.collection("orders").findOne({ orderId });
  return order?.userId;
}

module.exports = { saveOrder, getUserId };
