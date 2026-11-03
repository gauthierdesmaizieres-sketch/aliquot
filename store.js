import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const isDemo = !SUPABASE_URL;

const blank = () => ({
  code: '', title: '', status: 'running', poste: '', reagents: [], hazards: [], extinguisher: '', instructions: '',
  responsible: '', responsible2: '', phone: '', end_planned: null, sds_links: '', checked_by: '', night: [],
});
export const newReaction = blank;

const SAFETY_FIELDS = ['code', 'hazards', 'extinguisher', 'instructions', 'responsible', 'responsible2', 'night', 'phone', 'end_planned', 'sds_links', 'checked_by'];

function supabaseStore() {
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const urls = new Map();
  return {
    async session() {
      const { data } = await db.auth.getSession();
      if (!data.session) return null;
      return { email: data.session.user.email, allowed: ok(await db.rpc('is_team')) };
    },
    async signIn(email, password) { ok(await db.auth.signInWithPassword({ email, password })); },
    async signUp(email, password) {
      ok(await db.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }));
    },
    async signOut() { await db.auth.signOut(); },
    async accessToken() { return (await db.auth.getSession()).data.session?.access_token ?? null; },
    async teamMembers() { return ok(await db.rpc('team_members')); },
    async listReactions() { return ok(await db.from('reactions').select().order('created_at', { ascending: false })); },
    async getReaction(id) { return ok(await db.from('reactions').select().eq('id', id).single()); },
    async saveReaction(r) { return ok(await db.from('reactions').upsert(r).select().single()); },
    async deleteReaction(id) {
      const entries = await this.listEntries(id);
      const paths = entries.map((e) => e.photo_path).filter(Boolean);
      if (paths.length) ok(await db.storage.from('photos').remove(paths));
      ok(await db.from('reactions').delete().eq('id', id));
    },
    async listEntries(id) { return ok(await db.from('entries').select().eq('reaction_id', id).order('taken_at')); },
    async allEntries() { return ok(await db.from('entries').select('reaction_id, step, tlc, photo_path')); },
    async addEntry(entry, blob) {
      const photo_path = blob ? `${entry.reaction_id}/${crypto.randomUUID()}.jpg` : null;
      if (blob) ok(await db.storage.from('photos').upload(photo_path, blob, { contentType: 'image/jpeg' }));
      return ok(await db.from('entries').insert({ ...entry, photo_path }).select().single());
    },
    async updateEntry(id, patch) { ok(await db.from('entries').update(patch).eq('id', id)); },
    async deleteEntry(e) {
      if (e.photo_path) ok(await db.storage.from('photos').remove([e.photo_path]));
      ok(await db.from('entries').delete().eq('id', e.id));
    },
    async list(table) { return ok(await db.from(table).select().order('created_at', { ascending: false })); },
    async get(table, id) { return ok(await db.from(table).select().eq('id', id).single()); },
    async save(table, row) { return ok(await db.from(table).upsert(row).select().single()); },
    async remove(table, id) { ok(await db.from(table).delete().eq('id', id)); },
    async upload(blob, folder, ext) {
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      ok(await db.storage.from('photos').upload(path, blob, { contentType: blob.type }));
      return path;
    },
    async removeFiles(paths) { if (paths.length) ok(await db.storage.from('photos').remove(paths)); },
    async download(path) { return ok(await db.storage.from('photos').download(path)); },
    async createRoom() { return ok(await db.rpc('create_room')); },
    async roomFiles(room) { return ok(await db.rpc('room_files', { room })); },
    async roomUpload(room, blob) {
      const path = `${room}/${crypto.randomUUID()}.${blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1] ?? 'jpg'}`;
      ok(await db.storage.from('transfer').upload(path, blob, { contentType: blob.type }));
    },
    transferUrl(name) { return db.storage.from('transfer').getPublicUrl(name).data.publicUrl; },
    async closeRoom(room) { ok(await db.rpc('close_room', { room })); },
    async sweep() {
      const names = ok(await db.rpc('expired_files'));
      if (names.length) ok(await db.storage.from('transfer').remove(names));
      ok(await db.rpc('purge_rooms'));
    },
    async photoUrl(path) {
      if (!urls.has(path)) urls.set(path, ok(await db.storage.from('photos').createSignedUrl(path, 3600)).signedUrl);
      return urls.get(path);
    },
    async safety(token) { return ok(await db.rpc('public_safety', { t: token }))?.[0] ?? null; },
  };
}

function demoStore() {
  const open = new Promise((resolve, reject) => {
    const req = indexedDB.open('labphoto-demo', 2);
    req.onupgradeneeded = () => ['reactions', 'entries', 'photos', 'reagents', 'suppliers'].forEach((s) => {
      if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const run = async (store, mode, fn) => {
    const idb = await open;
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    });
  };
  const all = (s) => run(s, 'readonly', (o) => o.getAll());
  const put = (s, v) => run(s, 'readwrite', (o) => o.put(v));
  const del = (s, id) => run(s, 'readwrite', (o) => o.delete(id));
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const urls = new Map();
  return {
    async session() { return { email: 'demo', allowed: true }; },
    async signOut() {},
    async accessToken() { return null; },
    async teamMembers() { return []; },
    async listReactions() { return (await all('reactions')).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async getReaction(rid) { return run('reactions', 'readonly', (o) => o.get(rid)); },
    async saveReaction(r) {
      const row = { id: id(), qr_token: id(), author: 'demo', created_at: new Date().toISOString(), ...r };
      await put('reactions', row);
      return row;
    },
    async deleteReaction(rid) {
      for (const e of await this.listEntries(rid)) await this.deleteEntry(e);
      await del('reactions', rid);
    },
    async listEntries(rid) {
      return (await all('entries')).filter((e) => e.reaction_id === rid).sort((a, b) => a.taken_at.localeCompare(b.taken_at));
    },
    allEntries: () => all('entries'),
    async addEntry(entry, blob) {
      const row = { id: id(), taken_at: new Date().toISOString(), tlc: null, photo_path: null, ...entry };
      if (blob) {
        row.photo_path = id();
        await put('photos', { id: row.photo_path, blob });
      }
      await put('entries', row);
      return row;
    },
    async updateEntry(eid, patch) {
      const row = await run('entries', 'readonly', (o) => o.get(eid));
      await put('entries', { ...row, ...patch });
    },
    async deleteEntry(e) {
      if (e.photo_path) await del('photos', e.photo_path);
      await del('entries', e.id);
    },
    async list(table) { return (await all(table)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    get: (table, rid) => run(table, 'readonly', (o) => o.get(rid)),
    async save(table, r) {
      const row = { id: id(), created_at: new Date().toISOString(), ...r };
      await put(table, row);
      return row;
    },
    remove: del,
    async upload(blob) {
      const path = id();
      await put('photos', { id: path, blob });
      return path;
    },
    async removeFiles(paths) { for (const p of paths) await del('photos', p); },
    async download(path) { return (await run('photos', 'readonly', (o) => o.get(path))).blob; },
    async photoUrl(path) {
      if (!urls.has(path)) urls.set(path, URL.createObjectURL((await run('photos', 'readonly', (o) => o.get(path))).blob));
      return urls.get(path);
    },
    async safety(token) {
      const r = (await all('reactions')).find((x) => x.qr_token === token && x.status === 'running');
      return r ? Object.fromEntries(SAFETY_FIELDS.map((k) => [k, r[k]])) : null;
    },
  };
}

export const store = isDemo ? demoStore() : supabaseStore();
