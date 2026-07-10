import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';

type Variables = { businessId: string; userId: string };
export const settingsRoute = new Hono<{ Bindings: any, Variables: Variables }>();

const mockAuth = async (c: any, next: any) => {
  const businessId = c.req.header('x-business-id') || '00000000-0000-0000-0000-000000000000';
  const userId = c.req.header('x-user-id') || '00000000-0000-0000-0000-000000000000';
  c.set('businessId', businessId);
  c.set('userId', userId);
  await next();
};

settingsRoute.use('*', mockAuth);

settingsRoute.post('/upload', async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const body = await c.req.parseBody();
    const type = body['type'] || 'stamp';
    const file = body['file'] as File | undefined;
    
    if (!file) {
      return c.json({ success: false, error: { message: "File tidak ditemukan" } }, 400);
    }
    
    if (!['stamp', 'signature', 'logo'].includes(type as string)) {
      return c.json({ success: false, error: { message: "Tipe tidak valid" } }, 400);
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['png', 'jpg', 'jpeg'].includes(ext || '')) {
      return c.json({ success: false, error: { message: "Format tidak didukung. Gunakan PNG atau JPG." } }, 400);
    }

    const filename = `${businessId}-${type}-${crypto.randomUUID()}.${ext}`;
    
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Gagal mengunggah ke Storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
    const url = publicUrlData.publicUrl;
    
    // Update business settings
    const { data: bizData } = await supabase.from('businesses').select('*').eq('id', businessId).single();
    if (!bizData) throw new Error("Bisnis tidak ditemukan");
    
    const currentSettings = bizData.settings || {};
    const newSettings = { ...currentSettings, [`${type}Url`]: url };
    
    await supabase.from('businesses').update({ settings: newSettings }).eq('id', businessId);
    
    return c.json({ success: true, data: { url } });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengunggah berkas" } }, 400);
  }
});
