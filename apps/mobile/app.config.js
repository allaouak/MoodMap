const IS_DEV = process.env.APP_ENV === "development";
const IS_PREVIEW = process.env.APP_ENV === "preview";

const BASE_ID = "com.khettal.moodmap";
const bundleId = IS_DEV ? `${BASE_ID}.dev` : IS_PREVIEW ? `${BASE_ID}.preview` : BASE_ID;

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: IS_DEV ? "MoodMap (dev)" : IS_PREVIEW ? "MoodMap (preview)" : "MoodMap",
    slug: "moodmap",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "moodmap",
    userInterfaceStyle: "light",
    sdkVersion: "54.0.0",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1E0857",
      imageWidth: 148,
    },
    updates: {
      url: "https://u.expo.dev/266cf383-7b95-40b3-91dc-035730bb0d1c",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: bundleId,
      buildNumber: "2",
      infoPlist: {
        NSFaceIDUsageDescription:
          "MoodMap utilise Face ID pour protéger l'accès à ton journal.",
        NSHealthShareUsageDescription:
          "MoodMap peut lire tes données de sommeil et d'activité pour enrichir ton journal émotionnel. Tes données ne quittent jamais ton appareil sans ton accord.",
        NSHealthUpdateUsageDescription:
          "MoodMap ne modifie pas tes données de santé.",
        ITSAppUsesNonExemptEncryption: false,
        ...(IS_DEV && {
          NSLocalNetworkUsageDescription:
            "MoodMap accède au réseau local pour se connecter au serveur de développement Expo.",
          NSBonjourServices: ["_expo._tcp", "_http._tcp"],
        }),
      },
      entitlements: {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.associated-domains": ["applinks:moodmap.app"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#1E0857",
      },
      package: bundleId,
      permissions: [
        "android.permission.health.READ_SLEEP_SESSION",
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_EXERCISE",
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "moodmap.app",
              pathPrefix: "/reset-password",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-local-authentication",
      [
        "@kingstinct/react-native-healthkit",
        {
          background: false,
          NSHealthShareUsageDescription:
            "MoodMap peut lire tes données de sommeil et d'activité pour enrichir ton journal émotionnel. Tes données ne quittent jamais ton appareil sans ton accord.",
          NSHealthUpdateUsageDescription:
            "MoodMap ne modifie pas tes données de santé.",
        },
      ],
      [
        "react-native-health-connect",
        {
          permissions: [
            "android.permission.health.READ_SLEEP_SESSION",
            "android.permission.health.READ_STEPS",
            "android.permission.health.READ_EXERCISE",
          ],
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          organization: "khettal",
          project: "moodmap",
        },
      ],
      "./plugins/withPersonalTeamEntitlements",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 148,
          resizeMode: "contain",
          backgroundColor: "#1E0857",
        },
      ],
      [
        "expo-font",
        {
          fonts: [],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: "266cf383-7b95-40b3-91dc-035730bb0d1c",
      },
    },
  },
};
