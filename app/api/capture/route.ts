import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/db/client';
import { classifyCapture } from '@/lib/router/classifyCapture';

interface CaptureRequest {
  text?: unknown;
  source?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CaptureRequest;
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const source = typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'web';

    if (!text) {
      return NextResponse.json({ ok: false, error: 'text is required' }, { status: 400 });
    }

    const classification = await classifyCapture({ text, source });
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from('captures')
      .insert({
        raw_text: text,
        source,
        classification,
        type: classification.type,
        area: classification.area,
        project_hint: classification.project_hint,
        action_required: classification.action_required,
        processed: false,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: 'failed to save capture' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      capture_id: data.id,
      classification,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'internal error' }, { status: 500 });
  }
}
