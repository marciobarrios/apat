import { api } from "@/server/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return api(request, "list");
}
export function POST(request: Request) {
  return api(request, "create");
}
