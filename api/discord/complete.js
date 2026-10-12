import {
  getDiscordConfig,
  verifyPayload,
} from '../../server/discordSecurity.js';
import {
  requireCompanyAdmin,
  requireUser,
  upsertDiscordConnection,
} from '../../server/supabaseUser.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const linkToken = String(req.body?.link_token || '').trim();
    if (!linkToken) {
      return res.status(400).json({ error: 'Discord 연결 토큰이 없습니다.' });
    }

    const config = getDiscordConfig();
    const payload = verifyPayload(
      linkToken,
      config.stateSecret,
      'discord-complete'
    );

    const { token, user } = await requireUser(req);

    if (payload.userId !== user.id) {
      return res.status(403).json({
        error: 'Discord 연결을 시작한 사용자와 현재 사용자가 다릅니다.',
      });
    }

    await requireCompanyAdmin(token, user.id, payload.companyId);

    const connection = await upsertDiscordConnection({
      token,
      userId: user.id,
      companyId: payload.companyId,
      guildId: payload.guildId,
      guildName: payload.guildName,
    });

    return res.status(200).json({ connection, resume_guide: payload.resumeGuide === true });
  } catch (error) {
    const status = Number(error?.statusCode || 400);
    return res.status(status).json({
      error: status >= 500 ? 'Discord 연결을 완료하지 못했습니다.' : error.message,
    });
  }
}
