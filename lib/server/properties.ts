import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '@/lib/server/mysql';

export interface PropertyInput {
  name: string;
  accommodationType: string;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number | null;
  hasSittingRoom: boolean;
  childAccommodationNotes: string;
  maxChildren: number | null;
  extraBedsAvailable: number | null;
  extraBedNotes: string;
  amenities: string[];
  nightlyPrice: number | null;
}

export interface PropertyImageRecord extends RowDataPacket {
  id: string;
  unit_id: number;
  storage_path: string;
  alt_text: string;
  is_featured: number;
  sort_order: number;
}

interface PropertyRow extends RowDataPacket {
  id: number;
  unit_code: string;
  name: string;
  accommodation_type: string;
  adult_capacity: number;
  has_sitting_room: number;
  is_active: number;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number | string | null;
  child_accommodation_notes: string | null;
  max_children: number | null;
  extra_beds_available: number | null;
  extra_bed_notes: string | null;
  amenities: string | null;
  nightly_price: number | string | null;
  images?: PropertyImageRecord[];
}

export interface AccommodationProperty {
  id: number;
  unitCode: string;
  name: string;
  accommodationType: string;
  adultCapacity: number;
  hasSittingRoom: boolean;
  isActive: boolean;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number | null;
  childAccommodationNotes: string;
  maxChildren: number | null;
  extraBedsAvailable: number | null;
  extraBedNotes: string;
  amenities: string[];
  nightlyPrice: number | null;
  images: Array<{
    id: string;
    url: string;
    altText: string;
    isFeatured: boolean;
    sortOrder: number;
  }>;
}

function parseAmenities(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function mapProperty(row: PropertyRow): AccommodationProperty {
  return {
    id: Number(row.id),
    unitCode: row.unit_code,
    name: row.name,
    accommodationType: row.accommodation_type,
    adultCapacity: Number(row.adult_capacity),
    hasSittingRoom: Boolean(row.has_sitting_room),
    isActive: Boolean(row.is_active),
    description: row.description ?? '',
    location: row.location ?? '',
    bedrooms: Number(row.bedrooms),
    bathrooms: row.bathrooms === null ? null : Number(row.bathrooms),
    childAccommodationNotes: row.child_accommodation_notes ?? '',
    maxChildren: row.max_children === null ? null : Number(row.max_children),
    extraBedsAvailable: row.extra_beds_available === null ? null : Number(row.extra_beds_available),
    extraBedNotes: row.extra_bed_notes ?? '',
    amenities: parseAmenities(row.amenities),
    nightlyPrice: row.nightly_price === null ? null : Number(row.nightly_price),
    images: (row.images ?? []).map((image) => ({
      id: image.id,
      url: `/api/properties/images/${image.id}`,
      altText: image.alt_text,
      isFeatured: Boolean(image.is_featured),
      sortOrder: Number(image.sort_order),
    })),
  };
}

const propertySelect = `
  SELECT unit.id, unit.unit_code, unit.name, unit.accommodation_type,
         unit.adult_capacity, unit.has_sitting_room, unit.is_active,
         unit.description, unit.location, unit.bedrooms, unit.bathrooms,
         unit.child_accommodation_notes, unit.max_children, unit.extra_beds_available,
         unit.extra_bed_notes, unit.amenities, unit.nightly_price
  FROM accommodation_units AS unit`;

export async function listAccommodationProperties(activeOnly = false): Promise<AccommodationProperty[]> {
  const database = getDatabasePool();
  const [rows] = await database.query<PropertyRow[]>(
    `${propertySelect}
     ${activeOnly ? 'WHERE unit.is_active = TRUE' : ''}
     ORDER BY unit.id ASC`,
  );
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [images] = await database.query<PropertyImageRecord[]>(
    `SELECT id, unit_id, storage_path, alt_text, is_featured, sort_order
     FROM accommodation_unit_images
     WHERE unit_id IN (${ids.map(() => '?').join(', ')})
    ORDER BY sort_order ASC, created_at ASC`,
    ids,
  );
  const imagesByUnit = new Map<number, PropertyImageRecord[]>();
  for (const image of images) {
    const unitId = Number(image.unit_id);
    const unitImages = imagesByUnit.get(unitId) ?? [];
    unitImages.push(image);
    imagesByUnit.set(unitId, unitImages);
  }
  return rows.map((row) => mapProperty({
    ...row,
    images: imagesByUnit.get(Number(row.id)) ?? [],
  }));
}

export async function getAccommodationProperty(id: number): Promise<AccommodationProperty | undefined> {
  const database = getDatabasePool();
  const [rows] = await database.execute<PropertyRow[]>(
    `${propertySelect} WHERE unit.id = ? LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return undefined;
  const [images] = await database.execute<PropertyImageRecord[]>(
    `SELECT id, unit_id, storage_path, alt_text, is_featured, sort_order
     FROM accommodation_unit_images
     WHERE unit_id = ?
    ORDER BY sort_order ASC, created_at ASC`,
    [id],
  );
  return mapProperty({ ...row, images });
}

export async function createAccommodationProperty(input: PropertyInput): Promise<AccommodationProperty> {
  const connection = await getDatabasePool().getConnection();
  let lockAcquired = false;
  let createdId: number | undefined;
  try {
    const [lockRows] = await connection.query<RowDataPacket[]>(
      'SELECT GET_LOCK(?, 5) AS acquired',
      ['mums-backpackers-property-create'],
    );
    if (Number(lockRows[0]?.acquired) !== 1) {
      throw new Error('Could not acquire the property creation lock.');
    }
    lockAcquired = true;

    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM accommodation_units',
    );
    createdId = Number(rows[0]?.next_id);
    if (!Number.isInteger(createdId) || createdId > 255) {
      throw new Error('The current apartment inventory limit has been reached.');
    }
    await connection.execute<ResultSetHeader>(
      `INSERT INTO accommodation_units (
         id, unit_code, name, accommodation_type, adult_capacity, has_sitting_room,
         is_active, description, location, bedrooms, bathrooms,
         child_accommodation_notes, max_children, extra_beds_available,
         extra_bed_notes, amenities, nightly_price
       ) VALUES (?, ?, ?, ?, 2, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createdId,
        `APT-${createdId}`,
        input.name,
        input.accommodationType,
        input.hasSittingRoom,
        input.description,
        input.location,
        input.bedrooms,
        input.bathrooms,
        input.childAccommodationNotes || null,
        input.maxChildren,
        input.extraBedsAvailable,
        input.extraBedNotes || null,
        JSON.stringify(input.amenities),
        input.nightlyPrice,
      ],
    );
  } finally {
    if (lockAcquired) {
      await connection.query('SELECT RELEASE_LOCK(?)', ['mums-backpackers-property-create']);
    }
    connection.release();
  }

  const property = createdId === undefined ? undefined : await getAccommodationProperty(createdId);
  if (!property) throw new Error('Created property could not be read back.');
  return property;
}

