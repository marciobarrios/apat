import { importsApi } from "@/server/import-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return importsApi(request, "save", (await context.params).id);
}
