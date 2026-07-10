import { config } from "../config";
import { DirectRuntime } from "./direct";
import { LinuxDistroboxRuntime } from "./linux";
import type { RuntimeAdapter } from "./types";
import { WindowsWslRuntime } from "./windows";
import { WslNativeRuntime } from "./wsl-native";

export const runtime: RuntimeAdapter = config.directMode
  ? new DirectRuntime()
  : config.runtimeKind === "wsl"
    ? new WslNativeRuntime()
    : process.platform === "win32"
      ? new WindowsWslRuntime()
      : new LinuxDistroboxRuntime();
