import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Allowlist de hosts pra prevenir open-redirect via app_url.
const ALLOWED_HOSTS = new Set([
  'pmcos.com.br',
  'www.pmcos.com.br',
]);
const DEV_HOSTS = new Set(['localhost:5173', 'localhost:3000', '127.0.0.1:5173']);

function resolveAppUrl(bodyAppUrl: unknown): string {
  const fallback = Deno.env.get('APP_URL') || 'https://pmcos.com.br';
  if (typeof bodyAppUrl !== 'string') return fallback;
  try {
    const u = new URL(bodyAppUrl);
    const hostKey = u.host.toLowerCase();
    if (ALLOWED_HOSTS.has(hostKey)) return `${u.protocol}//${u.host}`;
    if (Deno.env.get('ALLOW_DEV_APP_URL') === 'true' && DEV_HOSTS.has(hostKey)) return `${u.protocol}//${u.host}`;
    return fallback;
  } catch {
    return fallback;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const senderEmail = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) return jsonResponse({ error: 'Token invalido' }, 401);

    const { data: mentor } = await supabaseAdmin
      .from('mentores').select('id').eq('email', userData.user.email).maybeSingle();
    if (!mentor) return jsonResponse({ error: 'Apenas administradores podem registrar clientes' }, 403);

    const { nome, nome_empresa, email, app_url: bodyAppUrl } = await req.json();
    if (!nome || !email) return jsonResponse({ error: 'Nome e e-mail sao obrigatorios' }, 400);

    const appUrl = resolveAppUrl(bodyAppUrl);

    const fmt = (s: string) => s.trim().split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const nomeF = fmt(nome);
    const empresaF = nome_empresa && nome_empresa.trim() ? fmt(nome_empresa) : null;

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email, password: crypto.randomUUID(), email_confirm: true,
      user_metadata: { nome: nomeF, nome_empresa: empresaF },
    });
    if (createErr) {
      const m = createErr.message || '';
      if (m.includes('already') || m.includes('exists') || m.includes('duplicate'))
        return jsonResponse({ error: 'Ja existe um usuario com este e-mail' }, 409);
      return jsonResponse({ error: 'Erro ao criar usuario: ' + m }, 500);
    }
    if (!newUser?.user) return jsonResponse({ error: 'Erro ao criar usuario' }, 500);
    const userId = newUser.user.id;

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', email, options: { redirectTo: appUrl + '/definir-senha' },
    });
    if (linkErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return jsonResponse({ error: 'Erro ao gerar link: ' + linkErr.message }, 500);
    }

    // codigo_cliente vem de uma sequence dedicada (proximo_codigo_cliente) em vez
    // de SELECT MAX()+1 manual — evita colisão de chave duplicada quando o admin
    // clica 2x seguido (race condition entre duas leituras concorrentes do MAX).
    const { data: nextCodigo, error: codigoErr } = await supabaseAdmin.rpc('proximo_codigo_cliente');
    if (codigoErr || nextCodigo == null) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return jsonResponse({ error: 'Erro ao gerar codigo do cliente: ' + (codigoErr?.message || '') }, 500);
    }

    const { error: formErr } = await supabaseAdmin.from('clientes_formulario').insert({
      id_cliente: userId, codigo_cliente: nextCodigo,
      nome: nomeF, nome_cliente_formatado: nomeF,
      empresa_nome: empresaF, nome_empresa_formatado: empresaF, email,
    });
    if (formErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return jsonResponse({ error: 'Erro ao registrar cliente: ' + formErr.message }, 500);
    }

    // id_entrada não é mais calculado manualmente (SELECT MAX()+1) — a coluna já
    // tem DEFAULT nextval() na própria sequence, sincronizada na migration
    // 20260803_excluir_cliente_completo.
    await supabaseAdmin.from('clientes_entrada_new').insert({
      id_cliente: userId,
      codigo_cliente: nextCodigo,
      nome_cliente: nomeF, nome_cliente_formatado: nomeF,
      nome_empresa: empresaF, nome_empresa_formatado: empresaF,
      status_atual: 'Pendente de Onboarding', nivel_engajamento: 'sem_onboarding',
    });

    await supabaseAdmin.from('cliente_onboarding').insert({
      id_cliente: userId, step_atual: 1, status: 'em_andamento',
      nome_completo: nomeF, empresa_nome: empresaF, email,
    });

    const hashedToken = linkData?.properties?.hashed_token;
    const verificationType = linkData?.properties?.verification_type || 'magiclink';
    const magicLink = hashedToken
      ? appUrl + '/ativar-conta?token_hash=' + hashedToken + '&type=' + verificationType + '&next=/definir-senha'
      : linkData?.properties?.action_link;
    let emailSent = false;
    let emailDebug: string = 'not attempted';

    if (!resendApiKey) {
      emailDebug = 'RESEND_API_KEY nao configurada no Supabase (Settings > Edge Functions > Secrets)';
    } else if (!magicLink) {
      emailDebug = 'Magic link vazio';
    } else {
      try {
        const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fafafa;padding:40px;border-radius:16px"><div style="text-align:center;margin-bottom:32px"><div style="display:inline-block;background:#DAFC67;color:#0a0a0a;width:56px;height:56px;border-radius:16px;line-height:56px;font-size:24px;font-weight:bold">PMC</div></div><h1 style="text-align:center;font-size:24px;color:#fafafa">Bem-vindo ao PMC OS</h1><p style="text-align:center;color:#a1a1aa;font-size:14px;margin-bottom:32px">Programa Multiplicador de Crescimento</p><p style="color:#d4d4d8;font-size:15px;line-height:1.6">Ola <strong style="color:#fafafa">' + nomeF + '</strong>,</p><p style="color:#d4d4d8;font-size:15px;line-height:1.6">Voce foi convidado(a) para acessar o sistema PMC OS. Clique no botao abaixo para definir sua senha e completar seu cadastro.</p><div style="text-align:center;margin:32px 0"><a href="' + magicLink + '" style="display:inline-block;background:#DAFC67;color:#0a0a0a;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">ACESSAR E DEFINIR SENHA</a></div><p style="color:#71717a;font-size:12px;text-align:center">Este link e valido por 24 horas.</p><hr style="border:none;border-top:1px solid #27272a;margin:32px 0"/><p style="color:#52525b;font-size:11px;text-align:center;letter-spacing:2px;text-transform:uppercase">Black Eagle - Powering Business Acceleration</p></div>';
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + resendApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: senderEmail, to: [email], subject: 'PMC OS - Defina sua senha e complete seu cadastro', html }),
        });
        emailSent = r.ok;
        if (!r.ok) {
          const body = await r.text();
          emailDebug = 'Resend HTTP ' + r.status + ': ' + body.slice(0, 400);
          console.error('Resend error:', body);
        } else {
          emailDebug = 'ok';
        }
      } catch (e: any) {
        emailDebug = 'Exception: ' + (e.message || String(e));
        console.error('Email send failed:', e.message);
      }
    }

    return jsonResponse({
      success: true,
      id_cliente: userId,
      codigo_cliente: nextCodigo,
      email_sent: emailSent,
      email_debug: emailDebug,
      sender_email: senderEmail,
      app_url: appUrl,
      invite_link: magicLink,
      message: emailSent
        ? 'Convite enviado para ' + email
        : 'Cliente registrado! O email nao foi enviado (motivo: ' + emailDebug + '). Use o link abaixo:',
    });

  } catch (err: any) {
    console.error('UNHANDLED:', err.message);
    return jsonResponse({ error: 'Erro interno: ' + err.message }, 500);
  }
});
