export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const sendChat = async (
  messages: ChatMessage[],
  model: string,
  debug?: boolean
): Promise<string> => {
  const proxyUrl = (import.meta as any).env?.VITE_PROXY_URL as string | undefined;
  const baseUrl = ((import.meta as any).env?.VITE_OPENROUTER_BASE_URL as string) || 'https://openrouter.ai/api/v1';
  const body = {
    model,
    temperature: 0.3,
    messages
  } as const;

  if (debug) {
    try { (window as any).__lastOpenRouterChatRequest = { url: `${baseUrl}/chat/completions`, model, body }; } catch {}
    console.info('[DEBUG] Chat model', model);
    console.info('[DEBUG] Chat request', body);
  }

  const targetUrl = proxyUrl || `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Title': 'AI Edit Chat'
  };
  if (!proxyUrl) {
    const clientKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY as string | undefined;
    if (!clientKey) throw new Error('Kein Proxy konfiguriert und VITE_OPENROUTER_API_KEY fehlt. Für Production bitte einen Proxy nutzen.');
    headers['Authorization'] = `Bearer ${clientKey}`;
  }

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    if (debug) {
      try { (window as any).__lastOpenRouterChatResponse = text; } catch {}
      console.info('[DEBUG] Chat HTTP error', res.status, text);
    }
    throw new Error(`OpenRouter HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (debug) {
    try { (window as any).__lastOpenRouterChatResponse = data; } catch {}
    console.info('[DEBUG] Chat response (raw)', data);
  }
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  return content || '';
};
