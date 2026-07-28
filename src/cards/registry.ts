import type {
	DashboardCardDefinition,
	DashboardCardId,
	DashboardCardSize,
} from './types';

export const DASHBOARD_CARDS: readonly DashboardCardDefinition[] = [
	{ id: 'health', title: '知识库健康度', icon: 'activity', selector: '.agent-inlay-metric--health', defaultSize: 'compact' },
	{ id: 'inbox', title: '收件箱积压', icon: 'inbox', selector: '.agent-inlay-metric--inbox', defaultSize: 'compact' },
	{ id: 'task-flow', title: '任务流', icon: 'circle-check', selector: '.agent-inlay-metric--task-flow', defaultSize: 'compact' },
	{ id: 'inspiration', title: '记录灵感', icon: 'lightbulb', selector: '.agent-inlay-inspiration', defaultSize: 'compact' },
	{ id: 'brief', title: '每日简报', icon: 'newspaper', selector: '.agent-inlay-brief', defaultSize: 'standard', comingSoon: true },
	{ id: 'tasks', title: '日常待办', icon: 'list-checks', selector: '.agent-inlay-tasks', defaultSize: 'standard' },
	{ id: 'pomodoro', title: '番茄钟', icon: 'timer', selector: '.agent-inlay-pomodoro', defaultSize: 'compact' },
	{ id: 'heatmap', title: '笔记热力图', icon: 'chart-no-axes-column', selector: '.agent-inlay-heatmap', defaultSize: 'standard' },
	{ id: 'calendar', title: '日历', icon: 'calendar-days', selector: '.agent-inlay-calendar', defaultSize: 'compact' },
	{ id: 'gallery', title: '我的相框', icon: 'images', selector: '.agent-inlay-gallery', defaultSize: 'wide' },
	{ id: 'github', title: 'GitHub 动态', icon: 'github', selector: '.agent-inlay-github', defaultSize: 'wide', comingSoon: true },
];

export const DEFAULT_CARD_ORDER: DashboardCardId[] = DASHBOARD_CARDS.map((card) => card.id);

export const DEFAULT_CARD_SIZES = Object.fromEntries(
	DASHBOARD_CARDS.map((card) => [card.id, card.defaultSize]),
) as Record<DashboardCardId, DashboardCardSize>;

export function getCardDefinition(id: DashboardCardId): DashboardCardDefinition {
	return DASHBOARD_CARDS.find((card) => card.id === id)!;
}
