import {
  SESSION_COOKIE,
  STATE_COOKIE,
  cookieOptions,
  createSession,
  getGoogleUser,
  isEmailAllowed,
  sessionMaxAge
} from "../../../lib/auth.js";

export async function GET({ url, cookies, redirect }) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookies.get(STATE_COOKIE)?.value;

  cookies.delete(STATE_COOKIE, { path: "/" });

  // Protection CSRF : le state renvoyé par Google doit correspondre au cookie
  if (!code || !state || state !== expectedState) {
    return redirect("/login?error=state");
  }

  let user;

  try {
    user = await getGoogleUser(code);
  } catch (error) {
    console.error(error);
    return redirect("/login?error=google");
  }

  if (!user.emailVerified || !isEmailAllowed(user.email)) {
    return redirect("/login?error=forbidden");
  }

  cookies.set(
    SESSION_COOKIE,
    createSession({
      name: user.name,
      email: user.email,
      image: user.image
    }),
    { ...cookieOptions, maxAge: sessionMaxAge }
  );

  return redirect("/");
}
