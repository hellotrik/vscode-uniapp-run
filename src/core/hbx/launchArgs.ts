import * as path from "path";
import { AppLaunchPlatform } from "./platform";

export interface HbxLaunchConfig {
  platform: AppLaunchPlatform;
  projectPath: string;
  deviceId?: string;
  playground?: "standard" | "custom";
  nativeLog?: boolean;
  iosTarget?: "device" | "simulator";
  compileOnly?: boolean;
  continueOnError?: boolean;
  cleanCache?: boolean;
}

export function buildLaunchArgv(config: HbxLaunchConfig): string[] {
  const projectPath = path.resolve(config.projectPath);
  const args: string[] = [
    "launch",
    config.platform,
    "--project",
    projectPath,
  ];

  if (config.deviceId) {
    args.push("--deviceId", config.deviceId);
  }
  if (config.playground) {
    args.push("--playground", config.playground);
  }
  if (config.platform === "app-android" && config.nativeLog) {
    args.push("--native-log", "true");
  }
  if (config.platform === "app-ios" && config.iosTarget) {
    args.push("--iosTarget", config.iosTarget);
  }
  if (config.compileOnly) {
    args.push("--compile", "true");
  }
  if (config.continueOnError) {
    args.push("--continue-on-error", "true");
  }
  if (config.cleanCache) {
    args.push("--cleanCache", "true");
  }

  return args;
}
