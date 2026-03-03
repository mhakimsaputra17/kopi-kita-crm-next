import { AVAILABLE_MODELS } from "@/lib/ai-models";

export async function GET() {
  return Response.json(AVAILABLE_MODELS);
}
