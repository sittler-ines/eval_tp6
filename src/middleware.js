import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, readSession } from "./lib/auth.js";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/callback"];

export const onRequest = defineMiddleware((context, next) => {
  const user = readSession(context.cookies.get(SESSION_COOKIE)?.value);

  if (user) {
    context.locals.user = user;
  }

  if (!user && !PUBLIC_PATHS.includes(context.url.pathname)) {
    return context.redirect("/login");
  }

  return next();
});
