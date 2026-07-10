import { Hono } from 'hono';
import { getSupabase } from '../utils/supabase';
import { keysToCamel } from '../utils/caseConverter';
import { authMiddleware, requirePermission } from '../middleware/auth';

type Variables = { businessId: string; userId: string; roleId: string };
export const settingsRoute = new Hono<{ Bindings: any, Variables: Variables }>();

settingsRoute.use('*', authMiddleware);

settingsRoute.post('/upload', requirePermission('settings.manage'), async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');

  try {
    const body = await c.req.parseBody();
    const data = body['file'] as File;

    if (!data) {
      return c.json({ success: false, error: { message: "File tidak ditemukan" } }, 400);
    }

    const filenameStr = data.name.toLowerCase();
    const isPng = filenameStr.endsWith('.png');
    const isJpg = filenameStr.endsWith('.jpg') || filenameStr.endsWith('.jpeg');

    if (!isPng && !isJpg) {
      return c.json({ success: false, error: { message: "Format tidak didukung. Gunakan PNG atau JPG." } }, 400);
    }

    const typeField = body['type'] as string;
    const type = typeField || 'stamp';

    if (!['stamp', 'signature', 'logo'].includes(type)) {
      return c.json({ success: false, error: { message: "Tipe tidak valid" } }, 400);
    }

    const ext = isPng ? '.png' : '.jpg';
    // Using random UUID, crypto.randomUUID() works in workers
    const filename = `${businessId}-${type}-${crypto.randomUUID()}${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filename, data, { contentType: data.type });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(filename);
    const url = urlData.publicUrl;

    const { data: biz } = await supabase.from('businesses').select('settings').eq('id', businessId).single();
    if (!biz) throw new Error("Bisnis tidak ditemukan");

    const currentSettings = biz.settings || {};
    const newSettings = { ...currentSettings, [`${type}Url`]: url };

    await supabase.from('businesses').update({ settings: newSettings }).eq('id', businessId);

    return c.json({ success: true, data: { url } });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengunggah berkas" } }, 400);
  }
});
