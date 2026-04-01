# Tasks
- [ ] Implement moving all selected blocks up/down, same way as indenting/unindenting selected blocks work
- [ ] Implement Drag-n-drop
- [ ] Implement custom movement modifier configuration via individual ALT, CTRL, SHIFT boolean toggles in settings
# Overview
Obsidian plugin that brings the **Outliner-style editing workflow** (fast block manipulation via keyboard) to **regular heading-based Markdown**, with no required configuration.
The core mental model: a **section** (heading + all its content until next equal/higher heading) behaves like a movable, indent-able block exactly like a list item in Outliner.
- Version: v1.0.0
- Status: F1-F5 fully implemented and stable. Phase 2 (drag-and-drop) is optional.
## Definitions
- **Section**: A heading line + all body content + all sub-headings, until the next heading of equal or higher level
- **Indent**: Increase heading level by 1 (`#` → `##`); cascades to all child headings within the section
- **Unindent**: Decrease heading level by 1 (`##` → `#`); cascades to all child headings; blocked at H1
- **Move**: Swap a section with the adjacent sibling section above or below, preserving internal structure
# Features
## F1 Move Section Up / Down ✅
- Move the section the cursor is in upward or downward past its sibling
- Children and body content travel with the section
- Works regardless of whether the section is folded or unfolded
- Fold state is preserved: all previously folded lines are remapped by line-count delta and re-folded synchronously
- **Hotkey**: `Ctrl+Shift+↑` / `Ctrl+Shift+↓` 
- Uses CM6 keymap at `Prec.high` - strictly evaluates if cursor is on a heading line, gracefully yielding to the Outliner plugin for list item movement otherwise.
- Single undoable transaction (one Ctrl+Z to undo)
## F2 Indent Section ✅
- Increases the heading level of the current heading by 1
- All child headings within the section are also increased by 1
- Blocked silently at H6
- **Hotkey**: `Tab` (when cursor is on a heading line)
- **Multi-select**: range selection and multi-cursor (Alt+Click) - all selected sections indent together in one transaction
- **Selection preservation**: all selections/cursors remain in place after operation
- **Fold-aware**: when indenting into a folded parent, parent automatically unfolds
## F3 Unindent Section ✅
- Decreases the heading level of the current heading by 1
- All child headings within the section are decreased by 1
- Blocked silently at H1
- **Hotkey**: `Shift+Tab` (when cursor is on a heading line)
- **Multi-select**: same as F2
- **Selection preservation**: all selections/cursors remain in place after operation
## F4 Contextual Hotkey Scoping ✅
- Tab, Shift+Tab, and Movement overrides **only activate when the cursor is strictly on a heading line**
- On body text lines or list items: default Obsidian behavior is preserved, yielding to Outliner plugin seamlessly
- **No conflict with the Outliner plugin** - both use CM6 keymaps at `Prec.highest`; each handles its own context (headings vs list items)
## F5 Visual Heading Indent ✅
- Optional per-level indentation in editor (`padding-left`) and reading view (`margin-left`)
- Controlled by CSS variable `--heading-indent-size`
- Settings: toggle on/off + size slider (0.5-4 em, default 1.5)
## F6 Drag-and-Drop ❌
- Drag handle rendered in the editor gutter next to each heading
- Dragging moves the full section to the target position
- Works on both folded and unfolded sections
# Behaviors
- **Cascade is mandatory**: indent/unindent always affects the full section subtree, never just the heading line alone
- **Move respects section boundaries**: moving down means swapping with the next sibling at the same or higher level, not just the next line
- **Cursor stays in section**: after any operation, cursor remains within the same section it started in
- **No destructive operations**: indent at H6 or unindent at H1 does nothing silently - no error, no transform
- **Undo-compatible**: every operation is a single undoable transaction
- **Fold preservation**: fold state is saved before and restored after any text manipulation - no tearing or flash of unfolded content
- **Multi-section indent**: when multiple headings are selected, only root headings are processed (nested selections are filtered out)
- **Selection preservation**: all selections and cursors are mapped through changes using CM6's native mapping
# Architecture
## CM6 Native Architecture
All operations use native CodeMirror 6 API:
- `EditorView.dispatch()` for all state changes
- `ChangeSet` for building and mapping changes
- `ChangeSet.mapPos()` for position mapping through changes
- `EditorSelection.map()` for selection mapping
- `foldedRanges()` / `foldEffect` / `unfoldEffect` from `@codemirror/language` for fold management
## Selection Mapping
Positions are mapped using `ChangeSet.desc` to ensure selections remain valid after document changes:
```ts
const changeSet = ChangeSet.of(changes, state.doc.length);
cmView.dispatch({
    changes,
    selection: state.selection.map(changeSet.desc)
});
```
## Root Heading Detection
When multiple headings are selected (via range or multi-cursor), nested headings are filtered to only process root headings:
- Headings are sorted by line number and level
- Any heading whose section is fully contained within another selected section is excluded
- This prevents duplicate processing of nested content
## Fold State Management
Folds are handled with position-aware mapping:
1. Capture all fold ranges before changes using `foldedRanges()`
2. Build `ChangeSet` from document changes
3. Map fold positions through `changeSet.mapPos(pos, assoc)`
4. For unfolding parent: use post-change mapped positions in `unfoldEffect`
5. For preserving folds: re-apply with mapped positions after changes
**Key insight from Perplexity**: Effects in a transaction are evaluated against post-change positions. Pre-change fold positions must be mapped through `ChangeSet` before use in `unfoldEffect`.
## Single Transaction
All operations use CM6's native transaction system, ensuring a single undo step per operation.
## Hotkey Architecture Dilemma
All hotkeys in Heading Outliner are hardcoded into a CodeMirror 6 keymap extension (`Prec.high`) rather than exposed through Obsidian's native command/hotkey system. This was a deliberate architectural decision after encountering several fundamental conflicts:
### Why not use Obsidian's `addCommand()` with hotkeys?
1. **Tab is not assignable:** Obsidian's hotkey editor does not recognize `Tab` as a valid key for hotkey assignment. Since `Tab`/`Shift+Tab` is the core indent/unindent mechanism, it must be handled at the CM6 level.
2. **Context-aware pass-through is impossible via commands:** Obsidian commands are either active or not. There is no mechanism for a command to say "I don't want this keypress, pass it to the next handler." CM6 keymaps support this natively by returning `false` from the `run` handler, which lets the keypress fall through to other plugins (like Outliner) or default Obsidian behavior.
3. **Conflict with the Outliner plugin:** When `Ctrl+Shift+Up/Down` was registered as an Obsidian command, users who also use the Outliner plugin would see a hotkey conflict warning in Settings. Worse, assigning the same hotkey to both plugins caused Outliner's list-item movement to stop working entirely — Heading Outliner would always intercept the keypress, even when the cursor was on a bullet point, not a heading.
### Options considered
| Option                                                     | Verdict                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hardcode CM6 keymaps with contextual pass-through          | **Chosen.** All hotkeys activate only when the cursor is strictly on a heading line. On any other line, the keypress passes through to Outliner or default behavior seamlessly. No conflict warnings, no configuration needed. |
| Expose commands via `addCommand()` without default hotkeys | Users would need to manually assign hotkeys, but `Tab` cannot be assigned. Movement commands would conflict with Outliner if the same hotkey is used.                                                                          |
| Read Outliner's hotkey configuration dynamically           | Requires accessing undocumented `app.hotkeyManager` internals. Fragile, likely rejected by reviewers.                                                                                                                          |
| React to Outliner's command execution events               | No public API exists for cross-plugin command hooks.                                                                                                                                                                           |
### Future improvement
The planned custom modifier configuration (ALT/CTRL/SHIFT toggles in Settings) will allow users to change the movement modifier combination. This will be implemented by dynamically rebuilding the CM6 keymap extension when settings change, using CM6 Compartments for hot-swapping.
# Out of Scope
- List item manipulation (use Outliner plugin for that)
- Frontmatter / YAML block handling (ignore / skip)
- Multi-cursor or multi-selection move (Phase 2 consideration)
- Exporting / converting between heading and list formats
# Settings
| Setting                       | Default | Description                  |
| ----------------------------- | ------- | ---------------------------- |
| Indent headings by level      | ON      | Visual per-level indentation |
| Indent size (em)              | 0.5     | Spacing per heading level    |
