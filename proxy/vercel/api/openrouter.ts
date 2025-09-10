import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
    return;
  }

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'Fancy Markdown Editor Checks'
      },
      body: JSON.stringify(req.body)
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Pass through JSON or error text
    try {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Proxy error' });
  }
}
