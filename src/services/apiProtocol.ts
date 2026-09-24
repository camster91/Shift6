export const SHIFT6_API_PROTOCOL_VERSION = 1;
export const SHIFT6_API_PROTOCOL_HEADER = 'X-Shift6-Protocol-Version';
export const SHIFT6_MIN_API_PROTOCOL_HEADER = 'X-Shift6-Min-Protocol-Version';

export function apiProtocolRequestHeaders(): Record<string, string> {
  return {
    [SHIFT6_API_PROTOCOL_HEADER]: String(SHIFT6_API_PROTOCOL_VERSION),
  };
}

export function apiProtocolCompatibilityError(headers: Headers): string | null {
  const rawMinimum = headers.get(SHIFT6_MIN_API_PROTOCOL_HEADER);
  if (rawMinimum === null) return null;

  const normalized = rawMinimum.trim();
  if (!/^\d+$/.test(normalized)) {
    return `The server returned an invalid ${SHIFT6_MIN_API_PROTOCOL_HEADER} header.`;
  }

  const minimum = Number(normalized);
  if (!Number.isSafeInteger(minimum) || minimum < 1) {
    return `The server returned an invalid ${SHIFT6_MIN_API_PROTOCOL_HEADER} header.`;
  }
  if (minimum > SHIFT6_API_PROTOCOL_VERSION) {
    return `This SHIFT6 build supports API protocol ${SHIFT6_API_PROTOCOL_VERSION}, but the server requires ${minimum}. Update the app before retrying.`;
  }
  return null;
}
