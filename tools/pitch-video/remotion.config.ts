import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
// Pobrany przez Remotion Chrome Headless Shell pada na tym Macu, więc renderuje systemowy Chrome.
Config.setBrowserExecutable("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
Config.setChromeMode("chrome-for-testing");
