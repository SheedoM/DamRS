import type { RequiredProjectFileType } from "./submission.schema";

export const bucketByFileType: Record<RequiredProjectFileType, string> = {
  documentation_pdf: "project-documents",
  source_code_zip: "project-source-code",
  presentation_file: "project-presentations",
};

// Competition-proof PDFs live in the documents bucket (PDF-only).
export const COMPETITION_BUCKET = "project-documents";

const allBucketsByFileType: Record<string, string> = {
  ...bucketByFileType,
  competition_proof: COMPETITION_BUCKET,
};

export function getBucketForFileType(fileType: RequiredProjectFileType) {
  return bucketByFileType[fileType];
}

export function getBucketForProjectFileType(fileType: unknown) {
  if (typeof fileType !== "string") return null;
  return allBucketsByFileType[fileType] ?? null;
}

export const SIGNED_FILE_URL_EXPIRES_IN_SECONDS = 60 * 60;

type SignedUrlClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{
        data: { signedUrl: string } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export async function createSignedUrlForProjectFile(
  supabase: SignedUrlClient,
  file: { file_type: unknown; storage_path: string | null },
) {
  const bucket = getBucketForProjectFileType(file.file_type);

  if (!bucket || !file.storage_path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(file.storage_path, SIGNED_FILE_URL_EXPIRES_IN_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
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
