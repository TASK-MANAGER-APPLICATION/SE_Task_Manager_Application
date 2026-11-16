const isValidAndroidApplicationId = (value) =>
  /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(value);

module.exports = ({ config }) => {
  const applicationId = process.env.ANDROID_APPLICATION_ID;
  if (process.env.EAS_BUILD_PROFILE && !applicationId) {
    throw new Error('Set ANDROID_APPLICATION_ID to the team-approved Android package identifier before building.');
  }
  if (applicationId && !isValidAndroidApplicationId(applicationId)) {
    throw new Error('ANDROID_APPLICATION_ID must be a valid reverse-domain package identifier.');
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(applicationId ? { package: applicationId } : {}),
    },
  };
};
