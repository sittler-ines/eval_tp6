import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",

  adapter: node({
    mode: "standalone"
  }),

  // Derrière Apache : faire confiance à X-Forwarded-Host / X-Forwarded-Proto
  // sinon le POST de déconnexion est rejeté (Origin https ≠ http://localhost:3344)
  security: {
    allowedDomains: [{ protocol: "https" }]
  },

  env: {
    schema: {
      GOOGLE_CLIENT_ID: envField.string({ context: "server", access: "secret" }),
      GOOGLE_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
      GOOGLE_REDIRECT_URI: envField.string({ context: "server", access: "secret" }),
      AUTH_SECRET: envField.string({ context: "server", access: "secret" }),
      ALLOWED_EMAILS: envField.string({ context: "server", access: "secret", optional: true })
    }
  }

});
