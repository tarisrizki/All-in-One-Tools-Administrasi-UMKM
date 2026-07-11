import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { getSupabase } from '../utils/supabase';
import { authMiddleware } from '../middleware/auth';
import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorResponseSchema, createSuccessSchema } from '../schemas/common';

async function checkAndIncrementAiUsage(supabase: SupabaseClient, businessId: string): Promise<boolean> {
  const { data: biz, error } = await supabase.from('businesses').select('settings').eq('id', businessId).single();
  if (error || !biz) return false;
  
  const settings = biz.settings || {};
  const today = new Date().toISOString().split('T')[0];
  
  const aiUsage = settings.aiUsage || { date: today, count: 0 };
  
  if (aiUsage.date !== today) {
    aiUsage.date = today;
    aiUsage.count = 0;
  }
  
  if (aiUsage.count >= 10) {
    return false; // Rate limit reached
  }
  
  aiUsage.count += 1;
  settings.aiUsage = aiUsage;
  
  await supabase.from('businesses').update({ settings }).eq('id', businessId);
  return true;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    throw new Error('Gagal menghubungi Gemini API');
  }
  
  const data: any = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada balasan dari AI.';
}

const predictionsRoute = createRoute({
  tags: ['AI'],
  method: 'get',
  path: '/predictions',
  description: 'Mendapatkan prediksi AI (sales & stock alerts)',
  responses: {
    200: {
      content: { 
        'application/json': { 
          schema: createSuccessSchema(z.object({
            sales_projection: z.object({
              prev7_days: z.number(),
              last7_days: z.number(),
              growth_rate: z.number(),
              projected_next30_days: z.number()
            }),
            stock_alerts: z.array(z.object({
              product_id: z.string(),
              product_name: z.string(),
              current_stock: z.number(),
              total_sold: z.number(),
              daily_velocity: z.number(),
              days_to_empty: z.number(),
              status: z.string()
            }))
          })) 
        } 
      },
      description: 'Data Prediksi',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const summaryRoute = createRoute({
  tags: ['AI'],
  method: 'get',
  path: '/summary',
  description: 'Mendapatkan ringkasan harian bisnis',
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.object({ summary: z.string() })) } },
      description: 'Ringkasan AI',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

const chatRoute = createRoute({
  tags: ['AI'],
  method: 'post',
  path: '/chat',
  description: 'Chat dengan AI Assistant',
  request: {
    body: {
      content: { 'application/json': { schema: z.object({ message: z.string().optional() }) } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createSuccessSchema(z.object({ response: z.string() })) } },
      description: 'Chat response AI',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Server error',
    }
  },
});

type Variables = { businessId: string; userId: string; roleId: string };
export const aiRoute = new OpenAPIHono<{ Bindings: any, Variables: Variables }>();

aiRoute.use('*', authMiddleware);

aiRoute.openapi(predictionsRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);
    
    // Fetch last 14 days of sales
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('final_total, created_at')
      .eq('business_id', businessId)
      .gte('created_at', fourteenDaysAgo.toISOString());
      
    if (salesErr) throw salesErr;
    
    let last7DaysTotal = 0;
    let prev7DaysTotal = 0;
    
    (sales || []).forEach(s => {
      const d = new Date(s.created_at);
      if (d >= sevenDaysAgo) {
        last7DaysTotal += s.final_total;
      } else {
        prev7DaysTotal += s.final_total;
      }
    });
    
    let growthRate = 0;
    if (prev7DaysTotal > 0) {
      growthRate = ((last7DaysTotal - prev7DaysTotal) / prev7DaysTotal) * 100;
    } else if (last7DaysTotal > 0) {
      growthRate = 100;
    }
    
    // Proyeksi 30 hari = (rata-rata harian 7 hari terakhir) * 30 * (1 + tren/100)
    const dailyAvgLast7 = last7DaysTotal / 7;
    const projectedNext30Days = Math.max(0, dailyAvgLast7 * 30 * (1 + (growthRate/100)));
    
    // Stock alerts
    const { data: products } = await supabase
      .from('products')
      .select('id, name, product_stock(quantity), sale_items(quantity, sales!inner(created_at))')
      .eq('business_id', businessId)
      .gte('sale_items.sales.created_at', fourteenDaysAgo.toISOString());
      
    const stockAlerts = [];
    
    for (const p of (products || [])) {
      const stock = p.product_stock?.[0]?.quantity || 0;
      if (stock === 0) continue;
      
      const totalSold = (p.sale_items || []).reduce((sum: number, i: any) => sum + i.quantity, 0);
      const dailyVelocity = totalSold / 14;
      
      if (dailyVelocity > 0) {
        const daysToEmpty = stock / dailyVelocity;
        if (daysToEmpty <= 7) {
          stockAlerts.push({
            productId: p.id,
            productName: p.name,
            currentStock: stock,
            totalSold,
            dailyVelocity,
            daysToEmpty,
            status: daysToEmpty <= 3 ? 'critical' : 'warning'
          });
        }
      }
    }
    
    stockAlerts.sort((a, b) => a.daysToEmpty - b.daysToEmpty);
    
    return c.json({
      success: true,
      data: {
        salesProjection: {
          prev7Days: prev7DaysTotal,
          last7Days: last7DaysTotal,
          growthRate,
          projectedNext30Days
        },
        stockAlerts: stockAlerts.slice(0, 10)
      }
    }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: { message: e.message } }, 500);
  }
});

