import {
	ItemView,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import LocalTagHighlighterPlugin from "../main";
import { getTagStyleVariables } from "../tags/color-palette";
import {
	LocalTagSummary,
	collectLocalTagSummaries,
} from "../tags/local-tags";

export const LOCAL_TAG_SIDEBAR_VIEW_TYPE = "local-tag-sidebar";

export class LocalTagSidebarView extends ItemView {
	private readonly plugin: LocalTagHighlighterPlugin;

	private filterQuery = "";
	private openPaletteTag: string | null = null;
	private searchInputEl: HTMLInputElement | null = null;
	private helperEl: HTMLDivElement | null = null;
	private listEl: HTMLDivElement | null = null;
	private emptyEl: HTMLDivElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: LocalTagHighlighterPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return LOCAL_TAG_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Local tags";
	}

	getIcon(): string {
		return "tags";
	}

	async onOpen(): Promise<void> {
		this.buildLayout();
		this.addAction("refresh-cw", "Refresh local tags", () => {
			void this.refresh();
		});
		await this.refresh();
	}

	async refresh(): Promise<void> {
		this.buildLayout();

		const context = this.plugin.getActiveEditorContext();
		if (!this.listEl || !this.helperEl || !this.emptyEl) {
			return;
		}

		this.listEl.empty();
		this.emptyEl.empty();

		if (!context?.file || !context.editor) {
			this.helperEl.setText("");
			this.emptyEl.setText("Open a Markdown file to browse local tags.");
			return;
		}

		const allSummaries = collectLocalTagSummaries(context.editor.getValue());
		const resolvedTagColors = this.plugin.getResolvedTagColors(
			context.file.path,
			allSummaries.map((summary) => summary.tag),
		);
		const summaries = filterSummaries(
			allSummaries,
			this.filterQuery,
		);

		if (summaries.length === 0) {
			this.helperEl.setText("");
			this.emptyEl.setText("No matching local tags in the current file.");
			return;
		}

		this.helperEl.setText(
			`${summaries.length} tag${summaries.length === 1 ? "" : "s"} in ${context.file.basename}`,
		);
		for (const summary of summaries) {
			this.renderTagItem(this.listEl, context.file, summary, allSummaries, resolvedTagColors);
		}
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
		this.searchInputEl = null;
		this.helperEl = null;
		this.listEl = null;
		this.emptyEl = null;
	}

	private renderTagItem(
		containerEl: HTMLElement,
		file: TFile,
		summary: LocalTagSummary,
		allSummaries: LocalTagSummary[],
		resolvedTagColors: Record<string, string>,
	): void {
		const itemEl = containerEl.createDiv({ cls: "local-tag-sidebar__item" });

		const mainButtonEl = itemEl.createEl("button", {
			cls: "local-tag-sidebar__jump",
			attr: { type: "button" },
		});
		const tagChipEl = mainButtonEl.createSpan({
			cls: "cm-local-tag-highlight local-tag-sidebar__chip",
			text: summary.tag,
		});
		tagChipEl.setAttribute(
			"style",
			getTagStyleVariables(
				resolvedTagColors[summary.tag] ?? this.plugin.getResolvedTagColor(file.path, summary.tag),
			),
		);
		mainButtonEl.createSpan({
			cls: "local-tag-sidebar__count",
			text: `${summary.count}`,
		});
		mainButtonEl.addEventListener("click", () => {
			void this.plugin.openTagInFind(summary);
		});

		const colorButtonEl = itemEl.createEl("button", {
			cls: "local-tag-sidebar__color-button",
			attr: { type: "button", "aria-label": `Change color for ${summary.tag}` },
		});
		colorButtonEl.setAttribute(
			"style",
			`background:${resolvedTagColors[summary.tag] ?? this.plugin.getResolvedTagColor(file.path, summary.tag)};`,
		);
		colorButtonEl.setAttribute("title", "Choose tag color");
		colorButtonEl.addEventListener("click", (event) => {
			event.stopPropagation();
			this.openPaletteTag = this.openPaletteTag === summary.tag
				? null
				: summary.tag;
			void this.refresh();
		});

		if (this.openPaletteTag === summary.tag) {
			this.renderColorPalette(itemEl, file, summary, allSummaries, resolvedTagColors);
		}
	}

	private renderColorPalette(
		containerEl: HTMLElement,
		file: TFile,
		summary: LocalTagSummary,
		allSummaries: LocalTagSummary[],
		resolvedTagColors: Record<string, string>,
	): void {
		const paletteEl = containerEl.createDiv({ cls: "local-tag-sidebar__palette" });
		const currentColor = resolvedTagColors[summary.tag]
			?? this.plugin.getResolvedTagColor(file.path, summary.tag);

		for (const color of this.plugin.settings.colorPool) {
			const usedByTag = allSummaries.find((item) =>
				item.tag !== summary.tag
				&& resolvedTagColors[item.tag] === color,
			)?.tag ?? null;
			const paletteButtonEl = paletteEl.createEl("button", {
				cls: "local-tag-sidebar__palette-button",
				attr: {
					type: "button",
					"aria-label": usedByTag
						? `${color} used by ${usedByTag}`
						: `${color} available`,
				},
			});
			if (color === currentColor) {
				paletteButtonEl.addClass("is-selected");
			}
			if (usedByTag) {
				paletteButtonEl.addClass("is-used");
			}

			const swatchEl = paletteButtonEl.createSpan({
				cls: "local-tag-sidebar__palette-swatch",
			});
			swatchEl.setAttribute("style", `background:${color};`);
			if (usedByTag) {
				paletteButtonEl.createSpan({
					cls: "local-tag-sidebar__palette-label",
					text: usedByTag,
				});
			}
			paletteButtonEl.addEventListener("click", (event) => {
				event.stopPropagation();
				if (color === currentColor) {
					void this.refresh();
					return;
				}

				void this.plugin.assignTagColorForFile(
					file.path,
					summary.tag,
					color,
					usedByTag ?? undefined,
				);
				this.openPaletteTag = summary.tag;
			});
		}
	}

	private buildLayout(): void {
		if (this.searchInputEl && this.helperEl && this.listEl && this.emptyEl) {
			return;
		}

		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("local-tag-sidebar");

		const headerEl = contentEl.createDiv({ cls: "local-tag-sidebar__header" });
		headerEl.createEl("h3", {
			cls: "local-tag-sidebar__title",
			text: "Local tags",
		});

		this.searchInputEl = contentEl.createEl("input", {
			type: "search",
			cls: "local-tag-sidebar__search",
			placeholder: "Filter local tags",
			value: this.filterQuery,
		});
		this.searchInputEl.addEventListener("input", () => {
			this.filterQuery = this.searchInputEl?.value ?? "";
			void this.refresh();
		});

		this.helperEl = contentEl.createDiv({ cls: "local-tag-sidebar__helper" });
		this.emptyEl = contentEl.createDiv({ cls: "local-tag-sidebar__empty" });
		this.listEl = contentEl.createDiv({ cls: "local-tag-sidebar__list" });
	}
}

function filterSummaries(
	summaries: LocalTagSummary[],
	filterQuery: string,
): LocalTagSummary[] {
	const normalizedQuery = filterQuery.trim().toLowerCase();

	if (normalizedQuery.length === 0) {
		return summaries;
	}

	return summaries.filter((summary) =>
		summary.tag.toLowerCase().includes(normalizedQuery),
	);
}
