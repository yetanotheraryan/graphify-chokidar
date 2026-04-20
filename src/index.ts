#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("graphify-chokidar")
  .description("Keeps your graphify knowledge graph fresh without burning tokens.")
  .version("0.1.0")
  .argument("[path]", "path to watch", ".")
  .option("-d, --debounce <ms>", "wait after last change before rebuilding (ms)", "2000")
  .option("-s, --silent", "only log errors", false)
  .option("--once", "run once on next change and exit (CI mode)", false)
  .action(async (path: string, options) => {
    const { startWatcher } = await import("./watcher.js");
    await startWatcher({
      path,
      debounce: parseInt(options.debounce, 10),
      silent: options.silent,
      once: options.once,
    });
  });

program.parse();