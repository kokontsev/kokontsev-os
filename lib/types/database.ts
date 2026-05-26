export interface Capture {
  id: string; // UUID
  raw_text: string;
  source: string;
  classification?: Record<string, unknown> | null; // JSONB
  type?: string | null;
  area?: string | null;
  project_hint?: string | null;
  action_required: boolean;
  processed: boolean;
  created_at: string; // timestamptz
}

export default Capture;
