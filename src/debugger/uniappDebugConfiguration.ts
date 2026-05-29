import * as vscode from "vscode";
import { resolveAppLaunchDevice } from "../core/hbx/resolveDevice";

export class UniappDebugConfigurationProvider
  implements vscode.DebugConfigurationProvider
{
  static activate(ctx: vscode.ExtensionContext) {
    const provider = new UniappDebugConfigurationProvider();
    ctx.subscriptions.push(
      vscode.debug.registerDebugConfigurationProvider("uniapp-run", provider)
    );
  }

  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    return this.applyDefaults(folder, config);
  }

  async resolveDebugConfigurationWithSubstitutedVariables(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration | undefined> {
    const resolved = this.applyDefaults(folder, config) ?? config;
    return resolveAppLaunchDevice(resolved);
  }

  private applyDefaults(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration
  ): vscode.DebugConfiguration {
    if (!config.type && !config.name) {
      config.type = "uniapp-run";
      config.name = "Uniapp Run";
      config.request = "launch";
    }
    config.cwd = config.cwd ?? "${workspaceFolder}";
    config.projectName = config.projectName ?? folder?.name;
    return config;
  }
}
