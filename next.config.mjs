/** @type {import('next').NextConfig} */
import fs from "fs";
import path from "path";

// Copy @jitsi/rnnoise-wasm assets to public/ at build time
const rnnoiseWasm = path.resolve("node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.wasm");
const rnnoiseSync = path.resolve("node_modules/@jitsi/rnnoise-wasm/dist/rnnoise-sync.js");
if (fs.existsSync(rnnoiseWasm))
  fs.copyFileSync(rnnoiseWasm, path.resolve("public/rnnoise.wasm"));
if (fs.existsSync(rnnoiseSync))
  fs.copyFileSync(rnnoiseSync, path.resolve("public/worklets/rnnoise-sync.js"));

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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' ws: wss: https://api.openai.com https://api.anthropic.com",
      "media-src 'self' blob:",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "frame-ancestors 'none'",
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
