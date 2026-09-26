/**
 * 요리 계산기 phase 6: opt-in cloud persistence adapter (NOT mounted in the preview).
 * Host (future LAC HUB) MUST inject its existing authenticated Supabase client.
 * No URL, API key, Discord identity or company identifier is embedded here.
 *
 * All operations explicitly target the axe_product.cook_user_workspaces table;
 * server-side RLS is indispensable and SQL proposal MUST be reviewed before use.
 */
import {parseWorkspace, WORKSPACE_VERSION} from './workspace.js';

export const COOK_WORKSPACE_TABLE = 'cook_user_workspaces';
export const COOK_WORKSPACE_SCHEMA = 'axe_product';
export const CLOUD_PAYLOAD_LIMIT_BYTES = 65536;

function assertClient(client) {
  if (!client?.auth?.getUser || typeof client.schema !== 'function') {
    throw new Error('HUB에서 인증된 Supabase 연결을 전달해야 해.');
  }
}

async function currentUser(client) {
  assertClient(client);
  // getUser requests verified identity; never use user ID from localStorage,
  // Discord profile display name, company membership, or caller input.
  const {data, error} = await client.auth.getUser();
  if (error || !data?.user?.id) throw new Error('Discord 로그인이 필요해.');
  return data.user.id;
}

function table(client) {
  return client.schema(COOK_WORKSPACE_SCHEMA).from(COOK_WORKSPACE_TABLE);
}

function checkResponse(result, action) {
  if (result?.error) throw new Error(`${action} 실패: ${result.error.message || '서버 응답 오류'}`);
  return result?.data ?? null;
}

function ensureRevisionContext(options) {
  if (!options || typeof options.revision !== 'string' || !options.revision || !Array.isArray(options.foods)) {
    throw new Error('요리 계산기 데이터 버전과 요리 목록을 확인할 수 없어.');
  }
}

/**
 * Always explicitly called by the user from a future account UI.
 * Never load a cloud draft into the active UI without validation + user consent.
 */
export async function readCloudWorkspace(client, options) {
  ensureRevisionContext(options);
  const userId = await currentUser(client);
  const row = checkResponse(await table(client)
    .select('payload,row_version,updated_at')
    .eq('user_id', userId)
    .maybeSingle(), '클라우드 조회');
  if (!row) return null;
  const loaded = parseWorkspace(JSON.stringify(row.payload), options);
  return {loaded, rowVersion: row.row_version, updatedAt: row.updated_at};
}

/**
 * expectedRowVersion === null means create-only.
 * A positive integer means an atomic version-checked overwrite.
 * undefined is forbidden (no blind overwrite). The DB trigger increments row_version.
 */
export async function saveCloudWorkspace(client, draft, options, expectedRowVersion) {
  ensureRevisionContext(options);
  if (expectedRowVersion !== null && (!Number.isSafeInteger(expectedRowVersion) || expectedRowVersion < 1)) {
    throw new Error('기존 클라우드 저장본 확인 후 저장해야 해.');
  }
  if (!draft || draft.version !== WORKSPACE_VERSION || draft.revision !== options.revision) {
    throw new Error('저장할 작업의 데이터 버전이 올바르지 않아.');
  }
  // Do not allow malformed data to reach the database; no automatic migration.
  parseWorkspace(JSON.stringify(draft), options);
  const raw = JSON.stringify(draft);
  if (new TextEncoder().encode(raw).length > CLOUD_PAYLOAD_LIMIT_BYTES) {
    throw new Error('작업공간 크기가 클라우드 저장 한도를 초과했어.');
  }
  const userId = await currentUser(client);
  if (expectedRowVersion === null) {
    const row = checkResponse(await table(client)
      .insert({user_id:userId, version: WORKSPACE_VERSION, revision:draft.revision, payload:draft})
      .select('row_version,updated_at')
      .single(), '클라우드 최초 저장');
    if (!Number.isSafeInteger(row?.row_version) || row.row_version < 1 || !row.updated_at) throw new Error('저장 결과를 확인하지 못했어.');
    return {rowVersion:row.row_version, updatedAt:row.updated_at};
  }
  const row = checkResponse(await table(client)
    .update({version:WORKSPACE_VERSION, revision:draft.revision, payload:draft})
    .eq('user_id',userId)
    .eq('row_version', expectedRowVersion)
    .select('row_version,updated_at')
    .maybeSingle(), '클라우드 저장');
  if (!Number.isSafeInteger(row?.row_version) || !row.updated_at) throw new Error('다른 기기에서 저장본이 변경됐어. 최신 저장본을 확인한 뒤 다시 진행해 줘.');
  return {rowVersion:row.row_version, updatedAt:row.updated_at};
}

/** Explicit delete; require the last observed version to avoid deleting a newer draft. */
export async function deleteCloudWorkspace(client, expectedRowVersion) {
  if (!Number.isSafeInteger(expectedRowVersion) || expectedRowVersion < 1) {
    throw new Error('삭제할 저장본을 먼저 확인해야 해.');
  }
  const userId = await currentUser(client);
  const row = checkResponse(await table(client)
    .delete()
    .eq('user_id', userId)
    .eq('row_version', expectedRowVersion)
    .select('user_id')
    .maybeSingle(), '클라우드 삭제');
  if (!row) throw new Error('클라우드 저장본이 변경됐거나 이미 삭제됐어. 다시 조회해 줘.');
  return true;
}
