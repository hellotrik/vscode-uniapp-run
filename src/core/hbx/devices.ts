import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import { execHbxCli } from "./cliExec";
import { AppLaunchPlatform, getDevicesListPlatform } from "./platform";

const execFileAsync = promisify(execFile);

export interface HbxDevice {
  id: string;
  label: string;
}

/**
 * 解析 HBuilderX `cli devices list` 输出。
 * 官方/社区格式：`时间戳 设备名【deviceId】`
 */
export function parseDevicesListOutput(output: string): HbxDevice[] {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  const devices: HbxDevice[] = [];
  const seen = new Set<string>();

  const pushDevice = (id: string, label: string) => {
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    devices.push({ id, label: label || id });
  };

  try {
    const json = JSON.parse(trimmed) as unknown;
    if (Array.isArray(json)) {
      for (const item of json) {
        if (typeof item === "string") {
          pushDevice(item, item);
        } else if (item && typeof item === "object") {
          const o = item as Record<string, string>;
          const id = o.id ?? o.deviceId ?? o.serial ?? o.udid ?? "";
          const name = o.name ?? o.label ?? o.model ?? id;
          if (id) {
            pushDevice(id, name ? `${name} (${id})` : id);
          }
        }
      }
      if (devices.length > 0) {
        return devices;
      }
    }
  } catch {
    // 非 JSON，继续按行解析
  }

  for (const line of trimmed.split(/\r?\n/)) {
    const text = line.trim();
    if (
      !text ||
      /version|help|用法|文档|参数|platform|请选择|----/i.test(text)
    ) {
      continue;
    }

    const bracketMatch = text.match(/【([^】]+)】/);
    if (bracketMatch) {
      const id = bracketMatch[1].trim();
      const namePart = text.replace(/\s*【[^】]+】\s*$/, "").trim();
      const name = namePart.replace(/^\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\s*/, "");
      pushDevice(id, name ? `${name} (${id})` : id);
      continue;
    }

    const parts = text.split(/\s+/);
    const id = parts[0];
    if (id && /^[\w.-]+$/.test(id) && parts[1] === "device") {
      pushDevice(id, id);
    }
  }

  return devices;
}

export async function ensureHbxOpen(hbuilderPath: string): Promise<void> {
  try {
    await execHbxCli(hbuilderPath, ["open"], 8000);
  } catch {
    // launch 前尽力启动 HBuilderX
  }
}

export function getHbxAdbPath(hbuilderPath: string): string {
  const isMac = process.platform === "darwin";
  const parts = isMac
    ? ["Contents", "HBuilderX", "plugins", "launcher-tools", "tools", "adbs"]
    : ["plugins", "launcher-tools", "tools", "adbs"];
  const dir = path.join(hbuilderPath, ...parts);
  return process.platform === "win32"
    ? path.join(dir, "adb.exe")
    : path.join(dir, "adb");
}

export async function listAdbDevices(hbuilderPath: string): Promise<HbxDevice[]> {
  const candidates = [getHbxAdbPath(hbuilderPath), "adb"];
  for (const adbPath of candidates) {
    try {
      const { stdout } = await execFileAsync(adbPath, ["devices"], {
        timeout: 10000,
        windowsHide: true,
      });
      return parseDevicesListOutput(stdout);
    } catch {
      continue;
    }
  }
  return [];
}

export async function listHbxDevices(
  hbuilderPath: string,
  platform: AppLaunchPlatform,
  iosTarget?: "device" | "simulator"
): Promise<HbxDevice[]> {
  await ensureHbxOpen(hbuilderPath);

  const listPlatform = getDevicesListPlatform(platform, iosTarget);
  const { stdout, stderr, code } = await execHbxCli(hbuilderPath, [
    "devices",
    "list",
    "--platform",
    listPlatform,
  ]);
  const combined = `${stdout}\n${stderr}`.trim();
  let devices = parseDevicesListOutput(combined);

  if (devices.length === 0 && platform === "app-android") {
    devices = await listAdbDevices(hbuilderPath);
  }

  if (code !== 0 && devices.length === 0 && !combined) {
    return [];
  }

  return devices;
}
