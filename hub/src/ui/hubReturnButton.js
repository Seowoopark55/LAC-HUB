// One label/markup for the HUB return control across independent contents.
// Keep each screen's existing navigation action: only its presentation is shared.
export const HUB_RETURN_INNER = '<span class="lac-hub-return__arrow" aria-hidden="true">←</span><span>메인으로</span>';

export function hubReturnButton(legacyClass = '') {
  const classAttribute = legacyClass ? ` class="${legacyClass}"` : '';
  return `<button type="button"${classAttribute} data-action="go-hub" data-hub-return aria-label="메인으로 이동">${HUB_RETURN_INNER}</button>`;
}
