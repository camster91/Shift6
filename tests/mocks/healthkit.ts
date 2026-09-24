export const CategoryValueSleepAnalysis = {
  inBed: 0,
  asleepUnspecified: 1,
  asleep: 1,
  awake: 2,
  asleepCore: 3,
  asleepDeep: 4,
  asleepREM: 5,
};

const healthKit = {
  isHealthDataAvailableAsync: async () => false,
  requestAuthorization: async () => false,
  queryQuantitySamples: async () => [],
  queryCategorySamples: async () => [],
  queryWorkoutSamples: async () => [],
};

export default healthKit;
