import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Canonical / og:url base: explicit env, then Vercel production URL, else deployment URL. */
function resolvePublicSiteUrl(viteEnv: Record<string, string>): string {
  const explicit = (viteEnv.VITE_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  if (!process.env.VERCEL) return "";
  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === "production" && prodHost) {
    return `https://${prodHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return "";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const site = resolvePublicSiteUrl(env);

  return {
    root: ".",
    publicDir: "public",
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    plugins: [
      {
        name: "inject-canonical-og-url",
        transformIndexHtml(html) {
          if (!site) return html;
          const canonical = `${site}/`;
          const inject = `    <link rel="canonical" href="${canonical}" />\n    <meta property="og:url" content="${canonical}" />\n`;
          return html.replace("</head>", `${inject}</head>`);
        },
      },
    ],
  };
});
