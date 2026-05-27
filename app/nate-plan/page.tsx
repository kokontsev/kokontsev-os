'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

type DayType = 'workday' | 'weekend' | 'unknown';
type Energy = 'low' | 'normal' | 'high' | 'unknown';

interface PlannerResponse {
  ok?: boolean;
  error?: string;
  plan?: {
    day_focus: string;
    mode: string;
    fixed_commitments: Array<{
      title: string;
      area: string;
      estimated_minutes: number | null;
    }>;
    main_tasks: Array<{
      title: string;
      area: string;
      why: string;
      estimated_minutes: number;
      priority: string;
    }>;
    support_tasks: Array<{
      title: string;
      area: string;
      estimated_minutes: number;
    }>;
    optional_tasks: Array<{
      title: string;
      area: string;
      estimated_minutes: number;
      condition: string;
    }>;
    do_not_do: string[];
    risks: string[];
    nate_comment: string;
    estimated_total_planned_minutes: number;
    plan_quality_warnings: string[];
    validator_warnings?: string[];
    requires_confirmation: true;
  };
  metadata?: Record<string, unknown>;
}

const styles: { [key: string]: CSSProperties } = {
  container: { maxWidth: '980px', margin: '0 auto', padding: '24px 16px' },
  form: { display: 'grid', gap: '14px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' },
  field: { display: 'grid', gap: '6px' },
  label: { fontWeight: 600 },
  textarea: { minHeight: '110px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' },
  select: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { width: '160px', padding: '10px 14px', border: 0, borderRadius: '4px', backgroundColor: '#111827', color: '#fff' },
  error: { marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#991b1b' },
  panel: { marginTop: '16px', padding: '14px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#fff' },
  task: { padding: '10px 0', borderTop: '1px solid #eee' },
  pre: {
    marginTop: '16px',
    maxHeight: '520px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    padding: '14px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    backgroundColor: '#f9fafb',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '13px',
  },
};

const parseProjects = (value: string) =>
  value
    .split(',')
    .map((project) => project.trim())
    .filter(Boolean);

export default function NatePlanPage() {
  const [userMessage, setUserMessage] = useState('');
  const [dayType, setDayType] = useState<DayType>('workday');
  const [energy, setEnergy] = useState<Energy>('normal');
  const [projects, setProjects] = useState('education,work,sport');
  const [response, setResponse] = useState<PlannerResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const projectList = parseProjects(projects);
      const res = await fetch('/api/nate/plan/day', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          day_type: dayType,
          energy,
          ...(projectList.length ? { projects: projectList } : {}),
        }),
      });

      const data = (await res.json()) as PlannerResponse;

      if (!res.ok || !data.ok) {
        setError(data.error || `Request failed with HTTP ${res.status}`);
      } else {
        setResponse(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate day plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.container}>
      <h1>Nate Day Plan</h1>

      <form
        style={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void generatePlan();
        }}
      >
        <div style={styles.field}>
          <label htmlFor="user_message" style={styles.label}>
            User message
          </label>
          <textarea
            id="user_message"
            value={userMessage}
            onChange={(event) => setUserMessage(event.target.value)}
            placeholder="Что важно учесть при планировании дня?"
            style={styles.textarea}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="day_type" style={styles.label}>
            Day type
          </label>
          <select id="day_type" value={dayType} onChange={(event) => setDayType(event.target.value as DayType)} style={styles.select}>
            <option value="workday">workday</option>
            <option value="weekend">weekend</option>
            <option value="unknown">unknown</option>
          </select>
        </div>

        <div style={styles.field}>
          <label htmlFor="energy" style={styles.label}>
            Energy
          </label>
          <select id="energy" value={energy} onChange={(event) => setEnergy(event.target.value as Energy)} style={styles.select}>
            <option value="normal">normal</option>
            <option value="low">low</option>
            <option value="high">high</option>
            <option value="unknown">unknown</option>
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
            placeholder="education,work,sport"
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {response?.plan && (
        <section style={styles.panel}>
          <h2>{response.plan.day_focus}</h2>
          <p>
            <strong>Mode:</strong> {response.plan.mode}
          </p>
          <p>
            <strong>Extra planned time:</strong> {response.plan.estimated_total_planned_minutes} min
          </p>

          <h3>Fixed commitments</h3>
          <ul>
            {response.plan.fixed_commitments.map((item, index) => (
              <li key={`${item.title}-${index}`}>
                {item.title} · {item.area} · {item.estimated_minutes === null ? 'fixed' : `${item.estimated_minutes} min`}
              </li>
            ))}
          </ul>

          <h3>Main tasks</h3>
          {response.plan.main_tasks.map((task, index) => (
            <div key={`${task.title}-${index}`} style={styles.task}>
              <strong>{task.title}</strong>
              <p>
                {task.area} · {task.priority} · {task.estimated_minutes} min
              </p>
              <p>{task.why}</p>
            </div>
          ))}

          <h3>Support tasks</h3>
          <ul>
            {response.plan.support_tasks.map((task, index) => (
              <li key={`${task.title}-${index}`}>
                {task.title} · {task.area} · {task.estimated_minutes} min
              </li>
            ))}
          </ul>

          <h3>Optional tasks</h3>
          <ul>
            {response.plan.optional_tasks.map((task, index) => (
              <li key={`${task.title}-${index}`}>
                {task.title} · {task.area} · {task.estimated_minutes} min · {task.condition}
              </li>
            ))}
          </ul>

          <h3>Do not do</h3>
          <ul>
            {response.plan.do_not_do.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>

          <h3>Risks</h3>
          <ul>
            {response.plan.risks.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>

          <h3>Nate comment</h3>
          <p>{response.plan.nate_comment}</p>

          <h3>Plan quality warnings</h3>
          <ul>
            {response.plan.plan_quality_warnings.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>

          {response.plan.validator_warnings?.length ? (
            <>
              <h3>Validator warnings</h3>
              <ul>
                {response.plan.validator_warnings.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      )}

      {response && <pre style={styles.pre}>{JSON.stringify(response, null, 2)}</pre>}
    </main>
  );
}
