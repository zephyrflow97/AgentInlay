import {
	App,
	normalizePath,
	PluginSettingTab,
	TFile,
	TFolder,
	type SettingDefinition,
	type SettingDefinitionItem,
} from 'obsidian';
import type AgentInlayPlugin from './main';
import { DEFAULT_CARD_ORDER, DEFAULT_CARD_SIZES } from './cards/registry';
import type { DashboardCardId, DashboardCardSize } from './cards/types';

export type { DashboardCardId, DashboardCardSize } from './cards/types';

const KNOWN_CARD_IDS = new Set<string>(DEFAULT_CARD_ORDER);

export type DashboardSize = 'tiny' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
export type DashboardDensity = 'comfortable' | 'dense';
export type DashboardTheme =
	| 'forest'
	| 'mist'
	| 'clay'
	| 'indigo'
	| 'graphite'
	| 'citrus'
	| 'coral'
	| 'violet'
	| 'midnight';
export type DashboardCoverMode = 'card' | 'fade';
export interface DashboardCrop {
	zoom: number;
	x: number;
	y: number;
}

type CropSettingKey = 'coverCrop' | 'avatarCrop' | 'galleryCrop';
type CropProperty = keyof DashboardCrop;
type CropControlKey = `${CropSettingKey}.${CropProperty}`;
type DirectSettingKey =
	| 'fontFamily'
	| 'size'
	| 'density'
	| 'bubbleFontFamily'
	| 'bubbleSize'
	| 'theme'
	| 'greeting'
	| 'coverMode'
	| 'diaryFolder'
	| 'projectLogFolder'
	| 'inboxFolder'
	| 'inspirationFolder'
	| 'taskFilePath'
	| 'openOnStartup'
	| 'openWhenEmpty';
type SettingKey = DirectSettingKey | CropControlKey;

export interface AgentInlaySettings {
	configVersion: 1;
	fontFamily: string;
	size: DashboardSize;
	density: DashboardDensity;
	bubbleFontFamily: string;
	bubbleSize: number;
	theme: DashboardTheme;
	greeting: string;
	coverMode: DashboardCoverMode;
	coverCrop: DashboardCrop;
	avatarCrop: DashboardCrop;
	galleryCrop: DashboardCrop;
	diaryFolder: string;
	projectLogFolder: string;
	inboxFolder: string;
	inspirationFolder: string;
	taskFilePath: string;
	openOnStartup: boolean;
	openWhenEmpty: boolean;
	pomodoroDate: string;
	pomodoroRounds: number;
	cardOrder: DashboardCardId[];
	cardSizes: Record<DashboardCardId, DashboardCardSize>;
}

const DEFAULT_CROP: DashboardCrop = { zoom: 100, x: 50, y: 50 };
const DIRECT_SETTING_KEYS: ReadonlySet<string> = new Set<DirectSettingKey>([
	'fontFamily',
	'size',
	'density',
	'bubbleFontFamily',
	'bubbleSize',
	'theme',
	'greeting',
	'coverMode',
	'diaryFolder',
	'projectLogFolder',
	'inboxFolder',
	'inspirationFolder',
	'taskFilePath',
	'openOnStartup',
	'openWhenEmpty',
]);
const CROP_BINDINGS: Record<CropControlKey, readonly [CropSettingKey, CropProperty]> = {
	'coverCrop.zoom': ['coverCrop', 'zoom'],
	'coverCrop.x': ['coverCrop', 'x'],
	'coverCrop.y': ['coverCrop', 'y'],
	'avatarCrop.zoom': ['avatarCrop', 'zoom'],
	'avatarCrop.x': ['avatarCrop', 'x'],
	'avatarCrop.y': ['avatarCrop', 'y'],
	'galleryCrop.zoom': ['galleryCrop', 'zoom'],
	'galleryCrop.x': ['galleryCrop', 'x'],
	'galleryCrop.y': ['galleryCrop', 'y'],
};

