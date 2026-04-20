export function createDebouncer(ms: number, fn: (files: string[]) => void) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pending = new Set<string>();

    return function queue(filepath: string) {
        pending.add(filepath);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            const files = Array.from(pending);
            pending.clear();
            timer = null;
            fn(files);
        }, ms);
    };
}