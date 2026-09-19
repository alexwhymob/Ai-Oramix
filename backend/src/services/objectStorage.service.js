import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
let ready;
function client() { return new S3Client({ endpoint: env.S3_ENDPOINT, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } }); }
export async function archiveExport({ key, body, contentType }) {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) return null;
  const s3 = client();
  if (!ready) ready = s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET })).catch(() => s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }))).then(() => true);
  await ready;
  await s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return key;
}
