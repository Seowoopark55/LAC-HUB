/**
 * 요리 계산기 phase 9: read-only host-navigation handshake for an isolated preview.
 * This bridge intentionally does NOT import HUB or Supabase clients, expose a
 * session, begin OAuth, or enable any cloud workspace operation.
 */
export const COOK_HOST_RETURN_MESSAGE = 'lac-cook:hub-return:v1';

export function isValidCookReturnMessage(event, frameWindow, expectedOrigin) {
  return Boolean(event && frameWindow &&
    event.source === frameWindow &&
    event.origin === expectedOrigin &&
    event.data !== null &&
    typeof event.data === 'object' &&
    !Array.isArray(event.data) &&
    event.data.type === COOK_HOST_RETURN_MESSAGE);
}

/** The child sends only a navigation intent, never session data or a token. */
export function requestHostReturn({selfWindow, parentWindow} = {}) {
  if (!selfWindow || !parentWindow || selfWindow === parentWindow) return false;
  parentWindow.postMessage({type:COOK_HOST_RETURN_MESSAGE},selfWindow.location.origin);
  return true;
}

/**
 * Simulated HUB container, NOT an operation-site route patch. The future host
 * must call the existing HUB router for onReturn, rather than reloading HUB.
 */
export function createCookHostPreview({container, onReturn, pageUrl, hostWindow, hostDocument} = {}) {
  if (!container || typeof onReturn !== 'function' || !hostWindow || !hostDocument) {
    throw new Error('요리 계산기 컨테이너와 HUB 복귀 연결이 필요해.');
  }
  const href = new URL(pageUrl, hostWindow.location.href);
  if (href.origin !== hostWindow.location.origin) throw new Error('요리 계산기는 같은 출처에서만 호스팅할 수 있어.');
  if (href.searchParams.get('lacCookHostPreview') !== '1') {
    throw new Error('검토용 임베드 모드가 설정되지 않았어.');
  }
  const iframe = hostDocument.createElement('iframe');
  iframe.title = '요리 계산기 통합 사전 검토 화면';
  iframe.setAttribute('aria-label','요리 계산기 통합 사전 검토 화면');
  iframe.src = href.href;
  iframe.className = 'cook-preview-iframe';
  const listener = event => {
    if (isValidCookReturnMessage(event, iframe.contentWindow, hostWindow.location.origin)) onReturn();
  };
  hostWindow.addEventListener('message', listener);
  container.appendChild(iframe);
  let disposed = false;
  return {
    frame:iframe,
    show() {if (disposed) throw new Error('이미 해제된 요리 계산기 화면이야.');container.hidden = false;},
    hide() {if (disposed) throw new Error('이미 해제된 요리 계산기 화면이야.');container.hidden = true;},
    destroy() {
      if (disposed) return;
      disposed = true;
      hostWindow.removeEventListener('message',listener);
      iframe.remove();
    }
  };
}
