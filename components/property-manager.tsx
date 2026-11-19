'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, ImagePlus, LogOut, Pencil, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

type PropertyImage = {
  id: string;
  storage_path: string;
  alt_text: string;
};

type Property = {
  id: string;
  name: string;
  description: string;
  property_images: PropertyImage[];
};

type PropertyForm = {
  name: string;
  description: string;
};

const emptyForm: PropertyForm = { name: '', description: '' };
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

function publicImageUrl(path: string): string {
  return getSupabaseClient().storage.from('property-images').getPublicUrl(path).data.publicUrl;
}

export default function PropertyManager() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadProperties = useCallback(async (userId: string) => {
    const { data, error: queryError } = await getSupabaseClient()
      .from('properties')
      .select('id, name, description, property_images(id, storage_path, alt_text)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('We could not load your properties. Please refresh and try again.');
      return;
    }
    setProperties((data ?? []) as Property[]);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) void loadProperties(data.session.user.id);
    });

    const { data: listener } = getSupabaseClient().auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession) void loadProperties(nextSession.user.id);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProperties]);

  function resetEditor(): void {
    setForm(emptyForm);
    setSelectedFiles([]);
    setEditingId(null);
    setError('');
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);
    const invalidFile = files.find((file) => !allowedTypes.includes(file.type) || file.size > MAX_FILE_SIZE);
    if (invalidFile) {
      setError('Please choose JPG, PNG, or WebP images up to 5 MB each.');
      event.target.value = '';
      return;
    }
    setError('');
    setSelectedFiles((current) => [...current, ...files]);
    event.target.value = '';
  }

  async function uploadImages(propertyId: string, files: File[]): Promise<boolean> {
    if (!session || files.length === 0) return true;
    const uploadedPaths: string[] = [];

    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${session.user.id}/${propertyId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await getSupabaseClient().storage.from('property-images').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        if (uploadedPaths.length > 0) await getSupabaseClient().storage.from('property-images').remove(uploadedPaths);
        setError('One or more images could not be uploaded. Please try again.');
        return false;
      }
      uploadedPaths.push(path);
    }

    const imageRows = uploadedPaths.map((storagePath) => ({ property_id: propertyId, storage_path: storagePath, alt_text: form.name }));
    const { error: insertError } = await getSupabaseClient().from('property_images').insert(imageRows);
    if (insertError) {
      await getSupabaseClient().storage.from('property-images').remove(uploadedPaths);
      setError('The images could not be saved. Please try again.');
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!session || !form.name.trim()) return;
    setBusy(true);
    setError('');
    setNotice('');

    if (editingId) {
      const { error: updateError } = await getSupabaseClient().from('properties').update({ name: form.name.trim(), description: form.description.trim() }).eq('id', editingId).eq('owner_id', session.user.id);
      if (updateError) {
        setError('Your property details could not be saved. Please try again.');
        setBusy(false);
        return;
      }
      const uploaded = await uploadImages(editingId, selectedFiles);
      if (!uploaded) {
        setBusy(false);
        return;
      }
      await loadProperties(session.user.id);
      setNotice('Property details updated.');
      resetEditor();
      setBusy(false);
      return;
    }

    const { data: property, error: createError } = await getSupabaseClient().from('properties').insert({ name: form.name.trim(), description: form.description.trim() }).select('id').maybeSingle();
    if (createError || !property) {
      setError('Your property could not be created. Please try again.');
      setBusy(false);
      return;
    }
    const uploaded = await uploadImages(property.id as string, selectedFiles);
    if (!uploaded) {
      setBusy(false);
      return;
    }
    await loadProperties(session.user.id);
    setNotice('Property added successfully.');
    resetEditor();
    setBusy(false);
  }

  function beginEdit(property: Property): void {
    setEditingId(property.id);
    setForm({ name: property.name, description: property.description });
    setSelectedFiles([]);
    setNotice('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function removeImage(image: PropertyImage): Promise<void> {
    if (!session) return;
    setError('');
    const { error: deleteRowError } = await getSupabaseClient().from('property_images').delete().eq('id', image.id).eq('owner_id', session.user.id);
    if (deleteRowError) {
      setError('This image could not be removed. Please try again.');
      return;
    }
    await getSupabaseClient().storage.from('property-images').remove([image.storage_path]);
    setProperties((current) => current.map((property) => ({ ...property, property_images: property.property_images.filter((item) => item.id !== image.id) })));
  }

  async function signOut(): Promise<void> {
    await getSupabaseClient().auth.signOut();
    window.location.assign('/');
  }

  if (!isSupabaseConfigured) return <main className="grid min-h-screen place-items-center bg-cream-50 px-6 text-center"><div><Sparkles className="mx-auto text-gold-600" /><h1 className="mt-5 font-display text-4xl text-forest-950">Owner workspace unavailable</h1><p className="mt-3 max-w-md text-sm leading-6 text-ink-500">Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable owner sign-in and property management.</p><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-forest-950 px-6 py-3 text-sm font-bold text-white">Back to website <ArrowUpRight size={16} /></Link></div></main>;
  if (loading) return <main className="grid min-h-screen place-items-center bg-cream-50 text-sm text-ink-500">Loading your workspace…</main>;
  if (!session) return <main className="grid min-h-screen place-items-center bg-cream-50 px-6 text-center"><div><Sparkles className="mx-auto text-gold-600" /><h1 className="mt-5 font-display text-4xl text-forest-950">Owner access required</h1><p className="mt-3 text-sm text-ink-500">Sign in to manage properties and photos.</p><Link href="/login" className="mt-7 inline-flex items-center gap-2 rounded-full bg-forest-950 px-6 py-3 text-sm font-bold text-white">Go to sign in <ArrowUpRight size={16} /></Link></div></main>;

  return <main className="min-h-screen bg-cream-50 text-ink-900"><header className="border-b border-sage-200 bg-cream-50 px-6 lg:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between py-5"><Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-forest-950 text-gold-200"><Sparkles size={17} /></span><span><span className="block font-display text-xl leading-none text-forest-950">Mums</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-700">Backpackers</span></span></Link><div className="flex items-center gap-5 text-sm"><Link href="/" className="hidden items-center gap-2 text-ink-500 sm:flex"><ArrowLeft size={15} /> Website</Link><button type="button" onClick={signOut} className="inline-flex items-center gap-2 font-semibold text-forest-700"><LogOut size={15} /> Sign out</button></div></div></header><div className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-20"><div className="mb-10"><p className="eyebrow">Private workspace</p><h1 className="mt-4 font-display text-5xl text-forest-950">Manage your property.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-ink-500">Add your accommodation details, upload photos, and keep the public presentation up to date.</p></div>{notice && <div className="mb-7 flex items-center gap-3 rounded-xl bg-sage-50 px-5 py-4 text-sm font-medium text-forest-800" role="status"><CheckCircle2 size={18} />{notice}</div>}{error && <div className="mb-7 rounded-xl bg-red-50 px-5 py-4 text-sm font-medium text-red-800" role="alert">{error}</div>}<div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><section className="rounded-2xl bg-white p-6 shadow-[0_12px_50px_rgba(26,61,42,0.07)] sm:p-8"><div className="mb-7 flex items-start justify-between gap-4"><div><p className="eyebrow">{editingId ? 'Edit listing' : 'New listing'}</p><h2 className="mt-2 font-display text-3xl text-forest-950">{editingId ? 'Update your property' : 'Add a property'}</h2></div>{editingId && <button type="button" onClick={resetEditor} className="rounded-full p-2 text-ink-400 hover:bg-cream-100 hover:text-forest-800" aria-label="Cancel editing"><X size={18} /></button>}</div><form onSubmit={handleSubmit} className="space-y-6"><label className="field-label">Property name *<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field-input" placeholder="Mums Backpackers" /></label><label className="field-label">Description<textarea maxLength={2000} rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="field-input resize-none" placeholder="Tell guests what makes this place special..." /></label><div><p className="field-label">Property pictures</p><label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-sage-200 bg-cream-50 px-5 py-8 text-center transition-colors hover:border-forest-600 hover:bg-sage-50"><ImagePlus className="text-forest-700" size={28} /><span className="mt-3 text-sm font-semibold text-forest-900">Choose images</span><span className="mt-1 text-xs text-ink-400">JPG, PNG, or WebP · up to 5 MB each</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} className="sr-only" /></label>{selectedFiles.length > 0 && <div className="mt-4 space-y-2">{selectedFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-cream-50 px-3 py-2 text-xs"><span className="truncate pr-3">{file.name}</span><button type="button" onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove ${file.name}`} className="text-ink-400 hover:text-red-700"><Trash2 size={15} /></button></div>)}</div>}</div><button disabled={busy} className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-forest-950 px-6 py-4 text-sm font-bold text-white transition-all hover:-translate-y-1 hover:bg-forest-800 disabled:cursor-wait disabled:opacity-60">{busy ? 'Saving…' : editingId ? 'Save property changes' : 'Add property'}{!busy && (editingId ? <Save size={16} /> : <Plus size={17} />)}</button></form></section><section><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Your listings</p><h2 className="mt-2 font-display text-3xl text-forest-950">Properties</h2></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-500">{properties.length} {properties.length === 1 ? 'listing' : 'listings'}</span></div>{properties.length === 0 ? <div className="rounded-2xl border border-dashed border-sage-200 bg-white p-10 text-center"><ImagePlus className="mx-auto text-gold-600" size={30} /><h3 className="mt-4 font-display text-2xl text-forest-950">Your first listing starts here.</h3><p className="mt-2 text-sm text-ink-500">Add the property details and photos guests should see.</p></div> : <div className="space-y-5">{properties.map((property) => <article key={property.id} className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(26,61,42,0.05)]"><div className="grid grid-cols-3 gap-1 bg-cream-100">{property.property_images.slice(0, 3).map((image) => <div key={image.id} className="relative aspect-[1.3] overflow-hidden bg-sage-50"><img src={publicImageUrl(image.storage_path)} alt={image.alt_text || property.name} className="h-full w-full object-cover" /></div>)}{property.property_images.length === 0 && <div className="col-span-3 flex aspect-[4/1] items-center justify-center text-xs text-ink-400">No photos yet</div>}</div><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-2xl text-forest-950">{property.name}</h3><p className="mt-2 text-sm leading-6 text-ink-500">{property.description || 'No description added yet.'}</p></div><button type="button" onClick={() => beginEdit(property)} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-sage-200 px-3 py-2 text-xs font-bold text-forest-700 hover:border-forest-600"><Pencil size={14} /> Edit</button></div><div className="mt-5 flex flex-wrap gap-2">{property.property_images.map((image) => <button type="button" key={image.id} onClick={() => void removeImage(image)} className="group relative h-14 w-14 overflow-hidden rounded-lg bg-sage-50" aria-label="Remove image"><img src={publicImageUrl(image.storage_path)} alt="" className="h-full w-full object-cover" /><span className="absolute inset-0 grid place-items-center bg-forest-950/70 text-white opacity-0 transition-opacity group-hover:opacity-100"><Trash2 size={15} /></span></button>)}<button type="button" onClick={() => beginEdit(property)} className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-sage-200 text-forest-700 hover:border-forest-600" aria-label="Add more photos"><Plus size={18} /></button></div></div></article>)}</div>}</section></div></div></main>;
}
