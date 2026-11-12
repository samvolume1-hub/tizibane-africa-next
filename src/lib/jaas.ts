import { createSign } from "node:crypto";

type JaaSUser = {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  moderator: boolean;
};

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function createJaasToken(input: { roomName: string; user: JaaSUser }) {
  const appId = process.env.JAAS_APP_ID;
  const keyId = process.env.JAAS_API_KEY_ID;
  const privateKey = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!appId || !keyId || !privateKey) {
    throw new Error("JaaS server credentials are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: keyId, typ: "JWT" };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: appId,
    room: input.roomName,
    nbf: now - 10,
    exp: now + 60 * 60,
    context: {
      user: {
        id: input.user.id,
        name: input.user.name,
        email: input.user.email ?? "",
        avatar: input.user.avatar ?? "",
        moderator: input.user.moderator ? "true" : "false",
      },
      features: {
        recording: false,
        livestreaming: false,
        transcription: false,
        "outbound-call": false,
        "sip-outbound-call": false,
        "file-upload": false,
      },
      room: { regex: false },
    },
  };

  const unsigned = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(payload));
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64url");
  return unsigned + "." + signature;
}

export function getJaasAppId() {
  return process.env.JAAS_APP_ID ?? "";
}
