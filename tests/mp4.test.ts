import { expect, it } from "vitest";
import { validateMp4Response } from "../src/server/sources/mp4";

it.each(["audio/mp4", "video/mp4", "audio/mp4; codecs=mp4a.40.2", " VIDEO/MP4 ; codecs=avc1"])(
  "accepts complete MP4 tracks served as %s",
  (contentType) => expect(() => validateMp4Response(200, contentType)).not.toThrow(),
);
it.each([
  undefined,
  "text/html",
  "audio/mpeg",
  "application/octet-stream",
  "video/mp4-invalid",
  "audio/mp4evil",
])("rejects unsupported content type %s", (contentType) => {
  expect(() => validateMp4Response(200, contentType)).toThrow("unsupported_response");
});
it.each([undefined, 206, 301, 403, 404, 429])(
  "does not accept partial or failed MP4 response %s",
  (status) => {
    expect(() => validateMp4Response(status, "audio/mp4")).toThrow("unsupported_response");
  },
);
