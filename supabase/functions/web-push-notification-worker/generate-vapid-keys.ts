import { generateVapidKey, vapidPublicKey } from "@daaku/webpush";

const privateKey = await generateVapidKey();
const publicKey = await vapidPublicKey(privateKey);

console.log("WEB_PUSH_VAPID_PRIVATE_KEY (store only in Supabase Edge Function secrets):");
console.log(JSON.stringify(privateKey));
console.log("\nNEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY (set in Render environment):");
console.log(publicKey);
