require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

if (!apiId || !apiHash) {
  console.error("❌ ERROR: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in your .env file!");
  console.log("Get them from https://my.telegram.org");
  process.exit(1);
}

const stringSession = new StringSession(""); // Empty string for a new session

(async () => {
  console.log("Loading interactive Telegram login...");
  
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Please enter your phone number (with country code, e.g., +1234567890): "),
    password: async () => await input.text("Please enter your 2FA password (if you have one): "),
    phoneCode: async () => await input.text("Please enter the login code you received on Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("\n✅ Successfully connected to Telegram!");
  const sessionString = client.session.save();
  
  console.log("\n=======================================================");
  console.log("⚠️  IMPORTANT: COPY THIS EXACT STRING INTO YOUR .env FILE");
  console.log("=======================================================\n");
  console.log(`TELEGRAM_SESSION="${sessionString}"\n`);
  
  await client.sendMessage("me", { message: "✅ CineStream Telegram proxy session successfully generated!" });
  console.log("A confirmation message has been sent to your Telegram 'Saved Messages'.");
  process.exit(0);
})();
