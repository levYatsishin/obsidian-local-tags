# Local tags

Color, browse, and find local file-scope `@tags` in Obsidian notes.

## What it does

- highlights local `@tags` in the editor
- ignores `@...` inside inline code and fenced code blocks
- gives each tag a stable per-file color from a configurable palette
- adds a sidebar for browsing local tags in the current note
- lets you open Obsidian find for a selected local tag
- lets you swap tag colors from the sidebar palette

## Status

This plugin is functional and actively usable, but it is still evolving.

This project was created with LLM assistance because I wanted this functionality quickly and primarily care about it working well for my own use. If it is useful to you too, great. If you hit bugs or want improvements, feel free to open an issue or send a pull request. This is effectively an LLM-assisted, functionality-first project.

## Repository

- GitHub: [levYatsishin/obsidian-local-tags](https://github.com/levYatsishin/obsidian-local-tags)
- Issues: [github.com/levYatsishin/obsidian-local-tags/issues](https://github.com/levYatsishin/obsidian-local-tags/issues)

## Install for development

The easiest workflow is to keep this repo directly inside your vault plugin directory:

```text
<Vault>/.obsidian/plugins/local-tags/
```

Then run:

```bash
npm install
npm run dev
```

Obsidian will load the built `main.js` from that folder. After code changes:

1. keep `npm run dev` running
2. reload the plugin in Obsidian

If you prefer keeping the repo elsewhere, use a symlink into:

```text
<Vault>/.obsidian/plugins/local-tags/
```

## Manual install

Copy these files into:

```text
<Vault>/.obsidian/plugins/local-tags/
```

- `main.js`
- `manifest.json`
- `styles.css`

Then enable **Local tags** in **Settings → Community plugins**.

## Development

Requirements:

- Node.js 18+
- npm

Useful commands:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run check
```

## Release process

For a GitHub release:

1. bump `version` in `manifest.json`
2. update `versions.json`
3. run `npm run check`
4. create a GitHub release tag that exactly matches the version, for example `1.0.1`
5. attach `manifest.json`, `main.js`, and `styles.css`

This repo includes a GitHub Actions release workflow that can upload those assets to a published GitHub release.

## Community plugin submission

Not submitted yet.

When ready:

1. publish at least one GitHub release
2. make sure the README is accurate
3. submit the plugin to [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases)

## Notes

- plugin id: `local-tags`
- author: Leo Yatsishin
- author URL: [https://github.com/levYatsishin](https://github.com/levYatsishin)
- repository URL: [https://github.com/levYatsishin/obsidian-local-tags](https://github.com/levYatsishin/obsidian-local-tags)

## License

`0BSD`
