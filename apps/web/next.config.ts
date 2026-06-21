import { config } from "dotenv";
import { resolve } from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

config({ path: resolve(__dirname, ".env") });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
};

export default withNextIntl(nextConfig);
