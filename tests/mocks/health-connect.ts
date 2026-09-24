export const SdkAvailabilityStatus = {
  SDK_UNAVAILABLE: 1,
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
  SDK_AVAILABLE: 3,
} as const;

export async function getSdkStatus(): Promise<number> {
  return SdkAvailabilityStatus.SDK_UNAVAILABLE;
}

export async function initialize(): Promise<boolean> {
  return false;
}

export async function requestPermission(): Promise<never[]> {
  return [];
}

export async function getGrantedPermissions(): Promise<never[]> {
  return [];
}

export async function readRecords(): Promise<{ records: never[] }> {
  return { records: [] };
}