aiRoute.openapi(summaryRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const apiKey = c.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return c.json({ success: true, data: { summary: "Konfigurasi **GEMINI_API_KEY** belum diatur oleh pemilik toko." } }, 200);
  }
  
  try {
    const allowed = await checkAndIncrementAiUsage(supabase, businessId);
    if (!allowed) {
      return c.json({ success: true, data: { summary: "Limit harian penggunaan asisten AI (10 permintaan/hari) telah habis. Silakan coba besok." } }, 200);
    }
    
    // Provide basic context to AI
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const { data: salesToday } = await supabase
      .from('sales')
      .select('final_total')
      .eq('business_id', businessId)
      .gte('created_at', today.toISOString());
      
    const totalOmzetToday = (salesToday || []).reduce((sum, s) => sum + s.final_total, 0);
    
    const prompt = `Anda adalah asisten AI bisnis UMKM. Buatlah ringkasan singkat dalam 2-3 kalimat (gunakan Markdown). Konteks hari ini: Omzet yang telah didapat hari ini adalah Rp ${totalOmzetToday.toLocaleString('id-ID')}. Berikan motivasi ringan atau masukan positif. Jangan bertele-tele.`;
    
    const summary = await callGemini(apiKey, prompt);
    
    return c.json({ success: true, data: { summary } }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: { message: e.message } }, 500);
  }
});

aiRoute.openapi(chatRoute, async (c) => {
  const supabase = getSupabase(c.env);
  const businessId = c.get('businessId');
  const apiKey = c.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return c.json({ success: true, data: { response: "Maaf, kunci API Gemini belum dikonfigurasi. Harap hubungi administrator." } }, 200);
  }
  
  try {
    const allowed = await checkAndIncrementAiUsage(supabase, businessId);
    if (!allowed) {
      return c.json({ success: true, data: { response: "Maaf, jatah harian (10 chat/hari) Anda telah habis. Silakan gunakan lagi esok hari untuk menjaga performa." } }, 200);
    }
    
    const { message: userMessage } = c.req.valid('json');
    
    // Inject contextual data
    const today = new Date().toISOString().split('T')[0];
    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
    
    const systemPrompt = `Anda adalah Asisten Bisnis UMKM yang profesional dan ramah bernama 'Beres AI'. Anda sedang melayani pemilik bisnis. 
Gunakan bahasa Indonesia. Konteks toko: Tanggal ${today}, Jumlah pelanggan terdaftar: ${customerCount || 0}. 
Jawablah dengan singkat, ramah, gunakan poin-poin Markdown jika perlu. 
Pertanyaan pemilik: "${userMessage || ''}"`;

    const response = await callGemini(apiKey, systemPrompt);
    
    return c.json({ success: true, data: { response } }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: { message: e.message } }, 500);
  }
});
