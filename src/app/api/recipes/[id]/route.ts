import { api } from "@/server/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api(request, "get", (await context.params).id);
}
export async function PATCH(request: Request, context: Context) {
  return api(request, "update", (await context.params).id);
}