export async function updateAccommodationProperty(
  id: number,
  input: PropertyInput,
): Promise<boolean> {
  const [result] = await getDatabasePool().execute<ResultSetHeader>(
    `UPDATE accommodation_units
     SET name = ?, accommodation_type = ?, description = ?, location = ?,
         bedrooms = ?, bathrooms = ?, has_sitting_room = ?, child_accommodation_notes = ?,
         max_children = ?, extra_beds_available = ?, extra_bed_notes = ?,
         amenities = ?, nightly_price = ?
     WHERE id = ?`,
    [
      input.name,
      input.accommodationType,
      input.description,
      input.location,
      input.bedrooms,
      input.bathrooms,
      input.hasSittingRoom,
      input.childAccommodationNotes || null,
      input.maxChildren,
      input.extraBedsAvailable,
      input.extraBedNotes || null,
      JSON.stringify(input.amenities),
      input.nightlyPrice,
      id,
    ],
  );
  if (result.affectedRows > 0) return true;
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    'SELECT id FROM accommodation_units WHERE id = ? LIMIT 1',
    [id],
  );
  return rows.length > 0;
}

export async function setAccommodationPropertyActive(id: number, active: boolean): Promise<boolean> {
  const [result] = await getDatabasePool().execute<ResultSetHeader>(
    'UPDATE accommodation_units SET is_active = ? WHERE id = ?',
    [active, id],
  );
  if (result.affectedRows > 0) return true;
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    'SELECT id FROM accommodation_units WHERE id = ? LIMIT 1',
    [id],
  );
  return rows.length > 0;
}

