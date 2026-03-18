# Heading Outliner

An Obsidian plugin that brings **Outliner-style editing** to heading-based Markdown. Move, indent, and unindent entire sections using the same keyboard shortcuts you'd use with bullet lists — with zero configuration required.

## Features

### Section Movement (`Ctrl+Shift+↑` / `Ctrl+Shift+↓`)
Move a heading and all its content (body text + sub-headings) up or down past sibling sections. Fold state is fully preserved.

### Indent / Unindent (`Tab` / `Shift+Tab`)
Increase or decrease heading levels. Tab/Shift+Tab only activates when the cursor is on a heading line — body text and list items are unaffected. Works with single or multiple selected headings. Fold state is preserved.

### Visual Heading Indent
Optional per-level indentation in both the editor and reading view, styled via CSS.

### Complements Outliner
Uses CodeMirror 6 keymaps at the same priority level as the Outliner plugin. When cursor is on a heading, this plugin handles the key. When on a list item, Outliner handles it. No conflicts.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Move section up | `Ctrl+Shift+↑` |
| Move section down | `Ctrl+Shift+↓` |
| Indent section | `Tab` (on heading line) |
| Unindent section | `Shift+Tab` (on heading line) |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Override Tab on heading lines | On | Enable indent/unindent on heading lines |
| Indent headings by level | On | Visually indent headings by level |
| Indent size (em) | 1.5 | Spacing per heading level |
| Enable drag handles | Off | Phase 2 feature |

## Building

```bash
npm install
npm run build
```

The compiled files (`main.js`, `styles.css`, `manifest.json`) go in your vault's `.obsidian/plugins/heading-outliner/` folder.

For development with watch mode:
```bash
npm run dev
```
