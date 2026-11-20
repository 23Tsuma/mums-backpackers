import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminFromRequest, isSameOriginRequest } from '@/lib/server/admin-auth';
import { isDatabaseConfigured } from '@/lib/server/mysql';
import {
  deletePropertyImage,
  getAccommodationProperty,
  getStoredPropertyImage,
  replacePropertyImage,
  updatePropertyImage,
} from '@/lib/server/properties';
import {
  deleteStoredPropertyImage,
  newPropertyImagePath,
  processPropertyImage,
  storePropertyImage,
} from '@/lib/server/property-images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 5 * 1024 * 1024;
const altTextSchema = z.string().trim().max(180);
const imageUpdateSchema = z.object({
  altText: z.string().trim().max(180).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

function validId(value: string): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 255 ? id : undefined;
}

function isImageId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function logImageError(message: string, error: unknown): void {
  const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
  console.error(message, { code });
}

export async function PATCH(
  request: Request,
  context: { params: { id: string; imageId: string } },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Property image management is temporarily unavailable.' }, { status: 503 });
  }
  try {
    if (!await getAdminFromRequest(request)) {
      return NextResponse.json({ error: 'Please sign in to manage property images.' }, { status: 401 });
    }
    const unitId = validId(context.params.id);
    if (!unitId || !isImageId(context.params.imageId)) {
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    }
    const body: unknown = await request.json();
    const parsed = imageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Review the image details and try again.' }, { status: 400 });
    }
    const updated = await updatePropertyImage(unitId, context.params.imageId, parsed.data);
    if (!updated) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    const property = await getAccommodationProperty(unitId);
    return NextResponse.json({ images: property?.images ?? [] });
  } catch (error) {
    logImageError('Property image details could not be updated.', error);
    return NextResponse.json({ error: 'Image details could not be updated. Please try again.' }, { status: 503 });
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string; imageId: string } },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? '0') > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Choose an image smaller than 4 MB.' }, { status: 413 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Property image management is temporarily unavailable.' }, { status: 503 });
  }

  let newPath: string | undefined;
  try {
    if (!await getAdminFromRequest(request)) {
      return NextResponse.json({ error: 'Please sign in to manage property images.' }, { status: 401 });
    }
    const unitId = validId(context.params.id);
    if (!unitId || !isImageId(context.params.imageId)) {
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    }
    const [property, oldImage] = await Promise.all([
      getAccommodationProperty(unitId),
      getStoredPropertyImage(context.params.imageId),
    ]);
    if (!property || !oldImage?.storagePath.startsWith(`${unitId}/`)) {
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose an image and try again.' }, { status: 400 });
    }
    const parsedAltText = altTextSchema.safeParse(formData.get('altText') ?? property.name);
    if (!parsedAltText.success) {
      return NextResponse.json({ error: 'The image description must be 180 characters or fewer.' }, { status: 400 });
    }
    const processed = await processPropertyImage(file);
    newPath = newPropertyImagePath(unitId);
    await storePropertyImage(newPath, processed.buffer);
    const oldPath = await replacePropertyImage(
      unitId,
      context.params.imageId,
      newPath,
      parsedAltText.data || property.name,
    );
    if (!oldPath) {
      await deleteStoredPropertyImage(newPath);
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    }
    let cleanupWarning: string | undefined;
    try {
      await deleteStoredPropertyImage(oldPath);
    } catch (cleanupError) {
      logImageError('Replaced property image cleanup failed.', cleanupError);
      cleanupWarning = 'The new image is active, but the old stored file could not be removed.';
    }
    return NextResponse.json({
      replaced: true,
      width: processed.width,
      height: processed.height,
      warning: cleanupWarning,
    });
  } catch (error) {
    if (newPath) {
      try {
        await deleteStoredPropertyImage(newPath);
      } catch (cleanupError) {
        logImageError('Failed replacement image cleanup failed.', cleanupError);
      }
    }
    if (error instanceof Error && (
      error.message.startsWith('Choose a JPG')
      || error.message.startsWith('The uploaded file')
      || error.message.startsWith('The image contents')
      || error.message.startsWith('The image file')
      || error.message.startsWith('The optimized image')
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logImageError('Property image replacement failed.', error);
    return NextResponse.json({ error: 'The image could not be replaced. Check image storage configuration and try again.' }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string; imageId: string } },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Property image management is temporarily unavailable.' }, { status: 503 });
  }
  let storagePath: string | undefined;
  try {
    if (!await getAdminFromRequest(request)) {
      return NextResponse.json({ error: 'Please sign in to manage property images.' }, { status: 401 });
    }
    const unitId = validId(context.params.id);
    if (!unitId || !isImageId(context.params.imageId)) {
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    }
    storagePath = await deletePropertyImage(unitId, context.params.imageId);
    if (!storagePath) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    let cleanupWarning: string | undefined;
    try {
      await deleteStoredPropertyImage(storagePath);
    } catch (cleanupError) {
      logImageError('Deleted property image cleanup failed.', cleanupError);
      cleanupWarning = 'The photograph is no longer listed, but its stored file could not be removed.';
    }
    const property = await getAccommodationProperty(unitId);
    return NextResponse.json({ images: property?.images ?? [], warning: cleanupWarning });
  } catch (error) {
    logImageError('Property image could not be deleted.', error);
    return NextResponse.json({ error: 'The image could not be deleted. Please try again.' }, { status: 503 });
  }
}
