import { AcquisitionError } from "./instagram";

export function validateMp4Response(status: number | undefined, contentType: string | undefined) {
  const mime = contentType?.split(";", 1)[0].trim().toLowerCase();
  if (status !== 200 || (mime !== "video/mp4" && mime !== "audio/mp4"))
    throw new AcquisitionError("unsupported_response");
}
