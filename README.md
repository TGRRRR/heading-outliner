# Overview
Heading Outliner is an Obsidian plugin that brings **Outliner-style editing** to heading-based Markdown. Move, indent, and unindent entire sections using the same keyboard hotkeys as bullet lists.
# Features
## Section movement (`Ctrl+Shift+↑` / `Ctrl+Shift+↓`)
Move a heading and all its content (body text + sub-headings) up or down past sibling sections. Fold state is preserved - sections that were folded before the move stay folded afterward.
## Indent / unindent (`Tab` / `Shift+Tab`)
Increase or decrease heading levels. Tab/Shift+Tab only activates when the cursor is on a heading line - body text and list items are unaffected. Supports single or multiple selected headings (range selection or multi-cursor). Fold state is preserved.
**Smart fold handling:** When indenting a heading to become a child of a folded parent, the parent automatically unfolds to show the new child. All other fold states remain unchanged.
## Visual heading indent
Optional per-level indentation in both the editor and reading view, styled via CSS.
## Compatibility with Outliner
Fully compatible with the [Outliner](https://github.com/vslinko/obsidian-outliner) plugin. Both plugins use context-aware CM6 keymaps: Heading Outliner intercepts keypresses only when the cursor is on a heading line and explicitly passes through to Outliner on bullet/list lines. There are no hotkey conflicts.
# Installation
## Community plugins (not supported yet)
1. Open Obsidian → **Settings → Community plugins**
2. Disable **Safe mode** if prompted
3. Click **Browse** and search for **Heading Outliner**
4. Click **Install**, then **Enable**
## BRAT (beta testing)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Open BRAT settings → **Add Beta Plugin**
3. Paste: `https://github.com/tgrrrr/heading-outliner`
## Manual
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/tgrrrr/heading-outliner/releases/latest)
2. Create folder `<vault>/.obsidian/plugins/heading-outliner/`
3. Place the three files inside that folder
4. Reload Obsidian → **Settings → Community plugins** → enable **Heading Outliner**
# Keyboard hotkeys
| Action            | Hotkey                        |
| ----------------- | ----------------------------- |
| Move section up   | `Ctrl+Shift+↑`                |
| Move section down | `Ctrl+Shift+↓`                |
| Indent section    | `Tab` (on heading line)       |
| Unindent section  | `Shift+Tab` (on heading line) |
> Hotkeys are handled via CodeMirror 6 keymaps and are not exposed to Obsidian's hotkey manager. This is intentional: these keys need context-aware interception (activate only on heading lines, pass through otherwise) which Obsidian's command system cannot provide (see [Hotkey Architecture Dilemma](https://github.com/tgrrrr/heading-outliner/blob/main/Heading%20Outliner.md#hotkey-architecture-dilemma)). Custom modifier configuration is planned for a future release.
# Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Indent headings by level | On | Visually indent headings by level |
| Indent size (em) | 0.5 | Spacing per heading level |
# Roadmap
- [ ] Implement moving all selected blocks up/down, same way as indenting/unindenting selected blocks work
- [ ] Implement custom movement modifier configuration via individual ALT, CTRL, SHIFT boolean toggles in settings
- [ ] Implement Drag-n-drop
# Changelog
## 1.0.0
- Prepared for release, bugs fixed
## 0.0.4
- **Fixed:** Multi-selection now preserves all selections after indent/unindent
- **Fixed:** Nested headings no longer cause duplicate text changes
- **Fixed:** Fold states are now properly preserved during operations
- **Fixed:** When indenting into a folded parent, only that parent unfolds (siblings stay folded)
- **Refactored:** All operations now use native CodeMirror 6 API for better reliability
## 0.0.3
- Initial release with core features (F1-F5)
