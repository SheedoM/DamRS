import type { RequiredProjectFileType } from "./submission.schema";

export const bucketByFileType: Record<RequiredProjectFileType, string> = {
  documentation_pdf: "project-documents",
  source_code_zip: "project-source-code",
  presentation_file: "project-presentations",
};

export function getBucketForFileType(fileType: RequiredProjectFileType) {
  return bucketByFileType[fileType];
}

function sanitizeFileName(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  const rawName = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  const extension = lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : "bin";
  const safeName =
    rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "project-file";

  return `${safeName}.${extension.replace(/[^a-z0-9]/g, "") || "bin"}`;
}

export function buildProjectStoragePath({
  cycleId,
  projectId,
  fileName,
}: {
  cycleId: string;
  projectId: string;
  fileName: string;
}) {
  return `${cycleId}/${projectId}/${sanitizeFileName(fileName)}`;
}
