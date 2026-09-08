// Единая точка отправки уведомлений в админ-чат Telegram.
// Вызывается из Postgres-триггеров (через pg_net) с заголовком x-notify-secret.
// Никогда не роняет основной flow: любая ошибка логируется и возвращается 200/ok=false.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
  }

  // Доступ только для доверенных вызовов (триггеры БД знают общий секрет).
  const expected = Deno.env.get('NOTIFY_TELEGRAM_SECRET') ?? '';
  const provided = req.headers.get('x-notify-secret') ?? '';
  if (!expected || !timingSafeEqual(expected, provided)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
  }

  let message = '';
  let buttons: { text: string; url: string }[] = [];
  try {
    const body = await req.json();
    message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (Array.isArray(body?.buttons)) {
      buttons = body.buttons
        .filter(
          (b: unknown): b is { text: string; url: string } =>
            !!b &&
            typeof (b as any).text === 'string' &&
            typeof (b as any).url === 'string' &&
            (b as any).text.trim().length > 0 &&
            /^https?:\/\//i.test((b as any).url),
        )
        .slice(0, 5)
        .map((b) => ({ text: b.text.trim().slice(0, 30), url: b.url }));
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders });
  }
  if (!message || message.length > 4000) {
    return new Response(JSON.stringify({ error: 'message must be 1..4000 chars' }), { status: 400, headers: jsonHeaders });
  }

  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('notify-telegram: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured, skipping');
    return new Response(JSON.stringify({ ok: false, reason: 'not_configured' }), { headers: jsonHeaders });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`notify-telegram: Telegram API returned ${res.status}: ${text}`);
      return new Response(JSON.stringify({ ok: false, status: res.status, details: text }), { headers: jsonHeaders });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (error) {
    console.error('notify-telegram: request failed', error);
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), { headers: jsonHeaders });
  }
});
