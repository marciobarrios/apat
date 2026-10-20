import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "./server/auth";

export async function proxy(request: NextRequest) {
  try {
    return await getAuth().middleware({ loginUrl: "/" })(request);
  } catch {
    return NextResponse.redirect(new URL("/?auth=unavailable", request.url));
  }
}
export const config = { matcher: ["/library/:path*"] };
