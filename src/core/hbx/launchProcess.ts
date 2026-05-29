import { EventEmitter } from "events";
import { spawn, ChildProcess } from "child_process";
import * as vscode from "vscode";
import { UnappRunConfig } from "../uniapp";
import { buildLaunchArgv, HbxLaunchConfig } from "./launchArgs";
import { execHbxCli, hbxCliExists } from "./cliExec";
import { getHbxCliPath } from "./paths";

export class HbxLaunchProcess extends EventEmitter {
  private _process?: ChildProcess;

  constructor(
    public config: UnappRunConfig,
    public logger: vscode.LogOutputChannel
  ) {
    super();
  }

  public async start(launchConfig: HbxLaunchConfig): Promise<void> {
    this.logger.show();
    const cliPath = getHbxCliPath(this.config.HBuilderPath);

    if (!hbxCliExists(this.config.HBuilderPath)) {
      const msg = `HBuilderX CLI 不存在: ${cliPath}`;
      this.logger.error(msg);
      this.sendEvent("stderr", msg + "\n");
      this.sendEvent("exit", 1);
      this.sendEvent("end");
      return;
    }

    const launchArgs = buildLaunchArgv(launchConfig);
    this.logger.info("uniapp-run HBuilderX launch start ....");
    this.logger.info(`HBuilderX path: ${this.config.HBuilderPath}`);
    this.logger.info(`CLI: ${cliPath}`);
    this.logger.info(`Platform: ${launchConfig.platform}`);
    this.logger.info(`Project: ${launchConfig.projectPath}`);
    this.logger.info(`Args: launch ${launchArgs.join(" ")}`);

    try {
      this.logger.info("Starting HBuilderX (cli open)...");
      await execHbxCli(this.config.HBuilderPath, ["open"], 8000);
    } catch (err) {
      this.logger.info(
        `cli open skipped or failed (will try launch anyway): ${err}`
      );
    }

    const script = spawn(cliPath, launchArgs, { windowsHide: true });
    this._process = script;

    script.stdout.on("data", (data: Buffer) => {
      const content = data.toString();
      this.logger.info(content);
      this.sendEvent("stdout", content);
    });
    script.stderr.on("data", (data: Buffer) => {
      const content = data.toString();
      this.logger.error(content);
      this.sendEvent("stderr", content);
    });
    script.on("exit", (code: number | null) => {
      const exitCode = code ?? 1;
      this.logger.info(`HBuilderX launch exit with code ${exitCode}`);
      this.sendEvent("exit", exitCode);
      this.sendEvent("end");
    });
    script.on("error", (err: Error) => {
      this.logger.error(err.stack ?? String(err));
      this.sendEvent("stderr", (err.stack ?? String(err)) + "\n");
      this.sendEvent("exit", 1);
      this.sendEvent("end");
    });
  }

  public sendEvent(event: string, ...args: unknown[]): void {
    this.emit(event, ...args);
  }

  public async stop(): Promise<void> {
    this.logger.info("uniapp-run HBuilderX launch stop ....");
    if (this._process) {
      this._process.kill();
      this._process = undefined;
    }
  }
}
