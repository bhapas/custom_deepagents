export function logMem(label: string) {
  try {
    const m = process.memoryUsage();
    // Report key metrics in MB
    const fmt = (b: number) => (b / (1024 * 1024)).toFixed(1) + "MB";
    // eslint-disable-next-line no-console
    console.log(
      `[mem] ${label} | rss=${fmt(m.rss)} heapUsed=${fmt(m.heapUsed)} heapTotal=${fmt(
        m.heapTotal
      )} ext=${fmt(m.external)}`
    );
  } catch {
    // ignore
  }
}


