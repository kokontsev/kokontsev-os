import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KokontsevOS',
  description: 'Personal AI second brain advisor system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
