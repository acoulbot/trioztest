/** @type {import('next').NextConfig} */
import fs from "fs";
import path from "path";

// Copy @jitsi/rnnoise-wasm assets to public/ at build time
try {
  const rnnoiseWasm = path.resolve("node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.wasm");
  const rnnoiseSync = path.resolve("node_modules/@jitsi/rnnoise-wasm/dist/rnnoise-sync.js");
  if (fs.existsSync(rnnoiseWasm))
    fs.copyFileSync(rnnoiseWasm, path.resolve("public/rnnoise.wasm"));
  if (fs.existsSync(rnnoiseSync)) {
    const workletsDir = path.resolve("public/worklets");
    if (!fs.existsSync(workletsDir)) fs.mkdirSync(workletsDir, { recursive: true });
    fs.copyFileSync(rnnoiseSync, path.resolve("public/worklets/rnnoise-sync.js"));
  }
} catch (err) {
  console.warn("[next.config] rnnoise copy skipped:", err.message);
}

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' blob:",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' ws: wss: https://api.openai.com https://api.anthropic.com",
      "media-src 'self' blob:",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    ].join("; "),
  },
];

const nextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
