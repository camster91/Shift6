import { safeNativeLink } from '../src/domain/nativeLinks';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return safeNativeLink(path);
}
