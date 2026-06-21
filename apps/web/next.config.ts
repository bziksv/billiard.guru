import { config } from "dotenv";
import { resolve } from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

config({ path: resolve(__dirname, ".env") });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Ограничение воркеров сборки (Beget Docker: os.cpus()≈55, cgroup не даёт столько потоков). */
const buildCpusRaw = process.env.NEXT_BUILD_CPUS;
const buildCpus =
  buildCpusRaw !== undefined && buildCpusRaw !== ""
    ? Math.max(1, Number.parseInt(buildCpusRaw, 10) || 1)
    : undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  ...(buildCpus
    ? {
        experimental: {
          cpus: buildCpus,
          staticGenerationMaxConcurrency: buildCpus,
        },
      }
    : {}),
};

export default withNextIntl(nextConfig);
