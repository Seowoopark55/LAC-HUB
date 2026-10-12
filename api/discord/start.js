import {
  DISCORD_BOT_BASE_PERMISSIONS,
  getDiscordConfig,
  randomNonce,
  signPayload,
} from '../../server/discordSecurity.js';
import {
  requireCompanyAdmin,
  requireUser,
} from '../../server/supabaseUser.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const companyId = String(req.body?.company_id || '').trim();
    if (!UUID_RE.test(companyId)) {
      return res.status(400).json({ error: '회사 ID가 올바르지 않습니다.' });
    }

    const { token, user } = await requireUser(req);
    await requireCompanyAdmin(token, user.id, companyId);

    const config = getDiscordConfig();
    const now = Math.floor(Date.now() / 1000);

    const state = signPayload(
      {
        kind: 'discord-start',
        companyId,
        userId: user.id,
        resumeGuide: req.body?.resume_guide === true,
        nonce: randomNonce(),
        iat: now,
        exp: now + 10 * 60,
      },
      config.stateSecret
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      scope: 'bot applications.commands',
      state,
      redirect_uri: config.redirectUri,
      permissions: DISCORD_BOT_BASE_PERMISSIONS,
      integration_type: '0',
      prompt: 'consent',
    });

    return res.status(200).json({
      authorize_url: `https://discord.com/oauth2/authorize?${params.toString()}`,
    });
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    return res.status(status).json({
      error: status >= 500 ? 'Discord 연결을 시작하지 못했습니다.' : error.message,
    });
  }
}