export async function getStoredPropertyImage(id: string): Promise<{
  storagePath: string;
} | undefined> {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    `SELECT storage_path FROM accommodation_unit_images WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? { storagePath: String(rows[0].storage_path) } : undefined;
}

export async function addPropertyImage(
  unitId: number,
  storagePath: string,
  altText: string,
): Promise<string> {
  const connection = await getDatabasePool().getConnection();
  const id = randomUUID();
  try {
    await connection.beginTransaction();
    const [unitRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM accommodation_units WHERE id = ? FOR UPDATE',
      [unitId],
    );
    if (!unitRows.length) {
      await connection.rollback();
      throw new Error('Property not found.');
    }
    const [countRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS image_count FROM accommodation_unit_images WHERE unit_id = ?',
      [unitId],
    );
    const featured = Number(countRows[0]?.image_count ?? 0) === 0;
    const [orderRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM accommodation_unit_images WHERE unit_id = ?',
      [unitId],
    );
    await connection.execute(
      `INSERT INTO accommodation_unit_images (id, unit_id, storage_path, alt_text, is_featured, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, unitId, storagePath, altText, featured, Number(orderRows[0]?.next_order ?? 0)],
    );
    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function replacePropertyImage(
  unitId: number,
  imageId: string,
  storagePath: string,
  altText: string,
): Promise<string | undefined> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT storage_path FROM accommodation_unit_images
       WHERE id = ? AND unit_id = ? FOR UPDATE`,
      [imageId, unitId],
    );
    if (!rows[0]) {
      await connection.rollback();
      return undefined;
    }
    const oldPath = String(rows[0].storage_path);
    await connection.execute(
      `UPDATE accommodation_unit_images
       SET storage_path = ?, alt_text = ?
       WHERE id = ? AND unit_id = ?`,
      [storagePath, altText, imageId, unitId],
    );
    await connection.commit();
    return oldPath;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePropertyImage(
  unitId: number,
  imageId: string,
  updates: { altText?: string; isFeatured?: boolean; sortOrder?: number },
): Promise<boolean> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [imageRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, sort_order FROM accommodation_unit_images WHERE id = ? AND unit_id = ? FOR UPDATE',
      [imageId, unitId],
    );
    if (!imageRows.length) {
      await connection.rollback();
      return false;
    }
    if (updates.isFeatured) {
      await connection.execute(
        'UPDATE accommodation_unit_images SET is_featured = FALSE WHERE unit_id = ?',
        [unitId],
      );
    }
    if (updates.sortOrder !== undefined) {
      const currentOrder = Number(imageRows[0].sort_order);
      if (updates.sortOrder !== currentOrder) {
        const [otherImages] = await connection.execute<RowDataPacket[]>(
          `SELECT id FROM accommodation_unit_images
           WHERE unit_id = ? AND sort_order = ? AND id <> ?
           LIMIT 1 FOR UPDATE`,
          [unitId, updates.sortOrder, imageId],
        );
        if (otherImages[0]) {
          await connection.execute(
            'UPDATE accommodation_unit_images SET sort_order = ? WHERE id = ?',
            [currentOrder, String(otherImages[0].id)],
          );
        }
      }
    }
    const setters: string[] = [];
    const values: Array<string | number | boolean> = [];
    if (updates.altText !== undefined) {
      setters.push('alt_text = ?');
      values.push(updates.altText);
    }
    if (updates.isFeatured !== undefined) {
      setters.push('is_featured = ?');
      values.push(updates.isFeatured);
    }
    if (updates.sortOrder !== undefined) {
      setters.push('sort_order = ?');
      values.push(updates.sortOrder);
    }
    if (setters.length === 0) {
      await connection.rollback();
      return false;
    }
    values.push(imageId, unitId);
    await connection.execute<ResultSetHeader>(
      `UPDATE accommodation_unit_images
       SET ${setters.join(', ')}
       WHERE id = ? AND unit_id = ?`,
      values,
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deletePropertyImage(unitId: number, imageId: string): Promise<string | undefined> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT storage_path FROM accommodation_unit_images WHERE id = ? AND unit_id = ? FOR UPDATE',
      [imageId, unitId],
    );
    if (!rows[0]) {
      await connection.rollback();
      return undefined;
    }
    await connection.execute(
      'DELETE FROM accommodation_unit_images WHERE id = ? AND unit_id = ?',
      [imageId, unitId],
    );
    const [featuredRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM accommodation_unit_images
       WHERE unit_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1`,
      [unitId],
    );
    if (featuredRows[0]) {
      await connection.execute(
        'UPDATE accommodation_unit_images SET is_featured = TRUE WHERE id = ?',
        [String(featuredRows[0].id)],
      );
    }
    await connection.commit();
    return String(rows[0].storage_path);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
