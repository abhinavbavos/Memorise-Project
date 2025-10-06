import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

// Read from env so you can disable in dev if you want
const REQUIRE_SSE = String(process.env.REQUIRE_SSE).toLowerCase() === "true";

// Generate a presigned PUT URL
export async function getPresignedPutURL({ key, contentType, expires = 60 }) {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ...(REQUIRE_SSE ? { ServerSideEncryption: "AES256" } : {}),
  };
  const command = new PutObjectCommand(params);
  return await getSignedUrl(s3Client, command, { expiresIn: expires });
}

// Generate a presigned GET URL
export async function getPresignedGetURL({
  key,
  expires = 300,
  asDownloadName,
}) {
  const params = { Bucket: process.env.S3_BUCKET, Key: key };
  if (asDownloadName) {
    params.ResponseContentDisposition = `attachment; filename="${asDownloadName}"`;
  }
  const command = new GetObjectCommand(params);
  return await getSignedUrl(s3Client, command, { expiresIn: expires });
}

// Optional backward-compat alias
export { getPresignedGetURL as getSignedGetURL };

export default s3Client;
