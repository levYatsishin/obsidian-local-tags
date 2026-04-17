import { App, PluginSettingTab, Setting } from "obsidian";
import LocalTagHighlighterPlugin from "../main";
import { DEFAULT_SETTINGS } from "../settings";
import {
	DEFAULT_PASTEL_COLOR_POOL,
	getNextPaletteColor,
	normalizeHexColor,
	sanitizeColorPool,
} from "../tags/color-palette";

export class LocalTagHighlighterSettingTab extends PluginSettingTab {
	plugin: LocalTagHighlighterPlugin;

	constructor(app: App, plugin: LocalTagHighlighterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Local tag highlighting").setHeading();

		new Setting(containerEl)
			.setName("Enable highlighting")
			.setDesc("Highlight local tags such as @test-tag in the editor.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.highlightEnabled)
					.onChange(async (value) => {
						await this.plugin.updateSettings(
							{ highlightEnabled: value },
							{ refreshEditor: true },
						);
					}),
			)
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to default")
					.setDisabled(this.plugin.settings.highlightEnabled === DEFAULT_SETTINGS.highlightEnabled)
					.onClick(async () => {
						await this.plugin.updateSettings(
							{ highlightEnabled: DEFAULT_SETTINGS.highlightEnabled },
							{ refreshEditor: true },
						);
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName("Border radius")
			.setDesc("Adjust how rounded the tag border appears.")
			.addSlider((slider) =>
				slider
					.setLimits(0, 24, 1)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.borderRadius)
					.onChange(async (value) => {
						await this.plugin.updateSettings({ borderRadius: value });
					}),
			)
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to default")
					.setDisabled(this.plugin.settings.borderRadius === DEFAULT_SETTINGS.borderRadius)
					.onClick(async () => {
						await this.plugin.updateSettings({
							borderRadius: DEFAULT_SETTINGS.borderRadius,
						});
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName("Font weight")
			.setDesc("Make the highlighted tag text lighter or bolder.")
			.addSlider((slider) =>
				slider
					.setLimits(400, 800, 100)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.fontWeight)
					.onChange(async (value) => {
						await this.plugin.updateSettings({ fontWeight: value });
					}),
			)
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Reset to default")
					.setDisabled(this.plugin.settings.fontWeight === DEFAULT_SETTINGS.fontWeight)
					.onClick(async () => {
						await this.plugin.updateSettings({
							fontWeight: DEFAULT_SETTINGS.fontWeight,
						});
						this.display();
					}),
			);

		new Setting(containerEl).setName("Color pool").setHeading();

		new Setting(containerEl)
			.setName("Palette behavior")
			.setDesc(
				"Each file gets its own persistent tag-color assignments chosen from this pastel pool. Add, remove, or edit colors locally for this vault.",
			);

		this.plugin.settings.colorPool.forEach((color, index) => {
			new Setting(containerEl)
				.setName(`Palette color ${index + 1}`)
				.setDesc(color)
				.addColorPicker((picker) =>
					picker
						.setValue(color)
						.onChange(async (value) => {
							const normalizedColor = normalizeHexColor(value);
							if (!normalizedColor) {
								return;
							}

							const nextPool = [...this.plugin.settings.colorPool];
							nextPool[index] = normalizedColor;
							await this.plugin.updateSettings(
								{ colorPool: sanitizeColorPool(nextPool) },
								{ refreshEditor: true },
							);
							await this.plugin.refreshSidebarIfOpen();
							this.display();
						}),
				)
				.addExtraButton((button) =>
					button
						.setIcon("trash")
						.setTooltip("Remove color")
						.setDisabled(this.plugin.settings.colorPool.length <= 1)
						.onClick(async () => {
							if (this.plugin.settings.colorPool.length <= 1) {
								return;
							}

							const nextPool = this.plugin.settings.colorPool.filter(
								(_, currentIndex) => currentIndex !== index,
							);
							await this.plugin.updateSettings(
								{ colorPool: sanitizeColorPool(nextPool) },
								{ refreshEditor: true },
							);
							await this.plugin.refreshSidebarIfOpen();
							this.display();
						}),
				);
		});

		new Setting(containerEl)
			.setName("Add palette color")
			.setDesc("Append another pastel color to the local pool.")
			.addButton((button) =>
				button
					.setButtonText("Add color")
					.setCta()
					.onClick(async () => {
						const nextPool = [
							...this.plugin.settings.colorPool,
							getNextPaletteColor(this.plugin.settings.colorPool),
						];
						await this.plugin.updateSettings(
							{ colorPool: nextPool },
							{ refreshEditor: true },
						);
						await this.plugin.refreshSidebarIfOpen();
						this.display();
					}),
			)
			.addButton((button) =>
				button
					.setButtonText("Reset to defaults")
					.onClick(async () => {
						await this.plugin.updateSettings(
							{ colorPool: [...DEFAULT_PASTEL_COLOR_POOL] },
							{ refreshEditor: true },
						);
						await this.plugin.refreshSidebarIfOpen();
						this.display();
					}),
			);
	}
}
