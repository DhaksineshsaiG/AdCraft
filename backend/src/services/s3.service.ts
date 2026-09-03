import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '../config/env';

export interface UploadedPoster {
  key: string;
  url: string;
}

let s3Client: S3Client | undefined;

export async function uploadPoster(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadedPoster> {
  const key = normalizeKey(fileName);
  const bucket = requireBucket();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return {
    key,
    url: buildS3Url(bucket, key),
  };
}

export async function deletePoster(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: requireBucket(),
      Key: normalizeKey(key),
    })
  );
}

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_REGION) {
      throw new Error('AWS S3 storage is not configured.');
    }

    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3Client;
}

function requireBucket(): string {
  if (!env.AWS_S3_BUCKET) {
    throw new Error('AWS S3 bucket is not configured.');
  }

  return env.AWS_S3_BUCKET;
}

function normalizeKey(key: string): string {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized || normalized.includes('..')) {
    throw new Error('Invalid S3 poster key.');
  }

  return normalized;
}

function buildS3Url(bucket: string, key: string): string {
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${encodedKey}`;
}
