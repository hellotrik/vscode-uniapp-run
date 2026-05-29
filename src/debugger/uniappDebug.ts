import { DebugProtocol } from "@vscode/debugprotocol";
import {
  DebugSession,
  ExitedEvent,
  InitializedEvent,
  Logger,
  OutputEvent,
  TerminatedEvent,
  logger,
} from "@vscode/debugadapter";
import * as vscode from "vscode";
import * as path from "path";
import { getUniappConfig } from "../context";
import { UniappDebugProcess } from "../core/uniapp/process";
import { UnappRunConfig, UniappRuntimeArgs, runtimeArgs } from "../core/uniapp";
import {
  HbxLaunchProcess,
  HbxLaunchConfig,
  isAppLaunchPlatform,
  AppLaunchPlatform,
} from "../core/hbx";

interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  platform: string;
  cwd: string;
  src: string;
  projectName: string;
  compress: boolean;
  vueVersion: "v2" | "v3";
  openDevTool: boolean;
  trace: boolean;
  deviceId?: string;
  playground?: "standard" | "custom";
  nativeLog?: boolean;
  iosTarget?: "device" | "simulator";
  compileOnly?: boolean;
  continueOnError?: boolean;
  cleanCache?: boolean;
}

type RunProcess = UniappDebugProcess | HbxLaunchProcess;

export class UniappDebugSession extends DebugSession {
  private _runtime?: RunProcess;
  private _config?: UnappRunConfig;

  constructor(public logger: vscode.LogOutputChannel) {
    super();
    logger.info("uniapp-run debug session start ....");
    this._config = getUniappConfig();
  }

  private bindRuntime(runtime: RunProcess): void {
    runtime.on("data", (data: string) => {
      this.sendEvent(new OutputEvent(data));
    });
    runtime.on("stdout", (data: string) => {
      this.sendEvent(new OutputEvent(data, "stdout"));
    });
    runtime.on("stderr", (data: string) => {
      this.sendEvent(new OutputEvent(data, "stderr"));
    });
    runtime.on("exit", (code: number) => {
      this.sendEvent(new ExitedEvent(code));
    });
    runtime.on("end", () => {
      this.sendEvent(new TerminatedEvent());
    });
  }

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments
  ): void {
    response.body = response.body || {};
    response.body = {
      supportsCompletionsRequest: false,
      supportsConditionalBreakpoints: false,
      supportsDelayedStackTraceLoading: false,
      supportsEvaluateForHovers: false,
      supportsExceptionInfoRequest: false,
      supportsExceptionOptions: false,
      supportsFunctionBreakpoints: false,
      supportsHitConditionalBreakpoints: false,
      supportsLoadedSourcesRequest: false,
      supportsRestartFrame: false,
      supportsSetVariable: false,
      supportsStepBack: false,
      supportsStepInTargetsRequest: false,
    };

    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  protected configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
    args: DebugProtocol.ConfigurationDoneArguments
  ): void {
    super.configurationDoneRequest(response, args);
  }

  protected async disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    args: DebugProtocol.DisconnectArguments,
    request?: DebugProtocol.Request
  ) {
    await this._runtime?.stop();
    this.sendResponse(response);
  }

  protected async launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: LaunchRequestArguments
  ) {
    logger.setup(
      args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop,
      false
    );
    const uniappConfig = getUniappConfig();
    if (!uniappConfig) {
      this.sendEvent(new OutputEvent("请设置HBuilderX路径", "stderr"));
      this.sendErrorResponse(response, {
        id: 201,
        format: "请设置HBuilderX路径",
        showUser: false,
        sendTelemetry: true,
      });
      vscode.window
        .showErrorMessage("请设置HBuilderX路径", { modal: true }, {
          title: "打开设置",
        })
        .then((item) => {
          if (item) {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "@ext:hb0730.uniapp-run"
            );
          }
        });
      return;
    }

    const workPath = path.normalize(args.src || args.cwd);

    if (isAppLaunchPlatform(args.platform)) {
      const runtime = new HbxLaunchProcess(uniappConfig, this.logger);
      this.bindRuntime(runtime);
      this._runtime = runtime;

      const launchConfig: HbxLaunchConfig = {
        platform: args.platform as AppLaunchPlatform,
        projectPath: workPath,
        deviceId: args.deviceId,
        playground: args.playground,
        nativeLog: args.nativeLog,
        iosTarget: args.iosTarget ?? "device",
        compileOnly: args.compileOnly,
        continueOnError: args.continueOnError,
        cleanCache: args.cleanCache,
      };

      if (!launchConfig.deviceId) {
        this.sendEvent(
          new OutputEvent(
            "未指定 deviceId。请在 launch.json 配置 deviceId，或启动时从设备列表中选择。\n",
            "stderr"
          )
        );
        this.sendErrorResponse(response, {
          id: 202,
          format: "请选择设备后再运行（配置 deviceId 或启动时选择设备）",
          showUser: true,
          sendTelemetry: false,
        });
        return;
      }

      await runtime.start(launchConfig);
    } else {
      const runtime = new UniappDebugProcess(uniappConfig, this.logger);
      this.bindRuntime(runtime);
      this._runtime = runtime;

      const _args: runtimeArgs = {
        workPath,
        name: args.projectName,
        platform: args.platform,
        compress: args.compress || false,
        uniVueVersion: args.vueVersion || "v2",
        openDevTools: args.openDevTool || false,
        production: false,
      };
      await runtime.start(new UniappRuntimeArgs(_args, uniappConfig));
    }

    this.sendResponse(response);
  }
}
