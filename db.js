const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

async function connect() {
  await client.connect();
  return client.db("payment_bot");
}

async function saveOrder(orderId, userId, extra = {}) {
  const db = await connect();
  await db.collection("orders").insertOne({
    orderId,
    userId,
    ...extra,
    createdAt: new Date(),
  });
}

async function getUserId(orderId) {
  const db = await connect();
  const order = await db.collection("orders").findOne({ orderId });
  return order?.userId;
}

module.exports = { saveOrder, getUserId };
