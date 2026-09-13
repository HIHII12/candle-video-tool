import {Config} from '@remotion/cli/config';

// Vertical short-form format: 1080x1920 @ 60fps, matching the reference style.
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// One frame at a time was a debugging leftover and left three of four cores
// idle. Remotion parallelises frames across processes; the cap keeps headroom
// for the OS and for a second render running alongside in batch mode.
Config.setConcurrency(Math.max(1, (require('node:os').cpus().length) - 1));

/**
 * Use a browser that is already on the machine.
 *
 * Remotion otherwise downloads its own Chrome Headless Shell from
 * remotion.media on first render. That host is not on this environment's
 * egress allowlist, so the download returns 403 and every render fails before
 * it starts — which is exactly what happened after a container restart wiped
 * the cached copy. Any Chromium of a recent enough build does the job, so the
 * config prefers one that is already installed and only falls back to the
 * download when there is none.
 */
{
  const {existsSync} = require('node:fs');
  const ungViem = [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean) as string[];
  const co = ungViem.find((p) => existsSync(p));
  if (co) Config.setBrowserExecutable(co);
}
