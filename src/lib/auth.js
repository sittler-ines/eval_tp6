import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  AUTH_SECRET,
  ALLOWED_EMAILS
} from "astro:env/server";

export const SESSION_COOKIE = "session";
export const STATE_COOKIE = "oauth_state";

const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 jours, en secondes

export const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: import.meta.env.PROD
};

/*
 * Signature HMAC : le cookie de session ne peut pas être
 * modifié côté navigateur sans connaître AUTH_SECRET.
 */

function sign(value) {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("base64url");
}

export function createSession(user) {
  const payload = Buffer.from(
    JSON.stringify({
      ...user,
      exp: Math.floor(Date.now() / 1000) + SESSION_DURATION
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function readSession(token) {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (session.exp < Date.now() / 1000) return null;

    const { name, email, image } = session;
    return { name, email, image };
  } catch {
    return null;
  }
}

export const sessionMaxAge = SESSION_DURATION;

/*
 * Google OAuth 2.0
 */

export function createState() {
  return randomBytes(32).toString("base64url");
}

export function getGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function getGoogleUser(code) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Échange du code refusé : ${await tokenResponse.text()}`);
  }

  const { access_token } = await tokenResponse.json();

  const userResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!userResponse.ok) {
    throw new Error("Impossible de récupérer le profil Google");
  }

  const profile = await userResponse.json();

  return {
    name: profile.name ?? null,
    email: profile.email ?? null,
    image: profile.picture ?? null,
    emailVerified: profile.email_verified === true
  };
}

/*
 * ALLOWED_EMAILS (optionnel) : liste d'emails séparés par des virgules.
 * Vide = tout compte Google vérifié est accepté.
 */

export function isEmailAllowed(email) {
  if (!ALLOWED_EMAILS) return true;

  const allowed = ALLOWED_EMAILS
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(String(email).toLowerCase());
}