export const DEFAULT_SETTINGS: AgentInlaySettings = {
	configVersion: 1,
	fontFamily: 'Noto Sans SC',
	size: 'medium',
	density: 'dense',
	bubbleFontFamily: 'Microsoft YaHei UI',
	bubbleSize: 13,
	theme: 'forest',
	greeting: '你好！AgentInlay！',
	coverMode: 'card',
	coverCrop: { ...DEFAULT_CROP },
	avatarCrop: { ...DEFAULT_CROP },
	galleryCrop: { ...DEFAULT_CROP },
	diaryFolder: '',
	projectLogFolder: '',
	inboxFolder: '',
	inspirationFolder: '',
	taskFilePath: 'AgentInlay 待办.md',
	openOnStartup: false,
	openWhenEmpty: false,
	pomodoroDate: '',
	pomodoroRounds: 0,
	cardOrder: [...DEFAULT_CARD_ORDER],
	cardSizes: { ...DEFAULT_CARD_SIZES },
};

export function normalizeSettings(value: unknown): AgentInlaySettings {
	const raw = isRecord(value) ? value : {};
	const rawOrder = Array.isArray(raw.cardOrder) ? raw.cardOrder : [];
	const knownOrder = rawOrder.filter((id): id is DashboardCardId => typeof id === 'string' && KNOWN_CARD_IDS.has(id));
	const order = [...new Set([...knownOrder, ...DEFAULT_CARD_ORDER])];
	const rawSizes: Record<string, unknown> = isRecord(raw.cardSizes) ? raw.cardSizes : {};
	const cardSizes = { ...DEFAULT_CARD_SIZES };
	for (const id of DEFAULT_CARD_ORDER) {
		const size = rawSizes[id];
		if (size === 'compact' || size === 'standard' || size === 'wide') cardSizes[id] = size;
	}
	return {
		...DEFAULT_SETTINGS,
		configVersion: 1,
		fontFamily: textValue(raw.fontFamily, DEFAULT_SETTINGS.fontFamily),
		size: isDashboardSize(raw.size) ? raw.size : DEFAULT_SETTINGS.size,
		density: raw.density === 'comfortable' || raw.density === 'dense' ? raw.density : DEFAULT_SETTINGS.density,
		bubbleFontFamily: textValue(raw.bubbleFontFamily, DEFAULT_SETTINGS.bubbleFontFamily),
		bubbleSize: clampNumber(raw.bubbleSize, 11, 18, DEFAULT_SETTINGS.bubbleSize),
		theme: isDashboardTheme(raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme,
		greeting: normalizeGreeting(raw.greeting),
		coverMode: raw.coverMode === 'fade' || raw.coverMode === 'card' ? raw.coverMode : DEFAULT_SETTINGS.coverMode,
		coverCrop: normalizeCrop(raw.coverCrop),
		avatarCrop: normalizeCrop(raw.avatarCrop),
		galleryCrop: normalizeCrop(raw.galleryCrop),
		diaryFolder: optionalText(raw.diaryFolder),
		projectLogFolder: optionalText(raw.projectLogFolder),
		inboxFolder: optionalText(raw.inboxFolder),
		inspirationFolder: optionalText(raw.inspirationFolder),
		taskFilePath: textValue(raw.taskFilePath, DEFAULT_SETTINGS.taskFilePath),
		openOnStartup: typeof raw.openOnStartup === 'boolean' ? raw.openOnStartup : DEFAULT_SETTINGS.openOnStartup,
		openWhenEmpty: typeof raw.openWhenEmpty === 'boolean' ? raw.openWhenEmpty : DEFAULT_SETTINGS.openWhenEmpty,
		pomodoroDate: typeof raw.pomodoroDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.pomodoroDate) ? raw.pomodoroDate : '',
		pomodoroRounds: Math.max(0, Math.floor(numberValue(raw.pomodoroRounds, 0))),
		cardOrder: order,
		cardSizes,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function optionalText(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function textValue(value: unknown, fallback: string): string {
	return optionalText(value) || fallback;
}

function normalizeGreeting(value: unknown): string {
	return optionalText(value) || DEFAULT_SETTINGS.greeting;
}

function numberValue(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
	return Math.min(maximum, Math.max(minimum, numberValue(value, fallback)));
}

function normalizeCrop(value: unknown): DashboardCrop {
	const crop = isRecord(value) ? value : {};
	return {
		zoom: clampNumber(crop.zoom, 100, 200, DEFAULT_CROP.zoom),
		x: clampNumber(crop.x, 0, 100, DEFAULT_CROP.x),
		y: clampNumber(crop.y, 0, 100, DEFAULT_CROP.y),
	};
}

function isDashboardSize(value: unknown): value is DashboardSize {
	return value === 'tiny' || value === 'small' || value === 'medium' || value === 'large' || value === 'xlarge' || value === 'xxlarge';
}

function isDashboardTheme(value: unknown): value is DashboardTheme {
	return value === 'forest' || value === 'mist' || value === 'clay' || value === 'indigo'
		|| value === 'graphite' || value === 'citrus' || value === 'coral' || value === 'violet' || value === 'midnight';
}

function isDirectSettingKey(value: string): value is DirectSettingKey {
	return DIRECT_SETTING_KEYS.has(value);
}

function isCropControlKey(value: string): value is CropControlKey {
	return value in CROP_BINDINGS;
}

export class AgentInlaySettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: AgentInlayPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
		return [
			{
				type: 'group',
				heading: '显示偏好',
				items: [
					{
						name: '欢迎语',
						desc: '修改仪表盘顶部主标题。',
						control: {
							type: 'text',
							key: 'greeting',
							defaultValue: DEFAULT_SETTINGS.greeting,
							placeholder: DEFAULT_SETTINGS.greeting,
						},
					},
					{
						name: '主题色',
						desc: '从克制低饱和到明快高饱和，也包含完整深色模式。',
						control: {
							type: 'dropdown',
							key: 'theme',
							defaultValue: DEFAULT_SETTINGS.theme,
							options: {
								forest: '松林 · 中饱和绿',
								mist: '湖雾 · 低饱和蓝',
								clay: '陶土 · 低饱和暖棕',
								indigo: '暮蓝 · 中饱和靛蓝',
								graphite: '石墨 · 中性灰',
								citrus: '青柠 · 高饱和黄绿',
								coral: '珊瑚 · 高饱和暖红',
								violet: '紫藤 · 高饱和紫',
								midnight: '深夜 · 深色模式',
							},
						},
					},
					{
						name: '界面字体',
						desc: '输入系统中已安装字体的准确名称。',
						control: {
							type: 'text',
							key: 'fontFamily',
							defaultValue: DEFAULT_SETTINGS.fontFamily,
							placeholder: '输入系统字体名称',
						},
					},
					{
						name: '界面字号',
						desc: '调整所有卡片的基础字号。',
						control: {
							type: 'dropdown',
							key: 'size',
							defaultValue: DEFAULT_SETTINGS.size,
							options: {
								tiny: '较小 · 13 px',
								small: '小号 · 14 px',
								medium: '标准 · 16 px',
								large: '大号 · 18 px',
								xlarge: '加大 · 20 px',
								xxlarge: '特大 · 22 px',
							},
						},
					},
					{
						name: '布局密度',
						desc: '高密度布局整体缩小并增加桌面列数；标准布局保留舒展间距。',
						control: {
							type: 'dropdown',
							key: 'density',
							defaultValue: DEFAULT_SETTINGS.density,
							options: {
								dense: '高密度',
								comfortable: '标准',
							},
						},
					},
				],
			},
			{
				type: 'group',
				heading: '气泡文字',
				items: [
					{
						name: '气泡字形',
						desc: '影响顶部操作、状态胶囊和布局控制，不改变待办正文。',
						control: {
							type: 'text',
							key: 'bubbleFontFamily',
							defaultValue: DEFAULT_SETTINGS.bubbleFontFamily,
							placeholder: '输入气泡字体名称',
						},
					},
					{
						name: '气泡字号',
						desc: '调整顶部操作、状态胶囊和布局控制的字号。',
						control: {
							type: 'slider',
							key: 'bubbleSize',
							defaultValue: DEFAULT_SETTINGS.bubbleSize,
							min: 11,
							max: 18,
							step: 1,
							displayFormat: (value) => `${value}px`,
						},
					},
				],
			},
			{
				type: 'group',
				heading: '顶部背景',
				items: [
					{
						name: '呈现方式',
						desc: '在气泡卡片与向下渐变融入背景之间切换。',
						control: {
							type: 'dropdown',
							key: 'coverMode',
							defaultValue: DEFAULT_SETTINGS.coverMode,
							options: {
								card: '气泡卡片',
								fade: '渐变融入',
							},
						},
					},
				],
			},
			{
				type: 'group',
				heading: '图片裁剪',
				items: [
					...this.cropDefinitions('顶部背景', 'coverCrop'),
					...this.cropDefinitions('头像', 'avatarCrop'),
					...this.cropDefinitions('相框照片', 'galleryCrop'),
				],
			},
			{
				type: 'group',
				heading: '知识库目录',
				items: [
					this.folderDefinition('日记目录', '每篇新日记保存的位置。', 'diaryFolder'),
					this.folderDefinition('项目日志目录', '每篇新项目日志保存的位置。', 'projectLogFolder'),
					this.folderDefinition(
						'收件箱目录',
						'临时笔记与待整理资料保存的位置；积压数量会递归统计其中的全部文件。',
						'inboxFolder',
					),
					this.folderDefinition('灵感库目录', '每日灵感记录保存的位置。', 'inspirationFolder'),
				],
			},
			{
				type: 'group',
				heading: '任务与启动',
				items: [
					{
						name: '任务文件',
						desc: '日历与日常待办共用此文件；首次保存任务时可以创建文件，但不会自动创建文件夹。',
						control: {
							type: 'text',
							key: 'taskFilePath',
							defaultValue: DEFAULT_SETTINGS.taskFilePath,
							placeholder: DEFAULT_SETTINGS.taskFilePath,
							validate: (value) => this.validateTaskFile(value),
						},
					},
					{
						name: '启动时打开工作台',
						desc: 'Obsidian 完成布局加载后打开工作台，并自动刷新一次。',
						control: {
							type: 'toggle',
							key: 'openOnStartup',
							defaultValue: DEFAULT_SETTINGS.openOnStartup,
						},
					},
					{
						name: '关闭所有页面后打开工作台',
						desc: '主编辑区没有其他页面时打开工作台，并自动刷新一次。',
						control: {
							type: 'toggle',
							key: 'openWhenEmpty',
							defaultValue: DEFAULT_SETTINGS.openWhenEmpty,
						},
					},
				],
			},
			{
				type: 'group',
				heading: '卡片布局',
				items: [
					{
						name: '恢复推荐布局',
						desc: '紧凑、标准、加宽分别占 1×1、1×2、1×3；卡片在仪表盘中可拖动排序。',
						render: (setting) => {
							setting.addButton((button) => button
								.setButtonText('恢复')
								.onClick(async () => {
									await this.patch({
										cardOrder: [...DEFAULT_CARD_ORDER],
										cardSizes: { ...DEFAULT_CARD_SIZES },
									});
									this.update();
								}));
						},
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		if (isCropControlKey(key)) {
			const [settingKey, property] = CROP_BINDINGS[key];
			return this.plugin.settings[settingKey][property];
		}
		return isDirectSettingKey(key) ? this.plugin.settings[key] : undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (isCropControlKey(key)) {
			if (typeof value !== 'number') return;
			const [settingKey, property] = CROP_BINDINGS[key];
			await this.plugin.updateSettings(normalizeSettings({
				...this.plugin.settings,
				[settingKey]: {
					...this.plugin.settings[settingKey],
					[property]: value,
				},
			}));
			return;
		}
		if (!isDirectSettingKey(key)) return;
		await this.plugin.updateSettings(normalizeSettings({ ...this.plugin.settings, [key]: value }));
	}

	private folderDefinition(
		name: string,
		description: string,
		key: 'diaryFolder' | 'projectLogFolder' | 'inboxFolder' | 'inspirationFolder',
	): SettingDefinition<SettingKey> {
		return {
			name,
			desc: `${description} 请选择知识库中已经存在的目录。`,
			control: {
				type: 'folder',
				key,
				placeholder: '选择知识库目录',
				includeRoot: false,
				filter: (folder) => this.isAllowedFolder(folder),
				validate: (value) => this.validateFolder(value),
			},
		};
	}

	private isAllowedFolder(folder: TFolder): boolean {
		const configDir = normalizePath(this.app.vault.configDir);
		return folder.path !== configDir && !folder.path.startsWith(`${configDir}/`);
	}

	private validateFolder(value: string): string | void {
		const input = value.trim();
		if (!input) return;
		const path = normalizePath(input);
		if (path === '/') return '请选择 Vault 根目录以外的目录。';
		const folder = this.app.vault.getAbstractFileByPath(path);
		if (!(folder instanceof TFolder)) return '找不到此目录。';
		if (!this.isAllowedFolder(folder)) return '笔记目录不能位于 Obsidian 配置目录中。';
	}

	private validateTaskFile(value: string): string | void {
		const input = value.trim();
		if (!input) return '任务文件路径不能为空。';
		const path = normalizePath(input);
		if (path === '/' || !path.toLowerCase().endsWith('.md')) return '任务文件必须是有效的 Markdown 文件路径。';
		if (path === this.app.vault.configDir || path.startsWith(`${this.app.vault.configDir}/`)) {
			return '任务文件不能位于 Obsidian 配置目录中。';
		}
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing && !(existing instanceof TFile)) return '任务文件路径指向的不是 Markdown 文件。';
		const separator = path.lastIndexOf('/');
		const parentPath = separator >= 0 ? path.slice(0, separator) : '';
		const parent = parentPath ? this.app.vault.getAbstractFileByPath(parentPath) : null;
		if (parentPath && !(parent instanceof TFolder)) return '任务文件所在目录不存在。';
	}

	private cropDefinitions(label: string, key: CropSettingKey): SettingDefinition<SettingKey>[] {
		return [
			{
				name: `${label} · 缩放`,
				control: {
					type: 'slider',
					key: `${key}.zoom`,
					defaultValue: DEFAULT_CROP.zoom,
					min: 100,
					max: 200,
					step: 5,
					displayFormat: (value) => `${value}%`,
				},
			},
			{
				name: `${label} · 水平位置`,
				control: {
					type: 'slider',
					key: `${key}.x`,
					defaultValue: DEFAULT_CROP.x,
					min: 0,
					max: 100,
					step: 1,
					displayFormat: (value) => `${value}%`,
				},
			},
			{
				name: `${label} · 垂直位置`,
				control: {
					type: 'slider',
					key: `${key}.y`,
					defaultValue: DEFAULT_CROP.y,
					min: 0,
					max: 100,
					step: 1,
					displayFormat: (value) => `${value}%`,
				},
			},
		];
	}

	private async patch(patch: Partial<AgentInlaySettings>): Promise<void> {
		await this.plugin.updateSettings(normalizeSettings({ ...this.plugin.settings, ...patch }));
	}
}
