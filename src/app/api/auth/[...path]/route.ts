import { getAuth } from "@/server/auth";
import { readConfig } from "@/server/config";
import { assertSameOrigin, errorResponse } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  try {
    const response = await getAuth().handler().GET(request, context);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request, readConfig().APP_ORIGIN);
    const response = await getAuth().handler().POST(request, context);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
