import * as path from "path";

/**
 * HBuilderX CLI 可执行文件路径（与官方文档一致）
 * @see https://hx.dcloud.net.cn/cli/README
 */
export function getHbxCliPath(hbuilderPath: string): string {
  if (process.platform === "darwin") {
    return path.join(hbuilderPath, "Contents", "MacOS", "cli");
  }
  if (process.platform === "win32") {
    return path.join(hbuilderPath, "cli.exe");
  }
  return path.join(hbuilderPath, "cli");
}
