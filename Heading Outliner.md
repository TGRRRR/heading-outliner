- [ ] Create Obsidian Headings Outliner plugin #productivity 
## Overview
A single Obsidian plugin that brings the **Outliner-style editing workflow** (fast block manipulation via keyboard) to **regular heading-based Markdown**, with no required configuration.
The core mental model: a **section** (heading + all its content until next equal/higher heading) behaves like a movable, indent-able block exactly like a list item in Outliner.
## Definitions
- **Section**: A heading line + all body content + all sub-headings, until the next heading of equal or higher level
- **Indent**: Increase heading level by 1 (`##` → `###`); cascades to all child headings within the section
- **Unindent**: Decrease heading level by 1 (`###` → `##`); cascades to all child headings; blocked at H1
- **Move**: Swap a section with the adjacent sibling section above or below, preserving internal structure
## Feature Requirements
## F1 Move Section Up / Down
- Move the section the cursor is in upward or downward past its sibling
- Children and body content travel with the section
- Works regardless of whether the section is folded or unfolded
- **Hotkey**: `Ctrl+Shift+↑` / `Ctrl+Shift+↓` (mirrors Outliner default)
## F2 Indent Section
- Increases the heading level of the current heading by 1
- All child headings within the section are also increased by 1
- Blocked silently at H6
- **Hotkey**: `Tab` (when cursor is on a heading line)
## F3 Unindent Section
- Decreases the heading level of the current heading by 1
- All child headings within the section are decreased by 1
- Blocked silently at H1
- **Hotkey**: `Shift+Tab` (when cursor is on a heading line)
## F4 Tab Behavior Scoping
- Tab/Shift+Tab override **only activates when the cursor is on a heading line**
- On body text lines or list items: default Obsidian Tab behavior is preserved
- No conflict with the Outliner plugin if both are installed
## F5 Drag-and-Drop _(optional, phase 2)_
- Drag handle rendered in the editor gutter next to each heading
- Dragging moves the full section to the target position
- Works on both folded and unfolded sections
## Behavioral Rules
- **Cascade is mandatory**: indent/unindent always affects the full section subtree, never just the heading line alone
- **Move respects section boundaries**: moving down means swapping with the next sibling at the same or higher level, not just the next line
- **Cursor stays in section**: after any operation, cursor remains within the same section it started in
- **No destructive operations**: indent at H6 or unindent at H1 does nothing silently no error, no transform
- **Undo-compatible**: every operation is a single undoable transaction
## Out of Scope
- List item manipulation (use Outliner plugin for that)
- Frontmatter / YAML block handling (ignore / skip)
- Multi-cursor or multi-selection operations (phase 2 consideration)
- Exporting / converting between heading and list formats
## Settings (minimal)
| Setting                       | Default       | Description                  |
| ----------------------------- | ------------- | ---------------------------- |
| Override Tab on heading lines | ON            | Enable F2/F3 hotkey behavior |
| Move hotkeys                  | Ctrl+Shift+↑↓ | Configurable                 |
| Enable drag handles           | OFF           | Phase 2 feature flag         |
## Success Criteria
A user coming from Outliner + list workflow should be able to:
1. Install the plugin with zero configuration
2. Write a document using only headings (no lists)
3. Restructure it entirely using Tab, Shift+Tab, Ctrl+Shift+↑, Ctrl+Shift+↓
4. Have the experience feel **identical** in speed and fluidity to the list-based Outliner workflow