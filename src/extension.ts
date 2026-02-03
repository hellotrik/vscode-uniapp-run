import * as vscode from 'vscode';
import * as commands from './commands';
import { UniappDebugConfigurationProvider } from './debugger/uniappDebugConfiguration';
import * as UniappDebugFactory from "./debugger/uniappDebugFactory"
import { UniappStatusBarButtons } from './statusbar';

/**
 * 检查工作区中是否有 uniapp-run 配置
 */
function hasUniappRunConfig(): boolean {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		return false;
	}

	for (const folder of folders) {
		const config = vscode.workspace.getConfiguration("launch", folder.uri);
		const configurations: Array<any> = config.get("configurations") ?? [];
		const hasConfig = configurations.some((item: any) => item.type === "uniapp-run");
		if (hasConfig) {
			return true;
		}
	}
	return false;
}

export function activate(context: vscode.ExtensionContext) {
	const logChannel= vscode.window.createOutputChannel("uniapp-run",{log:true})
	context.subscriptions.push(logChannel)
	
	// register commands first
	const registerCommand=commands.createRegisterCommand(context,logChannel);
	registerCommand("uniapp-run.publish",commands.publish);
	registerCommand("uniapp-run.run",(ctx,logChannel)=>commands.run(ctx,logChannel));

	/** 重新识别：立即根据 launch 配置刷新状态栏按钮，无防抖 */
	const runRefresh = () => {
		if (updateTimer) {
			clearTimeout(updateTimer);
			updateTimer = null;
		}
		if (hasUniappRunConfig()) {
			UniappStatusBarButtons.setup(context);
		} else {
			UniappStatusBarButtons.dispose();
		}
	};
	registerCommand("uniapp-run.refresh", (_ctx, _logChannel) => () => {
		runRefresh();
		vscode.window.setStatusBarMessage("uniapp-run: 已重新识别", 2000);
	});

	// 防抖定时器
	let updateTimer: NodeJS.Timeout | null = null;

	// 检查是否有 uniapp-run 配置，如果有才创建状态栏按钮（防抖 300ms）
	const updateButtons = () => {
		if (updateTimer) {
			clearTimeout(updateTimer);
		}
		updateTimer = setTimeout(() => {
			if (hasUniappRunConfig()) {
				UniappStatusBarButtons.setup(context);
			} else {
				UniappStatusBarButtons.dispose();
			}
			updateTimer = null;
		}, 300);
	};

	// 初始检查
	if (hasUniappRunConfig()) {
		UniappStatusBarButtons.setup(context);
	}
	
	// 监听 launch.json 文件变化，当配置变化时更新按钮
	const launchJsonWatcher = vscode.workspace.createFileSystemWatcher("**/.vscode/launch.json");
	launchJsonWatcher.onDidChange(() => {
		updateButtons();
	});
	launchJsonWatcher.onDidCreate(() => {
		updateButtons();
	});
	launchJsonWatcher.onDidDelete(() => {
		updateButtons();
	});
	context.subscriptions.push(launchJsonWatcher);

	// 监听工作区配置变化
	const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration("launch")) {
			updateButtons();
		}
	});
	context.subscriptions.push(configWatcher);
	
	// 清理定时器
	context.subscriptions.push(new vscode.Disposable(() => {
		if (updateTimer) {
			clearTimeout(updateTimer);
		}
	}));

	// register debug adapter
	UniappDebugConfigurationProvider.activate(context);
	UniappDebugFactory.active(context,logChannel);

}

// This method is called when your extension is deactivated
export function deactivate() {}
