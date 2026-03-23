import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['brat-parser-lib'],
  outputFileTracingRoot: path.join(__dirname, '../'),
  /* config options here */
};

export default nextConfig;


