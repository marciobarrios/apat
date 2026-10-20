import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "./server/auth";

export async function proxy(request: NextRequest) {
  // OAuth popup/fallback flows can return to the public home page. The SDK
  // skips its loginUrl before exchanging verifiers, so finish on /library.
  if (
    request.nextUrl.pathname === "/" &&
    request.nextUrl.searchParams.has("neon_auth_session_verifier")
  ) {
    const callback = request.nextUrl.clone();
    callback.pathname = "/library";
    return NextResponse.redirect(callback);
  }
  try {
    return await getAuth().middleware({ loginUrl: "/" })(request);
  } catch {
    return NextResponse.redirect(new URL("/?auth=unavailable", request.url));
  }
}
export const config = {
  matcher: [
    "/library/:path*",
    { source: "/", has: [{ type: "query", key: "neon_auth_session_verifier" }] },
  ],
};
