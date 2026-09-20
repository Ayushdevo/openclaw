import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { expect, it } from "vitest";
import { createPluginCache, withPluginCache } from "./plugin-cache.js";
import { bindPluginInstanceModuleLoader } from "./plugin-instance-module-loader.js";
import { PluginInstance } from "./plugin-instance.js";

export function registerCapturedWorkerTests(params: {
  makeTempDir: (prefix: string) => string;
  instances: PluginInstance[];
}): void {
  it.runIf(typeof Module.registerHooks === "function" && !process.versions.bun)(
    "links the host package for Workers launched from a captured plugin",
    async () => {
      const hostRoot = params.makeTempDir("captured-worker-host-");
      const hostSdk = path.join(hostRoot, "dist", "plugin-sdk");
      fs.mkdirSync(hostSdk, { recursive: true });
      fs.writeFileSync(
        path.join(hostRoot, "package.json"),
        JSON.stringify({
          name: "openclaw",
          type: "module",
          exports: {
            "./cli-entry": "./dist/cli-entry.js",
            "./plugin-sdk/worker-fixture": "./dist/plugin-sdk/worker-fixture.js",
          },
        }),
      );
      fs.writeFileSync(path.join(hostRoot, "dist", "cli-entry.js"), "export {};");
      fs.writeFileSync(path.join(hostSdk, "worker-fixture.js"), "export const value = 42;");

      const rootDir = params.makeTempDir("captured-worker-plugin-");
      const source = path.join(rootDir, "index.mjs");
      fs.writeFileSync(
        source,
        `import { Worker } from "node:worker_threads";
         export const read = () => new Promise((resolve, reject) => {
           const worker = new Worker(new URL("./worker.mjs", import.meta.url));
           worker.once("message", resolve);
           worker.once("error", reject);
         });`,
      );
      fs.writeFileSync(
        path.join(rootDir, "worker.mjs"),
        `import { parentPort } from "node:worker_threads";
         import { value } from "openclaw/plugin-sdk/worker-fixture";
         parentPort.postMessage(value);`,
      );
      const instance = new PluginInstance("captured-worker-fixture");
      params.instances.push(instance);
      withPluginCache(createPluginCache(), () =>
        bindPluginInstanceModuleLoader({
          instance,
          origin: "global",
          source,
          rootDir,
          devSourceRoot: hostRoot,
        }),
      );
      const plugin = instance.loadModule(source) as { read(): Promise<number> };

      await expect(plugin.read()).resolves.toBe(42);
    },
  );
}
