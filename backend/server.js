const crypto = require("crypto");
const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { StandardCheckoutClient, StandardCheckoutPayRequest, Env } = require("@phonepe-pg/pg-sdk-node");

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_ROOT = path.join(__dirname, "..");
const PRODUCTS = Object.freeze({
  "paddy-seeds-1kg": Object.freeze({ id: "paddy-seeds-1kg", name: "Paddy (Dhan) Seeds — 1 kg", amount: 100000 })
});

app.use(cors());
app.use(express.json({ limit: "20kb" }));

function getPhonePeClient() {
  const { PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, PHONEPE_CLIENT_VERSION } = process.env;
  if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET || !PHONEPE_CLIENT_VERSION) {
    throw new Error("PhonePe credentials are not configured on the server.");
  }
  const env = String(process.env.PHONEPE_ENV || "SANDBOX").toUpperCase() === "PRODUCTION"
    ? Env.PRODUCTION : Env.SANDBOX;
  return StandardCheckoutClient.getInstance(
    PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, Number(PHONEPE_CLIENT_VERSION), env, false
  );
}

function publicOrigin(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

app.get("/api/health", (_req, res) => res.json({ success: true, service: "Huldhar payments" }));

app.post("/api/payments/create", async (req, res) => {
  try {
    const product = PRODUCTS[req.body?.productId];
    if (!product) return res.status(400).json({ success: false, message: "Invalid product." });

    const merchantOrderId = `HULDHAR-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const origin = publicOrigin(req);
    const isProduction = String(process.env.PHONEPE_ENV || "SANDBOX").toUpperCase() === "PRODUCTION";
    if (isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return res.status(400).json({
        success: false,
        code: "LIVE_URL_REQUIRED",
        message: "Production PhonePe payments require the deployed HTTPS website. Use sandbox credentials for localhost testing."
      });
    }
    const redirectUrl = `${origin}/payment-status.html?orderId=${encodeURIComponent(merchantOrderId)}`;
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(product.amount)
      .redirectUrl(redirectUrl)
      .message(`Payment for ${product.name}`)
      .build();
    const response = await getPhonePeClient().pay(request);
    if (!response?.redirectUrl) throw new Error("PhonePe did not return a checkout URL.");
    res.json({ success: true, orderId: merchantOrderId, redirectUrl: response.redirectUrl });
  } catch (error) {
    const networkBlocked = error.code === "EACCES" || error.code === "ENETUNREACH" || error.code === "ECONNREFUSED";
    console.error("Payment creation failed:", { code: error.code, status: error.response?.status, message: error.message });
    res.status(502).json({
      success: false,
      code: networkBlocked ? "PHONEPE_NETWORK_ERROR" : "PHONEPE_REQUEST_FAILED",
      message: networkBlocked
        ? "The server could not connect to PhonePe. Check the server internet or firewall settings."
        : "PhonePe rejected the payment request. Please verify the payment-gateway credentials and environment."
    });
  }
});

app.get("/api/payments/:orderId/status", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    if (!/^HULDHAR-\d{13}-[a-f0-9]{8}$/.test(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }
    const status = await getPhonePeClient().getOrderStatus(orderId, true);
    res.json({
      success: true,
      orderId,
      state: status.state || "PENDING",
      amount: status.amount,
      transactionId: status.paymentDetails?.[0]?.transactionId || null
    });
  } catch (error) {
    console.error("Payment status check failed:", error.message);
    res.status(502).json({ success: false, message: "Unable to verify payment status." });
  }
});

if (require.main === module) {
  app.use(express.static(SITE_ROOT));
  app.listen(PORT, () => console.log(`Huldhar website running at http://localhost:${PORT}`));
}

module.exports = app;
