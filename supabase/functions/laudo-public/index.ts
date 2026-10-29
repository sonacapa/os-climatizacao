import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const TOKEN = /^[a-f0-9]{32}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const params = new URL(req.url).searchParams;
    const itemToken = params.get('t') || '';
    const visitToken = params.get('v') || '';
    if (!TOKEN.test(itemToken || visitToken)) return json({ error: 'Link inválido.' }, 404);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // O.S. e itens concluídos (um link por aparelho ou um link único da visita)
    let os: any;
    let items: any[] = [];
    if (visitToken) {
      const { data } = await db.from('work_orders').select('*').eq('share_token', visitToken).maybeSingle();
      if (!data) return json({ error: 'Laudos não encontrados.' }, 404);
      os = data;
      const res = await db.from('work_order_items').select('*').eq('work_order_id', os.id).eq('status', 'feito').order('position');
      items = res.data || [];
    } else {
      const { data: item } = await db.from('work_order_items').select('*').eq('share_token', itemToken).maybeSingle();
      if (!item || item.status !== 'feito') return json({ error: 'Laudo não encontrado.' }, 404);
      const { data } = await db.from('work_orders').select('*').eq('id', item.work_order_id).single();
      os = data;
      items = [item];
    }
    if (items.length === 0) return json({ error: 'Esta visita ainda não tem laudos concluídos.' }, 404);

    const [{ data: company }, { data: client }, { data: tech }] = await Promise.all([
      db.from('company_settings').select('name,document,phone,email,address,technical_responsible,logo_path').eq('id', 1).single(),
      db.from('clients').select('name,address').eq('id', os.client_id).single(),
      os.tech_id ? db.from('profiles').select('name').eq('id', os.tech_id).maybeSingle() : Promise.resolve({ data: null })
    ]);

    const sign = async (bucket: string, path?: string | null) => {
      if (!path) return null;
      const { data } = await db.storage.from(bucket).createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    };
    const signature = await sign('signatures', os.signature_path);
    const logo = company?.logo_path ? db.storage.from('branding').getPublicUrl(company.logo_path).data.publicUrl : null;

    const laudos = [];
    for (const item of items) {
      const [{ data: eq }, { data: checklist }, { data: materials }] = await Promise.all([
        db.from('equipment').select('code,brand,model,btus,gas,voltage,serial_number,location_tag').eq('id', item.equipment_id).single(),
        db.from('checklist_items').select('label,status,position').eq('item_id', item.id).order('position'),
        db.from('materials_used').select('name,quantity,unit').eq('item_id', item.id)
      ]);
      laudos.push({
        company: { ...company, logo_url: logo },
        client, tech: tech?.name || '',
        os: { number: os.number, date: os.scheduled_date, service_type: item.service_type || os.service_type, signature_name: os.signature_name },
        item: { completed_at: item.completed_at, notes: item.notes, warranty_days: item.warranty_days, preventive_months: item.preventive_months },
        equipment: eq, checklist: checklist || [], materials: materials || [],
        photos: {
          before: await sign('os-photos', item.photo_before_path),
          after: await sign('os-photos', item.photo_after_path),
          signature
        }
      });
    }
    return json(visitToken ? { laudos } : laudos[0]);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
