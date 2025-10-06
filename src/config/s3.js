// config/s3.js
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

// Strip checksum headers during presign (prevents x-amz-sdk-checksum-* from being hoisted)
s3Client.middlewareStack.add(
  (next, ctx) => async (args) => {
    if (ctx.commandName === "PutObjectCommand") {
      // ensure none of the checksum fields are present
      delete args.input?.ChecksumCRC32;
      delete args.input?.ChecksumCRC32C;
      delete args.input?.ChecksumSHA1;
      delete args.input?.ChecksumSHA256;
      // and if the request already has headers, remove them
      if (args.request?.headers) {
        delete args.request.headers["x-amz-sdk-checksum-algorithm"];
        delete args.request.headers["x-amz-checksum-crc32"];
        delete args.request.headers["x-amz-checksum-crc32c"];
        delete args.request.headers["x-amz-checksum-sha1"];
        delete args.request.headers["x-amz-checksum-sha256"];
      }
    }
    return next(args);
  },
  { name: "stripChecksumsForPresign", step: "build", priority: "high" }
);

// If you still want server-side encryption, keep it here; otherwise omit.
const REQUIRE_SSE = false; // you removed the policy; set true later if you re-enforce

export async function getPresignedPutURL({ key, contentType, expires = 60 }) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ...(REQUIRE_SSE ? { ServerSideEncryption: "AES256" } : {}),
  });

  const url = await getSignedUrl(s3Client, cmd, {
    expiresIn: expires,
    // hard block any accidental checksum headers from being signed/hoisted
    unsignableHeaders: new Set([
      "x-amz-sdk-checksum-algorithm",
      "x-amz-checksum-crc32",
      "x-amz-checksum-crc32c",
      "x-amz-checksum-sha1",
      "x-amz-checksum-sha256",
    ]),
  });

  const requiredHeaders = {
    "Content-Type": contentType || "application/octet-stream",
    ...(REQUIRE_SSE ? { "x-amz-server-side-encryption": "AES256" } : {}),
  };

  return { url, key, requiredHeaders };
}

export async function getPresignedGetURL({
  key,
  expires = 300,
  asDownloadName,
}) {
  const params = { Bucket: process.env.S3_BUCKET, Key: key };
  if (asDownloadName)
    params.ResponseContentDisposition = `attachment; filename="${asDownloadName}"`;
  const cmd = new GetObjectCommand(params);
  return await getSignedUrl(s3Client, cmd, { expiresIn: expires });
}
