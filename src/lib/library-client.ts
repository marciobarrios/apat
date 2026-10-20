import { z } from "zod";

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
};
export class LibraryError extends Error {
  constructor(public readonly code: string) {
    super(
      messages[code] ??
        "The service could not complete the request. Your draft is still here; try again.",
    );
  }
}
export async function libraryRequest<T>(path: string, schema: z.ZodType<T>, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
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
