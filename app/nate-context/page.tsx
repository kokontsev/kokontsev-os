'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

type Scope = 'default' | 'all' | 'planning' | 'project';

interface ContextResponse {
  ok?: boolean;
  error?: string;
  scope?: string;
  requested_projects?: string[];
  combined_context?: string;
  metadata?: {
    section_count: number;
    character_count: number;
    generated_at: string;
    warnings?: string[];
  };
}

const styles: { [key: string]: CSSProperties } = {
  container: { maxWidth: '980px', margin: '0 auto', padding: '24px 16px' },
  form: { display: 'grid', gap: '14px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' },
  field: { display: 'grid', gap: '6px' },
  label: { fontWeight: 600 },
  select: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { width: '140px', padding: '10px 14px', border: 0, borderRadius: '4px', backgroundColor: '#111827', color: '#fff' },
  error: { marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#991b1b' },
  meta: { marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: '#f3f4f6' },
  pre: {
    marginTop: '16px',
    minHeight: '420px',
    maxHeight: '680px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    padding: '14px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '13px',
  },
};

export default function NateContextPage() {
  const [scope, setScope] = useState<Scope>('default');
  const [projects, setProjects] = useState('');
  const [response, setResponse] = useState<ContextResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadContext = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const params = new URLSearchParams({ scope });
      if (projects.trim()) {
        params.set('projects', projects.trim());
      }

      const res = await fetch(`/api/nate/context?${params.toString()}`, { cache: 'no-store' });
      const data = (await res.json()) as ContextResponse;

      if (!res.ok || !data.ok) {
        setError(data.error || `Request failed with HTTP ${res.status}`);
      } else {
        setResponse(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Nate context');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.container}>
      <h1>Nate Context</h1>

      <form
        style={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void loadContext();
        }}
      >
        <div style={styles.field}>
          <label htmlFor="scope" style={styles.label}>
            Scope
          </label>
          <select id="scope" value={scope} onChange={(event) => setScope(event.target.value as Scope)} style={styles.select}>
            <option value="default">default</option>
            <option value="planning">planning</option>
            <option value="project">project</option>
            <option value="all">all</option>
          </select>
        </div>

        <div style={styles.field}>
          <label htmlFor="projects" style={styles.label}>
            Projects
          </label>
          <input
            id="projects"
            value={projects}
            onChange={(event) => setProjects(event.target.value)}
            placeholder="work,trading"
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {response?.metadata && (
        <section style={styles.meta}>
          <p>
            <strong>Scope:</strong> {response.scope}
          </p>
          <p>
            <strong>Requested projects:</strong> {response.requested_projects?.join(', ') || 'none'}
          </p>
          <p>
            <strong>Sections:</strong> {response.metadata.section_count}
          </p>
          <p>
            <strong>Characters:</strong> {response.metadata.character_count}
          </p>
          <p>
            <strong>Generated at:</strong> {response.metadata.generated_at}
          </p>
          {response.metadata.warnings?.length ? (
            <p>
              <strong>Warnings:</strong> {response.metadata.warnings.join('; ')}
            </p>
          ) : null}
        </section>
      )}

      {response?.combined_context && <pre style={styles.pre}>{response.combined_context}</pre>}
    </main>
  );
}
