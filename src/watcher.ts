import chokidar from "chokidar";
import { createDebouncer } from "./debouncer.js";
import { describeRebuild, classifyFile } from "./classifier.js";
import { runGraphify } from "./runner.js";
import { confirm } from "./prompt.js";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const BOLD = "\x1b[1m";

function log(symbol: string, color: string, ...args: string[]) {
  console.log(`${color}${symbol}${RESET}`, ...args);
}

function shortPath(p: string, cwd: string) {
  return p.startsWith(cwd) ? p.slice(cwd.length + 1) : p;
}

export interface WatchOptions {
  debounce: number;
  silent: boolean;
  once: boolean;
  path: string;
}

export async function startWatcher(opts: WatchOptions) {
  const cwd = process.cwd();
  let currentController: AbortController | null = null;

  const handleChanges = async (files: string[]) => {
    const { type, astFiles, llmFiles } = describeRebuild(files);

    if (type === "ignore") return;

    if (type === "llm") {
      if (currentController) {
        log("⏸", YELLOW, `${DIM}LLM rebuild skipped — build already in progress${RESET}`);
        return;
      }
    } else {
      if (currentController) {
        log("↺", YELLOW, `${DIM}cancelling previous build — new changes detected${RESET}`);
        currentController.abort();
        currentController = null;
      }
    }

    if (!opts.silent) {
      for (const f of [...astFiles, ...llmFiles]) {
        log("~", MAGENTA, `${DIM}changed${RESET} ${MAGENTA}${shortPath(f, cwd)}${RESET}`);
      }
    }

    if (type === "llm") {
      const llmList = llmFiles
        .map((f) => `  ${YELLOW}${shortPath(f, cwd)}${RESET}`)
        .join("\n");
      console.log(
        `\n${YELLOW}⚠${RESET}  ${BOLD}LLM rebuild triggered${RESET} — these files will consume tokens:\n${llmList}`
      );
      const ok = await confirm(`${DIM}  run graphify? [Y/n] ${RESET}`);
      if (!ok) {
        log("✗", RED, `${DIM}skipped by user${RESET}`);
        return;
      }
    }

    const controller = new AbortController();
    currentController = controller;
    log("↻", CYAN, `${DIM}running graphify ${opts.path}${RESET}`);

    const result = await runGraphify(opts.path, controller.signal);

    if (controller.signal.aborted) return;
    currentController = null;

    if (result.cancelled) return;

    if (result.success) {
      log(
        "✓",
        GREEN,
        `${DIM}graph rebuilt in${RESET} ${GREEN}${(result.durationMs / 1000).toFixed(1)}s${RESET}`
      );
    } else {
      log("✗", RED, `${DIM}graphify failed${RESET}`);
      if (!opts.silent) console.log(DIM + result.output + RESET);
    }

    if (opts.once) process.exit(result.success ? 0 : 1);
  };

  const queue = createDebouncer(opts.debounce, handleChanges);

  const watcher = chokidar.watch(opts.path, {
    ignored: [
      /(^|[/\\])\../,
      /graphify-out/,
      /node_modules/,
      /__pycache__/,
      /\.git/,
      /dist\//,
    ],
    persistent: true,
    ignoreInitial: true,
  });

  if (!opts.silent) {
    log("◆", CYAN, `watching ${CYAN}${opts.path}${RESET} ${DIM}— ignoring graphify-out/ node_modules/${RESET}`);
    log("◆", CYAN, `debounce ${CYAN}${opts.debounce}ms${RESET}`);
    console.log("");
  }

  watcher.on("change", (p) => { if (classifyFile(p) !== "ignore") queue(p); });
  watcher.on("add", (p) => { if (classifyFile(p) !== "ignore") queue(p); });
  watcher.on("unlink", (p) => { if (classifyFile(p) !== "ignore") queue(p); });

  process.on("SIGINT", () => {
    console.log(`\n${DIM}watchify stopped${RESET}`);
    watcher.close();
    process.exit(0);
  });
}