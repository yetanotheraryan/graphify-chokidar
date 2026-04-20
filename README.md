# graphify-chokidar

Keep your [graphify](https://github.com/yetanotheraryan/graphify) knowledge graph fresh — automatically, without burning tokens.

```
◆ watching . — ignoring graphify-out/ node_modules/
◆ debounce 2000ms

~ changed src/auth/session.ts
↻ running graphify .
✓ graph rebuilt in 1.4s

~ changed docs/architecture.md
⚠  LLM rebuild triggered — these files will consume tokens:
  docs/architecture.md
  run graphify? [Y/n]
```

---

## Why

`graphify` builds a knowledge graph from your codebase. But re-running it manually after every change is friction. `graphify-chokidar` watches your project and rebuilds the graph on save — and it's smart about when to ask before spending tokens.

**Code change** (`.ts`, `.py`, `.go`, …) → rebuilds instantly, no prompt, no LLM call.  
**Doc/media change** (`.md`, `.pdf`, `.png`, …) → asks first, then rebuilds with LLM.

If a new change arrives mid-build, the previous build is cancelled and a fresh one starts immediately — but repeated LLM rebuilds are collapsed so you never get spammed with confirmation prompts.

---

## Install

```bash
npm install -g graphify-chokidar
```

Requires `graphify` to be installed and on your `$PATH`.

---

## Usage

```bash
# Watch current directory
graphify-chokidar

# Watch a specific path
graphify-chokidar ./src

# Custom debounce (wait 500ms after last change)
graphify-chokidar --debounce 500

# Suppress all output except errors
graphify-chokidar --silent

# Run once on next change, then exit (useful in CI)
graphify-chokidar --once
```

### All options

| Flag | Default | Description |
|---|---|---|
| `[path]` | `.` | Directory to watch |
| `-d, --debounce <ms>` | `2000` | Wait after last change before rebuilding |
| `-s, --silent` | `false` | Only log errors |
| `--once` | `false` | Exit after the first rebuild (CI mode) |

---

## How it works

```
File change detected
      │
      ▼
  classifyFile()
      │
      ├─ ignore  →  do nothing
      │
      ├─ ast     →  cancel any running build → run graphify update <path>
      │              (no LLM, instant, safe to interrupt)
      │
      └─ llm     →  if build running: skip
                    else: prompt → run graphify update <path>
```

**AST files** (code): `.ts` `.tsx` `.js` `.jsx` `.py` `.go` `.rs` `.java` `.c` `.cpp` `.cs` `.rb` `.swift` `.kt` `.scala` `.php` `.lua` `.zig` `.ex` `.vue` `.svelte` `.dart`

**LLM files** (docs/media): `.md` `.mdx` `.txt` `.rst` `.pdf` `.png` `.jpg` `.svg` `.mp4` `.mp3` and more

**Ignored always**: `graphify-out/` `node_modules/` `.git/` `dist/` `__pycache__/`

---

## Debouncing

Changes are batched. If you save 10 files in quick succession, one rebuild fires — not ten.

```
save fileA  →  start 2s timer
save fileB  →  reset timer
save fileC  →  reset timer
              ... 2s of silence ...
              → rebuild([fileA, fileB, fileC])
```

Adjust with `--debounce <ms>` to match how fast your editor flushes writes.

---

## Agent skill

`graphify-chokidar` ships with a `SKILL.md` that lets AI agents (Claude, Codex, etc.) invoke the watcher as a slash command.

**Install for Claude Code:**

```bash
# Copy SKILL.md into Claude's skills directory
mkdir -p ~/.claude/skills/graphify-chokidar
cp node_modules/graphify-chokidar/SKILL.md ~/.claude/skills/graphify-chokidar/SKILL.md
```

Then in any Claude Code session:

```
/graphify-chokidar ./src
```

The agent will start the watcher, explain the log symbols, and handle start/stop for you.

---

## Build from source

```bash
git clone https://github.com/yetanotheraryan/graphify-chokidar
cd graphify-chokidar
npm install
npm run build        # outputs to dist/
```

---

## License

MIT
