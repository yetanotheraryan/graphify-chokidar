export type RebuildType = "ast" | "llm" | "ignore";

const AST_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs",
  ".java", ".c", ".cpp", ".cs", ".rb", ".swift", ".kt",
  ".scala", ".php", ".lua", ".zig", ".ex", ".exs",
  ".vue", ".svelte", ".dart"
]);

const LLM_EXTENSIONS = new Set([
  ".md", ".mdx", ".txt", ".rst", ".adoc",
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".svg", ".mp4", ".mov", ".mp3", ".wav"
]);

const IGNORE_PATTERNS = [
  "graphify-out", "node_modules", ".git", "dist", "__pycache__", ".cache"
];

export function classifyFile(filepath: string): RebuildType {
  for (const pattern of IGNORE_PATTERNS) {
    if (filepath.includes(pattern)) return "ignore";
  }
  const ext = filepath.slice(filepath.lastIndexOf(".")).toLowerCase();
  if (AST_EXTENSIONS.has(ext)) return "ast";
  if (LLM_EXTENSIONS.has(ext)) return "llm";
  return "ignore";
}

export function describeRebuild(files: string[]): {
  type: RebuildType;
  astFiles: string[];
  llmFiles: string[];
} {
  const astFiles: string[] = [];
  const llmFiles: string[] = [];

  for (const f of files) {
    const t = classifyFile(f);
    if (t === "ast") astFiles.push(f);
    if (t === "llm") llmFiles.push(f);
  }

  const type: RebuildType =
    llmFiles.length > 0 ? "llm" : astFiles.length > 0 ? "ast" : "ignore";

  return { type, astFiles, llmFiles };
}