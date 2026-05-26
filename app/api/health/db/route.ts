import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/db/client';

export async function GET() {
  try {
    const supabase = supabaseServer();

    // Simple health check: attempt to select one row from `captures` with expected columns
    const { data, error } = await supabase.from('captures').select('id, raw_text, source, processed, created_at').limit(1);

    if (error) {
      return NextResponse.json({ ok: false, error: 'database query failed' }, { status: 500 });
    }

    // If query succeeded but no rows, DB connection is still fine
    return NextResponse.json({ ok: true, sample: data && data.length ? data[0] : null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'internal error' }, { status: 500 });
  }
}
