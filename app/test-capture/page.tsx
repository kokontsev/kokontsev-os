'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

interface TestCapturePayload {
  text: string;
  source: string;
}

const baseStyles: { [key: string]: CSSProperties } = {
  container: { maxWidth: '800px', margin: '0 auto' },
  form: { backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
  select: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' },
  textarea: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    minHeight: '100px',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  responseBox: { backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #4caf50' },
  errorBox: { backgroundColor: '#ffebee', padding: '15px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #f44336', color: '#c62828' },
  pre: { backgroundColor: 'white', padding: '10px', borderRadius: '4px', overflow: 'auto' },
};

export default function TestCapture() {
  const [message, setMessage] = useState<TestCapturePayload>({
    text: '',
    source: 'web',
  });
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setMessage((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to process capture');
      } else {
        setResponse(data);
        setMessage({ text: '', source: 'web' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={baseStyles.container}>
      <h1>Test Capture</h1>
      <p>Send test captures to the AI Router and see the classification response.</p>

      <form onSubmit={handleSubmit} style={baseStyles.form}>
        <div style={baseStyles.formGroup}>
          <label htmlFor="text" style={baseStyles.label}>
            Capture Text
          </label>
          <textarea
            id="text"
            name="text"
            value={message.text}
            onChange={handleChange}
            placeholder="Например: Сегодня нужно закончить AI Router для Kokontsev OS"
            required
            style={baseStyles.textarea}
          />
        </div>

        <div style={baseStyles.formGroup}>
          <label htmlFor="source" style={baseStyles.label}>
            Source
          </label>
          <select id="source" name="source" value={message.source} onChange={handleChange} style={baseStyles.select}>
            <option value="web">web</option>
            <option value="api">api</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={baseStyles.button}>
          {loading ? 'Processing...' : 'Send Capture'}
        </button>
      </form>

      {error && (
        <div style={baseStyles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response !== null && (
        <div style={baseStyles.responseBox}>
          <h3>Response</h3>
          <pre style={baseStyles.pre}>{JSON.stringify(response, null, 2) || ''}</pre>
        </div>
      )}

      <section style={{ marginTop: '40px' }}>
        <h2>Classification Types</h2>
        <dl style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
          <dt>
            <strong>task</strong>
          </dt>
          <dd>Something to do or complete</dd>

          <dt>
            <strong>daily_log</strong>
          </dt>
          <dd>Event, fact, or observation from life</dd>

          <dt>
            <strong>decision</strong>
          </dt>
          <dd>Decision or selected direction</dd>

          <dt>
            <strong>idea</strong>
          </dt>
          <dd>Creative thought, hypothesis, or concept</dd>

          <dt>
            <strong>blocker</strong>
          </dt>
          <dd>Problem, obstacle, or risk</dd>

          <dt>
            <strong>state</strong>
          </dt>
          <dd>Energy, mood, or current state</dd>

          <dt>
            <strong>planning_request</strong>
          </dt>
          <dd>Request to structure or plan something</dd>
        </dl>
      </section>

      <nav style={{ marginTop: '30px' }}>
        <a href="/">Back to Home</a>
      </nav>
    </div>
  );
}
