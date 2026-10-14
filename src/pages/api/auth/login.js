import {
  STATE_COOKIE,
  cookieOptions,
  createState,
  getGoogleAuthUrl
} from "../../../lib/auth.js";

export function GET({ cookies, redirect }) {
  const state = createState();

  cookies.set(STATE_COOKIE, state, {
    ...cookieOptions,
    maxAge: 60 * 10
  });

  return redirect(getGoogleAuthUrl(state));
}
