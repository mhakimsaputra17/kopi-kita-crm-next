import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "langsmith",
    "@langchain/core",
    "@langchain/openai",
    "@langchain/langgraph",
    "@langchain/langgraph-checkpoint",
    "langchain",
  ],
};

export default nextConfig;
