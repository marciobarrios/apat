import { importsApi } from "@/server/import-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return importsApi(request, "get", (await context.params).id);
}
export async function DELETE(request: Request, context: Context) {
  return importsApi(request, "cancel", (await context.params).id);
}
