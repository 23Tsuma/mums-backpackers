'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Archive,
  BedDouble,
  CheckCircle2,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

type PropertyImage = {
  id: string;
  url: string;
  altText: string;
  isFeatured: boolean;
  sortOrder: number;
};

type Property = {
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
  images: PropertyImage[];
};

type PropertyForm = {
  name: string;
  accommodationType: string;
  description: string;
  location: string;
  bedrooms: string;
  bathrooms: string;
  hasSittingRoom: boolean;
  childAccommodationNotes: string;
  maxChildren: string;
  extraBedsAvailable: string;
  extraBedNotes: string;
  amenities: string;
  nightlyPrice: string;
};

const emptyForm: PropertyForm = {
  name: '',
  accommodationType: 'One-bedroom apartment',
  description: '',
  location: '',
  bedrooms: '1',
  bathrooms: '',
  hasSittingRoom: true,
  childAccommodationNotes: '',
  maxChildren: '',
  extraBedsAvailable: '',
  extraBedNotes: '',
  amenities: '',
  nightlyPrice: '',
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

function SelectedImagePreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url
    ? <Image src={url} alt={`Preview ${file.name}`} width={160} height={100} unoptimized className="h-20 w-full object-cover" />
    : <div className="h-20 bg-sage-50" aria-hidden="true" />;
}

function nullableNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

