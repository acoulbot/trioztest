/** @type {import('next').NextConfig} */
// Ensure WASM files are served correctly
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
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
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
