export default function Home() {
  return (
    <main>
      <h1>🧠 KokontsevOS v0.1</h1>
      <p>Personal AI second brain advisor system</p>
      
      <section style={{ marginTop: '30px' }}>
        <h2>Getting Started</h2>
        <ul>
          <li><a href="/test-capture">Test Message Capture</a> - Send test messages</li>
          <li><a href="https://github.com/kokontsev/KokontsevOS" target="_blank" rel="noopener noreferrer">GitHub</a> - View source code</li>
          <li><a href="/docs">Documentation</a> - Read project docs</li>
        </ul>
      </section>

      <section style={{ marginTop: '30px' }}>
        <h2>API Endpoints</h2>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
{`POST /api/v1/messages
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "content": "Your message here",
  "language": "ru",
  "tags": ["optional-tag"]
}

Response:
{
  "success": true,
  "message": {
    "id": "...",
    "classification": "task",
    "classification_confidence": 0.95,
    "ai_response": "..."
  }
}`}
        </pre>
      </section>

      <section style={{ marginTop: '30px' }}>
        <h2>v0.1 Features</h2>
        <ul>
          <li>✅ Message classification (6 types)</li>
          <li>✅ OpenAI-powered analysis</li>
          <li>✅ Postgres database storage</li>
          <li>✅ API authentication</li>
          <li>✅ Rate limiting</li>
        </ul>
      </section>

      <section style={{ marginTop: '30px' }}>
        <h2>Coming Soon</h2>
        <ul>
          <li>📱 v0.2: Telegram bot + Web dashboard</li>
          <li>🧠 v0.3: Memory & Notion sync</li>
          <li>📊 v0.4: Weekly review & Analytics</li>
        </ul>
      </section>

      <footer style={{ marginTop: '50px', fontSize: '12px', color: '#666' }}>
        <p>KokontsevOS v0.1 | Personal AI System | {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
