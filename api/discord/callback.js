import {
  getDiscordConfig,
  randomNonce,
  safeOAuthError,
  signPayload,
  verifyPayload,
} from '../../server/discordSecurity.js';

function redirectWithError(res, appUrl, code) {
  return res.redirect(302, `${appUrl}/#discord_error=${encodeURIComponent(code)}`);
}

export default async function handler(req, res) {
  const config = getDiscordConfig();

  if (req.method !== 'GET') {
    return redirectWithError(res, config.appUrl, 'method_not_allowed');
  }

  if (req.query?.error) {
    return redirectWithError(
      res,
      config.appUrl,
      safeOAuthError(req.query.error)
    );
  }

  try {
    const code = String(req.query?.code || '').trim();
    const stateToken = String(req.query?.state || '').trim();

    if (!code || !stateToken) {
      return redirectWithError(res, config.appUrl, 'missing_oauth_response');
    }

    const state = verifyPayload(
      stateToken,
      config.stateSecret,
      'discord-start'
    );

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    let tokenData = null;
    try {
      tokenData = await tokenResponse.json();
    } catch {
      tokenData = null;
    }

    if (!tokenResponse.ok) {
      return redirectWithError(res, config.appUrl, 'token_exchange_failed');
    }

    const guild = tokenData?.guild;
    const guildId = String(guild?.id || '').trim();
    const guildName = String(guild?.name || '').trim();

    if (!/^\d{15,22}$/.test(guildId)) {
      return redirectWithError(res, config.appUrl, 'guild_not_returned');
    }
    if (state.expectedGuildId && String(state.expectedGuildId) !== guildId) {
      return redirectWithError(res, config.appUrl, 'guild_mismatch');
    }

    const now = Math.floor(Date.now() / 1000);
    const completionToken = signPayload(
      {
        kind: 'discord-complete',
        companyId: state.companyId,
        userId: state.userId,
        guildId,
        guildName: guildName || null,
        resumeGuide: state.resumeGuide === true,
        nonce: randomNonce(),
        iat: now,
        exp: now + 5 * 60,
      },
      config.stateSecret
    );

    return res.redirect(
      302,
      `${config.appUrl}/#discord_link=${encodeURIComponent(completionToken)}`
    );
  } catch {
    return redirectWithError(res, config.appUrl, 'oauth_validation_failed');
  }
}
