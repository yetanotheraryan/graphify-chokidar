---
name: graphify-chokidar
description: "watch a directory and auto-rebuild the graphify knowledge graph on file changes — token-aware, cancellable, no manual re-runs"
trigger: /graphify-chokidar
---

# /graphify-chokidar

Start a file watcher that keeps a [graphify](https://github.com/yetanotheraryan/graphify) knowledge graph in sync with your codebase automatically.

- **Code changes** (`.ts`, `.py`, `.go`, …) → rebuild runs immediately, no LLM, no prompt
- **Doc/media changes** (`.md`, `.pdf`, `.png`, …) → asks you before spending tokens
- **New change mid-build** → previous build is cancelled, fresh build starts right away
- **Repeated LLM triggers while building** → collapsed into one prompt, not spammed

## Usage

```
/graphify-chokidar                         # watch current directory
/graphify-chokidar <path>                  # watch a specific path
/graphify-chokidar <path> --debounce 500   # wait 500ms after last change (default: 2000ms)
/graphify-chokidar <path> --silent         # only log errors
/graphify-chokidar <path> --once           # exit after first rebuild (CI mode)
```

## What You Must Do When Invoked

If no path was given, use `.` (current directory). Do not ask the user for a path.

### Step 1 — Ensure graphify-chokidar is installed

```bash
which graphify-chokidar 2>/dev/null || npm install -g graphify-chokidar
```

If the install fails, tell the user and stop. Do not proceed without the binary.

Also verify that `graphify` itself is on the PATH — graphify-chokidar shells out to it:

```bash
which graphify 2>/dev/null || echo "ERROR: graphify not found — install it first"
```

If graphify is missing, tell the user to install graphify before continuing.

### Step 2 — Start the watcher

Construct the command from the user's arguments and run it in a background terminal or as a background process:

```bash
graphify-chokidar PATH [--debounce MS] [--silent] [--once]
```

Replace `PATH` with the path provided (or `.`), and include any flags the user specified.

**If the user asked to run it in the background:**

```bash
graphify-chokidar PATH &
echo "Watcher PID: $!"
```

Save the PID if the user may want to stop it later.

**If the user asked to run it in the foreground** (or didn't specify), run it directly and let it stream output to the terminal.

### Step 3 — Confirm it's watching

After start, you should see output like:

```
◆ watching <path> — ignoring graphify-out/ node_modules/
◆ debounce 2000ms
```

If you see `command not found` or an immediate exit, check Step 1 again. If you see `graphify failed` with `unknown command`, verify that `graphify update <path>` works manually — graphify-chokidar calls `graphify update` internally.

---

## What the watcher does with each change

```
File saved
    │
    ▼
classifyFile(path)
    │
    ├─ ignore  →  do nothing
    │              (node_modules, .git, dist, graphify-out, __pycache__)
    │
    ├─ ast     →  cancel any in-progress build
    │              → run: graphify update <path>
    │              (no LLM, instant, safe to interrupt)
    │
    └─ llm     →  if a build is already running: skip silently
                   else: show files + token warning
                         → prompt: run graphify? [Y/n]
                         → if yes: run graphify update <path>
```

**AST files** (rebuilt without LLM):
`.ts` `.tsx` `.js` `.jsx` `.py` `.go` `.rs` `.java` `.c` `.cpp` `.cs` `.rb` `.swift` `.kt` `.scala` `.php` `.lua` `.zig` `.ex` `.exs` `.vue` `.svelte` `.dart`

**LLM files** (prompts before rebuilding):
`.md` `.mdx` `.txt` `.rst` `.adoc` `.pdf` `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg` `.mp4` `.mov` `.mp3` `.wav`

**Always ignored:**
`graphify-out/` `node_modules/` `.git/` `dist/` `__pycache__/` `.cache/`

---

## Debounce

Changes are batched. If 10 files save in quick succession, one rebuild fires — not ten.

```
save fileA  →  start 2s timer
save fileB  →  reset timer
save fileC  →  reset timer
              ... 2s of silence ...
              → rebuild([fileA, fileB, fileC])
```

Tune with `--debounce <ms>`. Lower values (e.g. `500`) make rebuilds feel more instant. Higher values (e.g. `5000`) reduce rebuilds during large refactors.

---

## Log symbols

| Symbol | Meaning |
|--------|---------|
| `◆` | Watcher started / config |
| `~` | File changed |
| `↻` | Build started |
| `↺` | Previous build cancelled, restarting |
| `✓` | Build succeeded |
| `✗` | Build failed or skipped by user |
| `⏸` | LLM rebuild skipped (build in progress) |
| `⚠` | LLM rebuild — token confirmation required |

---

## Stopping the watcher

Press `Ctrl+C` in the terminal where the watcher is running. It will print:

```
watchify stopped
```

If running in the background, kill by PID:

```bash
kill <PID>
```

---

## CI mode (`--once`)

Run once on the next file change, then exit with code `0` (success) or `1` (failure). Useful in pre-commit hooks or CI pipelines that should fail if the graph can't be rebuilt:

```bash
graphify-chokidar . --once --silent
```

---

## Troubleshooting

**`graphify failed: unknown command '.'`**
graphify-chokidar calls `graphify update <path>`. If your graphify version doesn't support `update`, upgrade it: `pip install --upgrade graphifyy`

**Builds triggering on `graphify-out/` changes**
Already ignored by default. If it's still triggering, ensure you're on the latest build — run `npm install -g graphify-chokidar` to upgrade.

**Watcher fires too often**
Increase `--debounce`. Some editors write temp files before the final save; a 1000–2000ms debounce absorbs those.

**LLM prompt appearing repeatedly**
This happens if you answer `n` and then save again. It's correct — each new change after a skip re-prompts. If you want to suppress it entirely, use `--silent` (errors only) or consider whether those files should be reclassified.
