import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { StorageClient } from '@supabase/storage-js';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40000000;
const STORAGE_BUCKET = 'property-images';
const allowedTypes = new Map([
  ['image/jpeg', 'jpeg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

let supabaseStorage: StorageClient | undefined;
let bucketReady: Promise<void> | undefined;

export interface ProcessedPropertyImage {
  buffer: Buffer;
  width: number;
  height: number;
}

function isProductionStorageConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function getLocalStorageRoot(): string {
  return path.resolve(process.cwd(), '.property-images');
}

function validateStoragePath(storagePath: string): void {
  if (!/^\d{1,3}\/[0-9a-f-]{36}\.webp$/.test(storagePath)) {
    throw new Error('Invalid property image storage path.');
  }
}

function getSupabaseStorage(): StorageClient {
  if (supabaseStorage) return supabaseStorage;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Durable property image storage is not configured.');

  supabaseStorage = new StorageClient(`${url}/storage/v1`, {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  });
  return supabaseStorage;
}

async function ensureStorageBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const storage = getSupabaseStorage();
      const { data: bucket, error: getError } = await storage.getBucket(STORAGE_BUCKET);
      if (!getError && bucket) return;

      const { error: createError } = await storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_UPLOAD_BYTES,
        allowedMimeTypes: ['image/webp'],
      });
      if (createError) {
        const { data: existingBucket, error: checkError } = await storage.getBucket(STORAGE_BUCKET);
        if (checkError || !existingBucket) {
          bucketReady = undefined;
          throw new Error('Could not initialize property image storage.');
        }
      }
    })();
  }
  await bucketReady;
}

export async function processPropertyImage(file: File): Promise<ProcessedPropertyImage> {
  const expectedFormat = allowedTypes.get(file.type);
  if (!expectedFormat || file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Choose a JPG, PNG, or WebP image smaller than 4 MB.');
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (input.length !== file.size || input.length > MAX_UPLOAD_BYTES) {
    throw new Error('The image file is invalid or too large.');
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new Error('The uploaded file is not a supported image.');
  }
  if (metadata.format !== expectedFormat || !metadata.width || !metadata.height) {
    throw new Error('The image contents do not match the selected file type.');
  }

  const result = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: 2000, height: 1500, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  if (result.data.length > MAX_UPLOAD_BYTES) {
    throw new Error('The optimized image is too large to store.');
  }

  return { buffer: result.data, width: result.info.width, height: result.info.height };
}

export function newPropertyImagePath(unitId: number): string {
  return `${unitId}/${randomUUID()}.webp`;
}

export async function storePropertyImage(storagePath: string, buffer: Buffer): Promise<void> {
  validateStoragePath(storagePath);
  if (isProductionStorageConfigured()) {
    await ensureStorageBucket();
    const { error } = await getSupabaseStorage()
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: 'image/webp', upsert: false, cacheControl: '3600' });
    if (error) throw new Error('Property image storage rejected the upload.');
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Durable property image storage is not configured.');
  }

  const root = getLocalStorageRoot();
  const target = path.resolve(root, storagePath);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid property image storage path.');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer, { flag: 'wx' });
}

export async function readPropertyImage(storagePath: string): Promise<Buffer> {
  validateStoragePath(storagePath);
  if (isProductionStorageConfigured()) {
    const { data, error } = await getSupabaseStorage()
      .from(STORAGE_BUCKET)
      .download(storagePath);
    if (error || !data) throw new Error('Property image could not be loaded from storage.');
    return Buffer.from(await data.arrayBuffer());
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Durable property image storage is not configured.');
  }

  const root = getLocalStorageRoot();
  const target = path.resolve(root, storagePath);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid property image storage path.');
  return readFile(target);
}

export async function deleteStoredPropertyImage(storagePath: string): Promise<void> {
  validateStoragePath(storagePath);
  if (isProductionStorageConfigured()) {
    const { error } = await getSupabaseStorage()
      .from(STORAGE_BUCKET)
      .remove([storagePath]);
    if (error) throw new Error('Property image could not be removed from storage.');
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Durable property image storage is not configured.');
  }

  const root = getLocalStorageRoot();
  const target = path.resolve(root, storagePath);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid property image storage path.');
  await rm(target, { force: true });
}
