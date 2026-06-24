import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseWorkbook, normalizeText } from '@/lib/import';

export const runtime = 'nodejs';

// Server-side smart import:
// - parses Arabic/English headers, normalizes national IDs & dates
// - resolves location NAMES -> ids (matches existing, creates missing)
// - upserts employees on national_id, returns a row-level report,
//   and writes a one-line summary to activity_log.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

    const parsed = parseWorkbook(Buffer.from(await file.arrayBuffer()));

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // ---- resolve / create locations -------------------------------------
    const { data: existing } = await admin.from('locations').select('id, name');
    const byName = new Map((existing ?? []).map((l) => [normalizeText(l.name).toLowerCase(), l.id]));
    const createdLocations: string[] = [];

    for (const name of parsed.locationNames) {
      const key = name.toLowerCase();
      if (!byName.has(key)) {
        const { data: ins } = await admin
          .from('locations')
          .insert({ name, type: 'department' })
          .select('id')
          .single();
        if (ins) { byName.set(key, ins.id); createdLocations.push(name); }
      }
    }

    // ---- upsert employees ----------------------------------------------
    const payload = parsed.rows.map((r) => ({
      full_name: r.full_name,
      national_id: r.national_id,
      location_id: r.location_name ? byName.get(r.location_name.toLowerCase()) ?? null : null,
      hire_date: r.hire_date,
      annual_entitlement: r.annual_entitlement,
      job_title: r.job_title,
      phone: r.phone,
    }));

    let inserted = 0;
    if (payload.length) {
      const { error, count } = await admin
        .from('employees')
        .upsert(payload, { onConflict: 'national_id', count: 'exact' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      inserted = count ?? payload.length;
    }

    const report = {
      received: parsed.rows.length + parsed.errors.length,
      imported: inserted,
      skipped: parsed.errors.length,
      created_locations: createdLocations,
      unmapped_headers: parsed.unmappedHeaders,
      errors: parsed.errors.slice(0, 50),
    };

    await admin.rpc('log_import', {
      p_summary: `استيراد Excel: ${report.imported} موظف · ${report.skipped} تجاوز · ${createdLocations.length} موقع جديد`,
      p_meta: report,
    });

    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'parse failed' }, { status: 500 });
  }
}
