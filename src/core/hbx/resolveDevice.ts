import * as vscode from "vscode";
import { getUniappConfig } from "../../context";
import { AppLaunchPlatform, isAppLaunchPlatform } from "./platform";
import { listHbxDevices } from "./devices";

/**
 * 为 App 平台解析 deviceId：列表获取、QuickPick、无设备时中止。
 * @returns 已写入 deviceId 的配置；无法继续时返回 undefined
 */
export async function resolveAppLaunchDevice(
  config: vscode.DebugConfiguration
): Promise<vscode.DebugConfiguration | undefined> {
  if (!isAppLaunchPlatform(config.platform) || config.deviceId) {
    return config;
  }

  const hbxConfig = getUniappConfig();
  if (!hbxConfig) {
    return config;
  }

  let devices: Awaited<ReturnType<typeof listHbxDevices>> = [];
  try {
    devices = await listHbxDevices(
      hbxConfig.HBuilderPath,
      config.platform as AppLaunchPlatform,
      config.iosTarget
    );
  } catch (err) {
    vscode.window.showErrorMessage(
      `获取设备列表失败: ${err instanceof Error ? err.message : String(err)}`
    );
    return undefined;
  }

  if (devices.length === 0) {
    const action = await vscode.window.showErrorMessage(
      "未检测到可用设备。请连接 Android 真机/模拟器并开启 USB 调试，或在 launch.json 中配置 deviceId。",
      "重试",
      "取消"
    );
    if (action === "重试") {
      return resolveAppLaunchDevice(config);
    }
    return undefined;
  }

  if (devices.length === 1) {
    config.deviceId = devices[0].id;
    return config;
  }

  const picked = await vscode.window.showQuickPick(
    devices.map((d) => ({
      label: d.label,
      description: d.id,
      deviceId: d.id,
    })),
    { placeHolder: "选择运行设备（HBuilderX 要求指定 deviceId）" }
  );

  if (!picked) {
    vscode.window.showWarningMessage("已取消运行：未选择设备");
    return undefined;
  }

  config.deviceId = picked.deviceId;
  return config;
}
