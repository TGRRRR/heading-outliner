Heading Outliner is an Obsidian plugin that brings **Outliner-style editing** to heading-based Markdown. Move, indent, and unindent entire sections using the same keyboard shortcuts as bullet lists.
# Features
## Section Movement (`Ctrl+Shift+↑` / `Ctrl+Shift+↓`)
Move a heading and all its content (body text + sub-headings) up or down past sibling sections. Fold state is preserved - sections that were folded before the move stay folded afterward.
## Indent / Unindent (`Tab` / `Shift+Tab`)
Increase or decrease heading levels. Tab/Shift+Tab only activates when the cursor is on a heading line - body text and list items are unaffected. Supports single or multiple selected headings (range selection or multi-cursor). Fold state is preserved.
**Smart fold handling:** When indenting a heading to become a child of a folded parent, the parent automatically unfolds to show the new child. All other fold states remain unchanged.
## Visual Heading Indent
Optional per-level indentation in both the editor and reading view, styled via CSS.
## Compatibility with Outliner
Should work with Outliner plugin without conflicts.
# Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Move section up | `Ctrl+Shift+↑` |
| Move section down | `Ctrl+Shift+↓` |
| Indent section | `Tab` (on heading line) |
| Unindent section | `Shift+Tab` (on heading line) |
# Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Override tab on heading lines | On | Enable indent/unindent on heading lines |
| Indent headings by level | On | Visually indent headings by level |
| Indent size (em) | 0.5 | Spacing per heading level |
# Changelog
## 0.0.4
- **Fixed:** Multi-selection now preserves all selections after indent/unindent
- **Fixed:** Nested headings no longer cause duplicate text changes
- **Fixed:** Fold states are now properly preserved during operations
- **Fixed:** When indenting into a folded parent, only that parent unfolds (siblings stay folded)
- **Refactored:** All operations now use native CodeMirror 6 API for better reliability
## 0.0.3
- Initial release with core features (F1-F5)
