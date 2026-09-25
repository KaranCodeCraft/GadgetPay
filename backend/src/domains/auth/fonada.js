import { env } from "../../config/env.js";

export async function sendFonadaSms({ phone, message, contentId }) {
  const params = new URLSearchParams({
    username: env.fonadaUsername,
    password: env.fonadaPassword,
    unicode: String(env.fonadaUnicode),
    from: env.fonadaFrom,
    to: phone,
    text: message,
    dltContentId: contentId,
  });

  const response = await fetch(`${env.fonadaApiUrl}?${params.toString()}`);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Fonada SMS request failed with status ${response.status}`);
  }

  return { status: response.status, responseText };
}