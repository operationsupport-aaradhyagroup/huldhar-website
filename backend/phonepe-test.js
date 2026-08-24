require("dotenv").config();

const {
  StandardCheckoutClient,
  Env
} = require("@phonepe-pg/pg-sdk-node");

try {
  const client = StandardCheckoutClient.getInstance(
    process.env.PHONEPE_CLIENT_ID,
    process.env.PHONEPE_CLIENT_SECRET,
    Number(process.env.PHONEPE_CLIENT_VERSION),
    Env.PRODUCTION
  );

  console.log("PhonePe client initialized successfully.");
} catch (error) {
  console.error("PhonePe initialization failed:");
  console.error(error.message);
}