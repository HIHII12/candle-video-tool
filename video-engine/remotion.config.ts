import {Config} from '@remotion/cli/config';

// Vertical short-form format: 1080x1920 @ 60fps, matching the reference style.
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// One frame at a time was a debugging leftover and left three of four cores
// idle. Remotion parallelises frames across processes; the cap keeps headroom
// for the OS and for a second render running alongside in batch mode.
Config.setConcurrency(Math.max(1, (require('node:os').cpus().length) - 1));
