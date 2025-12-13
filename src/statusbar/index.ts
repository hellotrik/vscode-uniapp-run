import * as vscode from "vscode";

export class UniappStatusBarButtons {
  private buttons: vscode.StatusBarItem[] = [];
  private static instance: UniappStatusBarButtons | null = null;
  private ctx: vscode.ExtensionContext | null = null;

  static setup(ctx: vscode.ExtensionContext) {
    if (this.instance) {
      // 如果已存在实例，先清理
      this.instance.dispose();
    }
    this.instance = new this();
    this.instance.ctx = ctx;
    this.instance.setupWatchers(ctx);
    // 延迟创建按钮，确保命令已经注册且窗口已就绪
    setTimeout(() => {
      if (this.instance) {
        this.instance.createButtons();
      }
    }, 200);
  }

  static dispose() {
    if (this.instance) {
      this.instance.dispose();
      this.instance = null;
    }
  }

  private createButtons() {
    // 先清理现有按钮
    this.disposeButtons();

    try {
      // 创建"uniapp 发布"按钮
      const publishButton = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        10020
      );
      publishButton.text = "$(rocket) uniapp 发布";
      publishButton.tooltip = "uniapp 发布";
      publishButton.command = "uniapp-run.publish";
      publishButton.show();
      this.buttons.push(publishButton);

      // 创建"uniapp 构建"按钮
      const buildButton = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        10010
      );
      buildButton.text = "$(debug) uniapp 构建";
      buildButton.tooltip = "uniapp 构建";
      buildButton.command = "uniapp-run.run";
      buildButton.show();
      this.buttons.push(buildButton);
    } catch (error) {
      console.error("创建状态栏按钮失败:", error);
    }
  }

  private setupWatchers(ctx: vscode.ExtensionContext) {
    // 监听工作区变化，重新创建按钮
    const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.updateButtons();
    });
    ctx.subscriptions.push(workspaceWatcher);

    // 监听窗口激活，确保按钮始终显示
    const windowStateWatcher = vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        // 窗口激活时，确保按钮显示
        this.ensureButtonsVisible();
      }
    });
    ctx.subscriptions.push(windowStateWatcher);

    // 注册清理函数
    const disposable = new vscode.Disposable(() => {
      this.disposeButtons();
    });
    ctx.subscriptions.push(disposable);
  }

  private ensureButtonsVisible() {
    // 检查按钮是否存在且可见，如果不存在则重新创建
    if (this.buttons.length === 0) {
      this.createButtons();
    } else {
      // 确保所有按钮都显示
      this.buttons.forEach((btn) => {
        if (btn) {
          btn.show();
        }
      });
    }
  }

  private updateButtons() {
    // 重新创建按钮
    this.createButtons();
  }

  private disposeButtons() {
    this.buttons.forEach((btn) => btn.dispose());
    this.buttons = [];
  }

  private dispose() {
    this.disposeButtons();
    this.ctx = null;
  }
}
