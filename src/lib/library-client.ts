import { z } from "zod";
import { ACCOUNT_SCOPE_HEADER } from "./library-contract";

const messages: Record<string, string> = {
  account_changed: "Your signed-in account changed. Reopen the notebook to continue.",
  setup_required:
    "Private notebooks are waiting for secure account setup. You can still try the sample.",
  sign_in_required: "Sign in with Google to open your private notebook.",
  verified_login_required: "A verified Google account is required.",
  invitation_required:
    "Your account is signed in, but it has not been invited to the private beta.",
  version_conflict:
    "This recipe changed in another tab or device. Reload the library before editing again. Your draft is still here.",
  idempotency_conflict:
    "This save key was already used for different content. Reload the library before trying again.",
  not_found: "This recipe is unavailable in your account.",
  invalid_input: "Check the recipe fields and try again.",
  imports_not_configured:
    "Video imports are waiting for secure setup. You can still add recipes manually.",
  unsupported_url: "Use a public Instagram Reel or a YouTube video / Shorts link.",
  import_budget_exhausted:
    "The notebook’s import credit limit has been reached. You can still add recipes manually.",
  import_limit:
    "An import is still running or the import limit has been reached. Wait before starting another.",
  import_already_started:
    "This video is already being read and can’t be cancelled. Its result will appear here.",
  import_not_ready: "This import is not ready to save. Refresh its status first.",
};
export class LibraryError extends Error {
  constructor(public readonly code: string) {
    super(
      messages[code] ??
        "The service could not complete the request. Your draft is still here; try again.",
    );
  }
}
export async function libraryRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
  expectedAccount?: string,
) {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (expectedAccount) headers.set(ACCOUNT_SCOPE_HEADER, expectedAccount);
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers,
    });
  } catch {
    throw new LibraryError("network_error");
  }
  if (!response.ok) {
    const parsed = z
      .object({ error: z.string() })
      .safeParse(await response.json().catch(() => null));
    throw new LibraryError(parsed.success ? parsed.data.error : "service_unavailable");
  }
  const result = schema.safeParse(await response.json());
  if (!result.success) throw new LibraryError("invalid_response");
  return result.data;
}
