import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	AgentInlaySettingTab,
	normalizeSettings,
	type AgentInlaySettings,
} from './settings';
import { AgentInlayView } from './views/AgentInlayView';
import { DashboardVaultService } from './services/DashboardVaultService';
import { DashboardTaskService } from './services/DashboardTaskService';
import { DashboardActions } from './services/DashboardActions';

export default class AgentInlayPlugin extends Plugin {
	settings: AgentInlaySettings = DEFAULT_SETTINGS;
	private emptyCheckTimer: number | null = null;
	private openingDashboard = false;
	private get viewType(): string {
		return `${this.manifest.id}-view`;
	}

	async onload(): Promise<void> {
		await this.loadSettings();
		const vaultService = new DashboardVaultService(this.app, () => this.settings);
		const taskService = new DashboardTaskService(this.app, () => this.settings);
		const actions = new DashboardActions(this.app, vaultService, taskService);

		this.registerView(
			this.viewType,
			(leaf: WorkspaceLeaf) => new AgentInlayView(
				leaf,
				this.viewType,
				() => this.settings,
				(settings) => this.updateSettings(settings),
				vaultService,
				taskService,
				actions,
			),
		);

		this.addRibbonIcon('layout-dashboard', '打开仪表盘', () => {
			this.openDashboard();
		});

		this.addCommand({
			id: 'open-dashboard',
			name: '打开仪表盘',
			callback: () => {
				this.openDashboard();
			},
		});

		this.addSettingTab(new AgentInlaySettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.openOnStartup) this.openDashboard(true);
		});
		this.registerEvent(this.app.workspace.on('layout-change', () => this.queueEmptyWorkspaceCheck()));
		this.register(() => {
			const viewWindow = this.app.workspace.containerEl.ownerDocument.defaultView;
			if (this.emptyCheckTimer !== null) viewWindow?.clearTimeout(this.emptyCheckTimer);
		});
	}

	async updateSettings(settings: AgentInlaySettings): Promise<void> {
		const inboxFolderChanged = settings.inboxFolder !== this.settings.inboxFolder;
		const taskFileChanged = settings.taskFilePath !== this.settings.taskFilePath;
		this.settings = settings;
		await this.saveData(settings);

		for (const leaf of this.app.workspace.getLeavesOfType(this.viewType)) {
			if (leaf.view instanceof AgentInlayView) {
				leaf.view.applyDisplaySettings();
				if (inboxFolderChanged) leaf.view.refreshVaultData();
				if (taskFileChanged) void leaf.view.refreshTaskData();
			}
		}
	}

	private async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}

	private async activateDashboard(refresh = false): Promise<void> {
		if (this.openingDashboard) return;
		this.openingDashboard = true;
		try {
			const { workspace } = this.app;
			let leaf = workspace.getLeavesOfType(this.viewType)[0];

			if (!leaf) {
				let emptyLeaf: WorkspaceLeaf | null = null;
				workspace.iterateRootLeaves((candidate) => {
					if (!emptyLeaf && candidate.view.getViewType() === 'empty') emptyLeaf = candidate;
				});
				leaf = emptyLeaf ?? workspace.getLeaf(true);
				await leaf.setViewState({
					type: this.viewType,
					active: true,
				});
			}

			await workspace.revealLeaf(leaf);
			if (refresh && leaf.view instanceof AgentInlayView) await leaf.view.refreshDashboard();
		} finally {
			this.openingDashboard = false;
		}
	}

	private openDashboard(refresh = false): void {
		void this.activateDashboard(refresh).catch((error: unknown) => {
			new Notice(error instanceof Error ? error.message : '打开 AgentInlay 失败。');
		});
	}

	private queueEmptyWorkspaceCheck(): void {
		if (!this.settings.openWhenEmpty || this.openingDashboard) return;
		const viewWindow = this.app.workspace.containerEl.ownerDocument.defaultView;
		if (!viewWindow) return;
		if (this.emptyCheckTimer !== null) viewWindow.clearTimeout(this.emptyCheckTimer);
		this.emptyCheckTimer = viewWindow.setTimeout(() => {
			this.emptyCheckTimer = null;
			if (!this.settings.openWhenEmpty || this.app.workspace.getLeavesOfType(this.viewType).length > 0) return;
			let hasContent = false;
			this.app.workspace.iterateRootLeaves((leaf) => {
				if (leaf.view.getViewType() !== 'empty') hasContent = true;
			});
			if (!hasContent) this.openDashboard(true);
		}, 120);
	}
}
