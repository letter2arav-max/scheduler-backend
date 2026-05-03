import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendWhatsAppMessage = async (to, message) => {
  try {
    console.log("SENDING TO:", to);

    const response = await client.messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:${to}`,   // IMPORTANT
      body: message,
    });

    console.log("MESSAGE SID:", response.sid);
    return response;
  } catch (error) {
    console.error("TWILIO ERROR FULL:", error);
    throw error;
  }
};