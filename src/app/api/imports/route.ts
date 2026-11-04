import { importsApi } from "@/server/import-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export function GET(request: Request) {
  return importsApi(request, "list");
}
export function POST(request: Request) {
  return importsApi(request, "start");
}
