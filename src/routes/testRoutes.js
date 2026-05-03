import express from "express";
import { sendWhatsAppMessage } from "../services/whatsappService.js";

const router = express.Router();

router.get("/test-whatsapp", async (req, res) => {
  try {
    const number = "+919629071076"; // YOUR NUMBER

    console.log("TEST ROUTE HIT");
    console.log("TEST NUMBER:", number);

    const result = await sendWhatsAppMessage(number, "Test message from backend");

    console.log("TWILIO RESULT:", result?.sid || result);

    return res.json({ status: "message sent" });
  } catch (err) {
    console.error("TEST ROUTE ERROR:", err);
    return res.status(500).json({ status: "error", error: err.message });
  }
});

export default router;