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

    if (data.size > 300 * 1024) {
      return c.json({ success: false, error: { message: "Ukuran file maksimum 300KB" } }, 400);
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

    // Get current settings to find old file URL
    const { data: biz } = await supabase.from('businesses').select('settings').eq('id', businessId).single();
    if (!biz) throw new Error("Bisnis tidak ditemukan");
    
    const currentSettings = biz.settings || {};
    const oldUrl = currentSettings[`${type}Url`];

    const ext = isPng ? '.png' : '.jpg';
    const filename = `${businessId}-${type}-${crypto.randomUUID()}${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filename, data, { contentType: data.type });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(filename);
    const url = urlData.publicUrl;

    const newSettings = { ...currentSettings, [`${type}Url`]: url };
    await supabase.from('businesses').update({ settings: newSettings }).eq('id', businessId);

    // Delete old file if it exists (Fire and forget, won't block response)
    if (oldUrl) {
      try {
        const oldFilename = oldUrl.split('/').pop();
        if (oldFilename) {
          await supabase.storage.from('assets').remove([oldFilename]);
        }
      } catch (e) {
        console.error("Failed to delete old asset:", e);
      }
    }

    return c.json({ success: true, data: { url } });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || "Gagal mengunggah berkas" } }, 400);
  }
});

settingsRoute.get('/usage', authMiddleware, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
    const { count: employeeCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
    const { count: warehouseCount } = await supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
    
    return c.json({
      success: true,
      data: keysToCamel({
        products: { used: productCount || 0, max: 500 },
        customers: { used: customerCount || 0, max: 2000 },
        employees: { used: employeeCount || 0, max: 20 },
        warehouses: { used: warehouseCount || 0, max: 5 }
      })
    });
  } catch (e) {
    return c.json({ success: false, error: { message: "Gagal mengambil data pemakaian" } }, 500);
  }
});

settingsRoute.patch('/app-mode', authMiddleware, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const body = await c.req.json();
    const mode = body.mode;
    
    if (mode !== 'simple' && mode !== 'full') {
      return c.json({ success: false, error: { message: "Mode tidak valid" } }, 400);
    }
    
    // Get current settings
    const { data: biz, error: bizErr } = await supabase.from('businesses').select('settings').eq('id', businessId).single();
    if (bizErr || !biz) throw new Error("Bisnis tidak ditemukan");
    
    const currentSettings = biz.settings || {};
    const newSettings = { ...currentSettings, appMode: mode };
    
    const { error: updateErr } = await supabase.from('businesses').update({ settings: newSettings }).eq('id', businessId);
    if (updateErr) throw updateErr;
    
    return c.json({ success: true, message: "Mode aplikasi diperbarui" });
  } catch (e: any) {
    return c.json({ success: false, error: { message: e.message || "Gagal memperbarui mode aplikasi" } }, 500);
  }
});
