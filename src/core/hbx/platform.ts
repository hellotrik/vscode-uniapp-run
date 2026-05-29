export type AppLaunchPlatform = "app-android" | "app-ios";

export function isAppLaunchPlatform(platform: string): platform is AppLaunchPlatform {
  return platform === "app-android" || platform === "app-ios";
}

export function isAppPublishPlatform(platform: string): boolean {
  return isAppLaunchPlatform(platform);
}

export function getDevicesListPlatform(
  platform: AppLaunchPlatform,
  iosTarget?: "device" | "simulator"
): string {
  if (platform === "app-android") {
    return "android";
  }
  return iosTarget === "simulator" ? "ios-simulator" : "ios-iPhone";
}
