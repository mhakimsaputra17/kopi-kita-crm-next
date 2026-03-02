import OpenAI from "openai";

/**
 * OpenAI client configured for GitHub Models endpoint.
 * Uses GITHUB_TOKEN for authentication against https://models.github.ai/inference
 * Model: openai/gpt-5-mini
 */
export const openai = new OpenAI({
  baseURL: "https://models.github.ai/inference",
  apiKey: process.env.GITHUB_TOKEN,
});

export const AI_MODEL = "openai/gpt-5-mini";
