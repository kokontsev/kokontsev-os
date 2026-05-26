'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

interface TestMessage {
  content: string;
  language: string;
  tags: string;
}

const baseStyles: { [key: string]: CSSProperties } = {
  container: { maxWidth: '800px', margin: '0 auto' },
  form: { backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
  input: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '100px', fontFamily: 'monospace', boxSizing: 'border-box' },
  button: { padding: '10px 20px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  responseBox: { backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #4caf50' },
  errorBox: { backgroundColor: '#ffebee', padding: '15px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #f44336', color: '#c62828' },
  pre: { backgroundColor: 'white', padding: '10px', borderRadius: '4px', overflow: 'auto' as const },
};

export default function TestCapture() {
  const [message, setMessage] = useState<TestMessage>({
    content: '',
    language: 'ru',
    tags: '',
  });
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMessage((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const payload = {
        content: message.content,
        language: message.language,
        ...(message.tags && { tags: message.tags.split(',').map(t => t.trim()) }),
      };

      const res = await fetch('/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to process message');
      } else {
        setResponse(data);
        setMessage({ content: '', language: 'ru', tags: '' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={baseStyles.container}>
      <h1>Test Message Capture</h1>
      <p>Send test messages to the API and see the classification response.</p>

      <form onSubmit={handleSubmit} style={baseStyles.form}>
        <div style={baseStyles.formGroup}>
          <label htmlFor="content" style={baseStyles.label}>
            Message Content
          </label>
          <textarea
            id="content"
            name="content"
            value={message.content}
            onChange={handleChange}
            placeholder="Enter your message here..."
            required
            style={baseStyles.textarea}
          />
        </div>

        <div style={baseStyles.formGroup}>
          <label htmlFor="language" style={baseStyles.label}>
            Language
          </label>
          <select
            id="language"
            name="language"
            value={message.language}
            onChange={handleChange}
            style={baseStyles.select}
          >
            <option value="ru">Russian (Русский)</option>
            <option value="en">English</option>
          </select>
        </div>

        <div style={baseStyles.formGroup}>
          <label htmlFor="tags" style={baseStyles.label}>
            Tags (comma-separated, optional)
          </label>
          <input
            id="tags"
            type="text"
            name="tags"
            value={message.tags}
            onChange={handleChange}
            placeholder="e.g., work, urgent, personal"
            style={baseStyles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={baseStyles.button}>
          {loading ? 'Processing...' : 'Send Message'}
        </button>
      </form>

      {error && (
        <div style={baseStyles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={baseStyles.responseBox}>
          <h3>Response</h3>
          <pre style={baseStyles.pre}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      <section style={{ marginTop: '40px' }}>
        <h2>Classification Types</h2>
        <dl style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
          <dt><strong>task</strong></dt>
          <dd>Something to do or complete</dd>

          <dt><strong>daily_log</strong></dt>
          <dd>Event, fact, or observation from life</dd>

          <dt><strong>solution</strong></dt>
          <dd>Answer or approach to a problem</dd>

          <dt><strong>idea</strong></dt>
          <dd>Creative thought, hypothesis, or concept</dd>

          <dt><strong>blocker</strong></dt>
          <dd>Problem, obstacle, or risk</dd>

          <dt><strong>plan_request</strong></dt>
          <dd>Request to structure or plan something</dd>
        </dl>
      </section>

      <nav style={{ marginTop: '30px' }}>
        <a href="/">← Back to Home</a>
      </nav>
    </div>
  );
}
