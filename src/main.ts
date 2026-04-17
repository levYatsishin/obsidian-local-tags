import { Extension } from "@codemirror/state";
import {
	Editor,
	MarkdownView,
	Plugin,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import { createLocalTagHighlighterExtension } from "./editor/tag-highlighter-extension";
import {
	LocalTagHighlighterSettings,
	normalizeSettings,
} from "./settings";
import {
	LocalTagSummary,
} from "./tags/local-tags";
import {
	getFallbackPoolColor,
} from "./tags/color-palette";
import {
	assignTagColor,
	getAssignedTagColor,
	resolveTagColorsForFile,
} from "./tags/tag-color-assignments";
import { LocalTagHighlighterSettingTab } from "./ui/settings-tab";
import {
	LOCAL_TAG_SIDEBAR_VIEW_TYPE,
	LocalTagSidebarView,
} from "./ui/local-tag-sidebar-view";

const CSS_VARIABLES = {
	borderRadius: "--local-tag-highlight-radius",
	fontWeight: "--local-tag-highlight-font-weight",
};

export default class LocalTagHighlighterPlugin extends Plugin {
	settings: LocalTagHighlighterSettings;

	private editorExtensions: Extension[] = [];
	private sidebarRefreshTimer: number | null = null;
	private lastEditorContext: { file: TFile; editor: Editor; leaf: WorkspaceLeaf } | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.registerView(
			LOCAL_TAG_SIDEBAR_VIEW_TYPE,
			(leaf) => new LocalTagSidebarView(leaf, this),
		);
		this.registerEditorExtension(this.editorExtensions);
		this.refreshEditorExtensions();
		this.applyCssVariables();
		this.registerCommands();
		this.registerWorkspaceEvents();
		this.addSettingTab(new LocalTagHighlighterSettingTab(this.app, this));
		this.captureLastEditorContext();
	}

	onunload(): void {
		if (this.sidebarRefreshTimer !== null) {
			window.clearTimeout(this.sidebarRefreshTimer);
			this.sidebarRefreshTimer = null;
		}
		this.clearCssVariables();
	}

	async loadSettings(): Promise<void> {
		const rawSettings = await this.loadData() as Partial<LocalTagHighlighterSettings>;
		this.settings = normalizeSettings(rawSettings);
		if (!rawSettings?.assignmentSeed) {
			await this.saveSettings();
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async updateSettings(
		updates: Partial<LocalTagHighlighterSettings>,
		options: { refreshEditor?: boolean } = {},
	): Promise<void> {
		this.settings = normalizeSettings({
			...this.settings,
			...updates,
		});
		await this.saveSettings();
		this.applyCssVariables();

		if (options.refreshEditor ?? false) {
			this.refreshEditorExtensions();
		}
	}

	private refreshEditorExtensions(): void {
		this.editorExtensions.length = 0;

		if (this.settings.highlightEnabled) {
			this.editorExtensions.push(
				createLocalTagHighlighterExtension({
					colorPool: this.settings.colorPool,
					fileTagColors: this.settings.fileTagColors,
					assignmentSeed: this.settings.assignmentSeed,
				}),
			);
		}

		this.app.workspace.updateOptions();
	}

	private applyCssVariables(): void {
		document.body.style.setProperty(
			CSS_VARIABLES.borderRadius,
			`${this.settings.borderRadius}px`,
		);
		document.body.style.setProperty(
			CSS_VARIABLES.fontWeight,
			String(this.settings.fontWeight),
		);
	}

	private clearCssVariables(): void {
		Object.values(CSS_VARIABLES).forEach((cssVariable) => {
			document.body.style.removeProperty(cssVariable);
		});
	}

	private registerCommands(): void {
		this.addCommand({
			id: "open-local-tag-sidebar",
			name: "Open local tag sidebar",
			callback: () => {
				void this.activateSidebar();
			},
		});
	}

	private registerWorkspaceEvents(): void {
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.captureLastEditorContext();
				this.requestSidebarRefresh(0);
			}),
		);
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.captureLastEditorContext();
				this.requestSidebarRefresh(0);
			}),
		);
		this.registerEvent(
			this.app.workspace.on("editor-change", (editor, info) => {
				if (!info.file) {
					return;
				}

				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView?.file?.path === info.file.path) {
					this.lastEditorContext = {
						file: info.file,
						editor,
						leaf: markdownView.leaf,
					};
				}
				this.requestSidebarRefresh();
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (!(file instanceof TFile)) {
					return;
				}

				const oldAssignments = this.settings.fileTagColors[oldPath];
				if (!oldAssignments) {
					return;
				}

				const nextAssignments = { ...this.settings.fileTagColors };
				delete nextAssignments[oldPath];
				nextAssignments[file.path] = oldAssignments;
				void this.updateSettings(
					{ fileTagColors: nextAssignments },
					{ refreshEditor: true },
				);
			}),
		);
	}

	async activateSidebar(): Promise<void> {
		const leaf = await this.app.workspace.ensureSideLeaf(
			LOCAL_TAG_SIDEBAR_VIEW_TYPE,
			"right",
			{
				reveal: true,
				active: true,
			},
		);
		await leaf.setViewState({
			type: LOCAL_TAG_SIDEBAR_VIEW_TYPE,
			active: true,
		});
		await this.app.workspace.revealLeaf(leaf);
		await this.refreshSidebarViews();
	}

	async refreshSidebarIfOpen(): Promise<void> {
		if (this.app.workspace.getLeavesOfType(LOCAL_TAG_SIDEBAR_VIEW_TYPE).length === 0) {
			return;
		}

		await this.refreshSidebarViews();
	}

	getActiveEditorContext(): { file: TFile; editor: Editor; leaf: WorkspaceLeaf } | null {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = markdownView?.file ?? null;
		const editor = markdownView?.editor ?? null;
		const leaf = markdownView?.leaf ?? null;

		if (!file || !editor || !leaf) {
			return this.lastEditorContext;
		}

		this.lastEditorContext = { file, editor, leaf };
		return this.lastEditorContext;
	}

	async jumpToTagInActiveFile(summary: LocalTagSummary): Promise<void> {
		const context = this.getActiveEditorContext();
		if (!context) {
			return;
		}

		const [firstOccurrence] = summary.occurrences;
		if (!firstOccurrence) {
			return;
		}

		const from = context.editor.offsetToPos(firstOccurrence.start);
		const to = context.editor.offsetToPos(firstOccurrence.end);
		context.editor.setSelection(from, to);
		context.editor.scrollIntoView({ from, to }, true);
		context.editor.focus();
	}

	async openTagInFind(summary: LocalTagSummary): Promise<void> {
		const context = this.getActiveEditorContext();
		if (!context) {
			return;
		}

		this.app.workspace.setActiveLeaf(context.leaf, { focus: true });
		await this.app.workspace.revealLeaf(context.leaf);
		await this.jumpToTagInActiveFile(summary);

		const commandExecutor = (
			this.app as unknown as {
				commands?: {
					commands?: Record<string, { id: string }>;
					executeCommandById?: (id: string) => boolean;
				};
			}
		).commands;

		if (!commandExecutor?.executeCommandById) {
			return;
		}

		const preferredCommandIds = [
			"editor:open-search",
			"editor:search-current-file",
			"editor:find",
			"workspace:search-current-file",
		];
		const availableCommandIds = Object.keys(commandExecutor.commands ?? {});
		const fallbackCommandIds = availableCommandIds.filter((commandId) =>
			/(editor|workspace):/.test(commandId)
			&& /(search|find)/.test(commandId),
		);
		const commandIds = [...new Set([...preferredCommandIds, ...fallbackCommandIds])];

		for (const commandId of commandIds) {
			if (commandExecutor.executeCommandById(commandId)) {
				return;
			}
		}
	}

	getResolvedTagColor(filePath: string, tag: string): string {
		return getAssignedTagColor(this.settings.fileTagColors, filePath, tag)
			?? getFallbackPoolColor(
				filePath,
				tag,
				this.settings.colorPool,
				this.settings.assignmentSeed,
			);
	}

	getResolvedTagColors(filePath: string, tags: string[]): Record<string, string> {
		return resolveTagColorsForFile(
			this.settings.fileTagColors,
			filePath,
			tags,
			this.settings.colorPool,
			this.settings.assignmentSeed,
		);
	}

	async assignTagColorForFile(
		filePath: string,
		tag: string,
		nextColor: string,
		swapWithTag?: string,
	): Promise<void> {
		const currentColor = this.getResolvedTagColor(filePath, tag);
		const nextAssignments = assignTagColor(
			this.settings.fileTagColors,
			filePath,
			tag,
			nextColor,
			currentColor,
			swapWithTag,
		);

		await this.updateSettings(
			{ fileTagColors: nextAssignments },
			{ refreshEditor: true },
		);
		await this.refreshSidebarViews();
	}

	private async refreshSidebarViews(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(LOCAL_TAG_SIDEBAR_VIEW_TYPE);
		await Promise.all(
			leaves.map(async (leaf) => {
				await leaf.loadIfDeferred();
				if (leaf.view instanceof LocalTagSidebarView) {
					await leaf.view.refresh();
				}
			}),
		);
	}

	private requestSidebarRefresh(delayMs = 120): void {
		if (this.app.workspace.getLeavesOfType(LOCAL_TAG_SIDEBAR_VIEW_TYPE).length === 0) {
			return;
		}

		if (this.sidebarRefreshTimer !== null) {
			window.clearTimeout(this.sidebarRefreshTimer);
		}

		this.sidebarRefreshTimer = window.setTimeout(() => {
			this.sidebarRefreshTimer = null;
			void this.refreshSidebarViews();
		}, delayMs);
	}

	private captureLastEditorContext(): void {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (markdownView?.file && markdownView.editor) {
			this.lastEditorContext = {
				file: markdownView.file,
				editor: markdownView.editor,
				leaf: markdownView.leaf,
			};
		}
	}
}
