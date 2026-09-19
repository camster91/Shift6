import {
  SHIFT6_API_PROTOCOL_HEADER,
  SHIFT6_API_PROTOCOL_VERSION,
  SHIFT6_MIN_API_PROTOCOL_HEADER,
  apiProtocolCompatibilityError,
  apiProtocolRequestHeaders,
} from './apiProtocol';

describe('API protocol compatibility', () => {
  it('advertises the current mobile protocol version', () => {
    expect(apiProtocolRequestHeaders()).toEqual({
      [SHIFT6_API_PROTOCOL_HEADER]: String(SHIFT6_API_PROTOCOL_VERSION),
    });
  });

  it('accepts an omitted, equal, or older minimum server requirement', () => {
    expect(apiProtocolCompatibilityError(new Headers())).toBeNull();
    expect(
      apiProtocolCompatibilityError(
        new Headers({ [SHIFT6_MIN_API_PROTOCOL_HEADER]: String(SHIFT6_API_PROTOCOL_VERSION) }),
      ),
    ).toBeNull();
    expect(
      apiProtocolCompatibilityError(new Headers({ [SHIFT6_MIN_API_PROTOCOL_HEADER]: '1' })),
    ).toBeNull();
  });

  it('rejects malformed or newer-required protocol responses', () => {
    expect(
      apiProtocolCompatibilityError(new Headers({ [SHIFT6_MIN_API_PROTOCOL_HEADER]: 'next' })),
    ).toContain('invalid');
    expect(
      apiProtocolCompatibilityError(new Headers({ [SHIFT6_MIN_API_PROTOCOL_HEADER]: '0' })),
    ).toContain('invalid');
    expect(
      apiProtocolCompatibilityError(
        new Headers({
          [SHIFT6_MIN_API_PROTOCOL_HEADER]: String(SHIFT6_API_PROTOCOL_VERSION + 1),
        }),
      ),
    ).toContain('Update the app');
  });
});