function toForm(property: Property): PropertyForm {
  return {
    name: property.name,
    accommodationType: property.accommodationType,
    description: property.description,
    location: property.location,
    bedrooms: String(property.bedrooms),
    bathrooms: property.bathrooms === null ? '' : String(property.bathrooms),
    hasSittingRoom: property.hasSittingRoom,
    childAccommodationNotes: property.childAccommodationNotes,
    maxChildren: property.maxChildren === null ? '' : String(property.maxChildren),
    extraBedsAvailable: property.extraBedsAvailable === null ? '' : String(property.extraBedsAvailable),
    extraBedNotes: property.extraBedNotes,
    amenities: property.amenities.join(', '),
    nightlyPrice: property.nightlyPrice === null ? '' : String(property.nightlyPrice),
  };
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const result = await response.json() as { error?: string };
    return result.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadProperties = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/properties', { cache: 'no-store' });
      if (!response.ok) throw new Error(await responseError(response, 'Properties could not be loaded.'));
      const result = await response.json() as { properties: Property[] };
      setProperties(result.properties);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Properties could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProperties(); }, [loadProperties]);

  function resetEditor() {
    setForm(emptyForm);
    setSelectedFiles([]);
    setEditingId(null);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const invalid = files.find((file) => !allowedTypes.includes(file.type) || file.size < 1 || file.size > MAX_FILE_SIZE);
    if (invalid) {
      setError('Choose JPG, PNG, or WebP images smaller than 4 MB each.');
      event.target.value = '';
      return;
    }
    setError('');
    setSelectedFiles((current) => [...current, ...files].slice(0, 12));
    event.target.value = '';
  }

  async function uploadImages(property: Property, files: File[]) {
    for (let index = 0; index < files.length; index += 1) {
      const data = new FormData();
      data.set('file', files[index]);
      data.set('altText', property.name);
      const response = await fetch(`/api/admin/properties/${property.id}/images`, { method: 'POST', body: data });
      if (!response.ok) throw new Error(await responseError(response, 'Property details were saved, but an image could not be uploaded.'));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setError('');

    const payload = {
      ...form,
      bedrooms: Number(form.bedrooms),
      bathrooms: nullableNumber(form.bathrooms),
      maxChildren: nullableNumber(form.maxChildren),
      extraBedsAvailable: nullableNumber(form.extraBedsAvailable),
      nightlyPrice: nullableNumber(form.nightlyPrice),
      amenities: form.amenities.split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
    };

    let savedProperty: Property;
    try {
      const response = await fetch(
        editingId ? `/api/admin/properties/${editingId}` : '/api/admin/properties',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(await responseError(response, 'Property details could not be saved.'));
      const result = await response.json() as { property: Property };
      savedProperty = result.property;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Property details could not be saved.');
      setBusy(false);
      return;
    }

    if (selectedFiles.length > 0) {
      try {
        await uploadImages(savedProperty, selectedFiles);
      } catch (uploadError) {
        setNotice('Property details were saved. Some images still need uploading.');
        setError(uploadError instanceof Error ? uploadError.message : 'One or more images could not be uploaded.');
        resetEditor();
        await loadProperties();
        setBusy(false);
        return;
      }
    }

    setNotice(editingId ? 'Property details updated.' : 'Property added.');
    resetEditor();
    await loadProperties();
    setBusy(false);
  }

  function beginEdit(property: Property) {
    setEditingId(property.id);
    setForm(toForm(property));
    setSelectedFiles([]);
    setError('');
    setNotice('');
  }

  async function toggleActive(property: Property) {
    const action = property.isActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} ${property.name}? Existing booking history will be kept.`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !property.isActive }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'The property status could not be changed.'));
      setNotice(property.isActive ? 'Property deactivated; existing bookings were kept.' : 'Property reactivated.');
      await loadProperties();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'The property status could not be changed.');
    } finally {
      setBusy(false);
    }
  }

  async function updateImage(
    property: Property,
    image: PropertyImage,
    updates: { altText?: string; isFeatured?: boolean; sortOrder?: number },
  ) {
    setError('');
    try {
      const response = await fetch(`/api/admin/properties/${property.id}/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(await responseError(response, 'Image settings could not be saved.'));
      await loadProperties();
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'Image settings could not be saved.');
    }
  }

  async function replaceImage(property: Property, image: PropertyImage, file?: File) {
    if (!file) return;
    if (!allowedTypes.includes(file.type) || file.size < 1 || file.size > MAX_FILE_SIZE) {
      setError('Choose a JPG, PNG, or WebP image smaller than 4 MB.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = new FormData();
      data.set('file', file);
      data.set('altText', image.altText || property.name);
      const response = await fetch(`/api/admin/properties/${property.id}/images/${image.id}`, { method: 'PUT', body: data });
      if (!response.ok) throw new Error(await responseError(response, 'Image replacement failed.'));
      const result = await response.json() as { warning?: string };
      setNotice(result.warning || 'Property photograph replaced.');
      await loadProperties();
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : 'Image replacement failed.');
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(property: Property, image: PropertyImage) {
    if (!window.confirm('Delete this photograph? This cannot be undone.')) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/properties/${property.id}/images/${image.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response, 'The photograph could not be deleted.'));
      const result = await response.json() as { warning?: string };
      setNotice(result.warning || 'Photograph deleted.');
      await loadProperties();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The photograph could not be deleted.');
    }
  }

  return (
    <div>
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Accommodation inventory</p>
          <h1 className="mt-3 font-display text-4xl text-forest-950 sm:text-5xl">Properties.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">Manage apartment information and photographs. Standard occupancy remains limited to two adults; child and additional-bed capacity stays unconfigured until you enter it.</p>
        </div>
        <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-500">{properties.length} {properties.length === 1 ? 'property' : 'properties'}</span>
      </header>

      {notice && <p className="mb-5 flex items-center gap-2 rounded-xl bg-sage-50 px-4 py-3 text-sm font-medium text-forest-800" role="status"><CheckCircle2 size={17} />{notice}</p>}
      {error && <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">{error}</p>}

      <div className="grid gap-8 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)] xl:items-start">
        <section className="rounded-2xl border border-sage-100 bg-white p-5 shadow-[0_8px_30px_rgba(26,61,42,0.04)] sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{editingId ? 'Edit listing' : 'New listing'}</p>
              <h2 className="mt-2 font-display text-3xl text-forest-950">{editingId ? 'Update property' : 'Add a property'}</h2>
            </div>
            {editingId !== null && <button type="button" onClick={resetEditor} aria-label="Cancel editing" className="rounded-full p-2 text-ink-400 hover:bg-cream-100"><X size={18} /></button>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label sm:col-span-2">Property name *<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field-input" /></label>
              <label className="field-label">Accommodation type<input required maxLength={120} value={form.accommodationType} onChange={(event) => setForm({ ...form, accommodationType: event.target.value })} className="field-input" /></label>
              <label className="field-label">Location<input maxLength={255} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="field-input" placeholder="Area or neighbourhood" /></label>
              <label className="field-label">Bedrooms<input required type="number" min={1} max={20} value={form.bedrooms} onChange={(event) => setForm({ ...form, bedrooms: event.target.value })} className="field-input" /></label>
              <label className="field-label">Bathrooms<input type="number" min={0} max={20} step={0.5} value={form.bathrooms} onChange={(event) => setForm({ ...form, bathrooms: event.target.value })} className="field-input" placeholder="Not set" /></label>
              <div className="rounded-xl bg-cream-50 p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-forest-950">Standard maximum occupancy: 2 adults</p>
                <p className="mt-1 text-xs leading-5 text-ink-500">This reflects the current booking rules and cannot be increased from property settings.</p>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-sage-100 p-4 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.hasSittingRoom} onChange={(event) => setForm({ ...form, hasSittingRoom: event.target.checked })} className="mt-1 accent-forest-800" />
                <span><span className="font-semibold text-forest-950">Sitting room available</span><span className="mt-1 block text-xs text-ink-500">May be used for additional child beds only after administrator approval.</span></span>
              </label>
              <label className="field-label sm:col-span-2">Description<textarea maxLength={4000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="field-input resize-y" /></label>
              <label className="field-label sm:col-span-2">Amenities<textarea maxLength={1600} rows={3} value={form.amenities} onChange={(event) => setForm({ ...form, amenities: event.target.value })} className="field-input resize-y" placeholder="Separate amenities with commas" /></label>
              <label className="field-label">Nightly price<input type="number" min={0} max={1000000} step={0.01} value={form.nightlyPrice} onChange={(event) => setForm({ ...form, nightlyPrice: event.target.value })} className="field-input" placeholder="Not set" /></label>
              <p className="self-center text-xs leading-5 text-ink-400">Currency display is managed in business settings.</p>
              <label className="field-label sm:col-span-2">Child sleeping arrangements<textarea maxLength={2000} rows={3} value={form.childAccommodationNotes} onChange={(event) => setForm({ ...form, childAccommodationNotes: event.target.value })} className="field-input resize-y" placeholder="Describe the arrangement; leave capacity unset until verified." /></label>
              <label className="field-label">Maximum children<input type="number" min={0} max={20} value={form.maxChildren} onChange={(event) => setForm({ ...form, maxChildren: event.target.value })} className="field-input" placeholder="Not configured" /></label>
              <label className="field-label">Additional beds available<input type="number" min={0} max={20} value={form.extraBedsAvailable} onChange={(event) => setForm({ ...form, extraBedsAvailable: event.target.value })} className="field-input" placeholder="Not configured" /></label>
              <label className="field-label sm:col-span-2">Additional-bed information<textarea maxLength={2000} rows={2} value={form.extraBedNotes} onChange={(event) => setForm({ ...form, extraBedNotes: event.target.value })} className="field-input resize-y" /></label>
              <div className="sm:col-span-2">
                <p className="field-label">Photographs</p>
                <label className="mt-2 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-sage-200 bg-cream-50 px-4 py-6 text-center hover:border-forest-600">
                  <ImagePlus className="text-forest-700" size={25} />
                  <span className="mt-2 text-sm font-semibold text-forest-900">Choose JPG, PNG, or WebP</span>
                  <span className="mt-1 text-xs text-ink-400">Up to 4 MB each; optimized as WebP on upload</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} className="sr-only" />
                </label>
                {selectedFiles.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{selectedFiles.map((file, index) => <div key={`${file.name}-${index}`} className="overflow-hidden rounded-lg bg-cream-50"><SelectedImagePreview file={file} /><p className="truncate px-2 py-1 text-[10px] text-ink-500">{file.name}</p></div>)}</div>}
              </div>
            </div>
            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-950 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-forest-800 disabled:cursor-wait disabled:opacity-60">
              {busy ? 'Saving…' : editingId ? 'Save property changes' : 'Add property'} {editingId ? <Save size={16} /> : <Plus size={17} />}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2"><BedDouble size={18} className="text-gold-700" /><h2 className="font-display text-2xl text-forest-950">Your properties</h2></div>
          {loading ? <p className="rounded-xl bg-white p-6 text-sm text-ink-500">Loading properties…</p>
            : properties.length === 0 ? <div className="rounded-2xl border border-dashed border-sage-200 bg-white p-8 text-center"><ImagePlus className="mx-auto text-gold-600" size={28} /><p className="mt-3 font-display text-2xl text-forest-950">No properties yet.</p><p className="mt-2 text-sm text-ink-500">Add your first property with the form.</p></div>
              : <div className="space-y-4">{properties.map((property) => (
                <article key={property.id} className="overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-[0_8px_30px_rgba(26,61,42,0.04)]">
                  {property.images.length > 0
                    ? <div className="grid grid-cols-3 gap-1 bg-cream-100">{property.images.slice(0, 3).map((image) => <div key={image.id} className="relative aspect-[1.4] bg-sage-50"><Image src={image.url} alt={image.altText} fill unoptimized className="object-cover" /></div>)}</div>
                    : <div className="flex aspect-[4/1] items-center justify-center gap-2 bg-cream-50 text-xs text-ink-400"><ImagePlus size={17} /> No photographs added</div>}
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl text-forest-950">{property.name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${property.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{property.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-1 text-xs text-ink-400">{property.unitCode} · {property.accommodationType} · {property.adultCapacity} adults</p></div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => beginEdit(property)} className="inline-flex items-center gap-1.5 rounded-full border border-sage-200 px-3 py-2 text-xs font-bold text-forest-700"><Pencil size={13} /> Edit</button>
                        <button type="button" disabled={busy} onClick={() => void toggleActive(property)} aria-label={property.isActive ? 'Deactivate property' : 'Reactivate property'} className="rounded-full border border-sage-200 p-2 text-ink-500 disabled:opacity-50">{property.isActive ? <Archive size={15} /> : <CheckCircle2 size={15} />}</button>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-500">{property.description || 'No description added.'}</p>
                    {property.location && <p className="mt-2 flex items-center gap-1 text-xs text-ink-400"><MapPin size={13} />{property.location}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {property.images.map((image, index) => (
                        <div key={image.id} className="group relative h-16 w-16 overflow-hidden rounded-lg bg-sage-50">
                          <Image src={image.url} alt={image.altText} fill unoptimized className="object-cover" />
                          {image.isFeatured && <span className="absolute left-1 top-1 rounded bg-gold-300 p-1 text-forest-950" title="Featured"><Star size={11} fill="currentColor" /></span>}
                          <div className="absolute inset-0 flex items-end justify-center gap-1 bg-forest-950/75 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            <label className="cursor-pointer rounded p-1 text-white hover:bg-white/20" title="Replace photo"><Upload size={12} /><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void replaceImage(property, image, event.target.files?.[0]); event.target.value = ''; }} /></label>
                            <button type="button" onClick={() => { const altText = window.prompt('Describe this photograph for accessibility:', image.altText); if (altText !== null) void updateImage(property, image, { altText }); }} className="rounded px-1 text-[10px] font-bold text-white hover:bg-white/20" aria-label="Edit image description" title="Edit image description">ALT</button>
                            <button type="button" onClick={() => void updateImage(property, image, { isFeatured: true })} className="rounded p-1 text-white hover:bg-white/20" aria-label="Set as featured" title="Set as featured"><Star size={12} /></button>
                            <button type="button" disabled={index === 0} onClick={() => void updateImage(property, image, { sortOrder: Math.max(0, image.sortOrder - 1) })} className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-40" aria-label="Move photograph earlier">↑</button>
                            <button type="button" disabled={index === property.images.length - 1} onClick={() => void updateImage(property, image, { sortOrder: image.sortOrder + 1 })} className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-40" aria-label="Move photograph later">↓</button>
                            <button type="button" onClick={() => void removeImage(property, image)} className="rounded p-1 text-white hover:bg-red-600" aria-label="Delete photograph"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                      <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border border-dashed border-sage-200 text-forest-700 hover:border-forest-600" title="Add photographs"><Plus size={18} /><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={async (event) => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = '';
                        if (!files.length) return;
                        if (files.some((file) => !allowedTypes.includes(file.type) || file.size < 1 || file.size > MAX_FILE_SIZE)) {
                          setError('Choose JPG, PNG, or WebP images smaller than 4 MB each.');
                          return;
                        }
                        setBusy(true);
                        setError('');
                        try {
                          await uploadImages(property, files);
                          setNotice('Photographs uploaded.');
                          await loadProperties();
                        } catch (uploadError) {
                          setError(uploadError instanceof Error ? uploadError.message : 'The photographs could not be uploaded.');
                          await loadProperties();
                        } finally {
                          setBusy(false);
                        }
                      }} /></label>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-400">
                      {property.bedrooms} bedroom{property.bedrooms === 1 ? '' : 's'}
                      {property.bathrooms !== null && ` · ${property.bathrooms} bathrooms`}
                      {property.nightlyPrice !== null && ` · ${property.nightlyPrice.toFixed(2)} per night`}
                      {property.maxChildren !== null ? ` · up to ${property.maxChildren} children (configured)` : ' · child capacity not configured'}
                    </div>
                  </div>
                </article>
              ))}</div>}
        </section>
      </div>
    </div>
  );
}
