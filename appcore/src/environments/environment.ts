// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

import { LoggerService } from "../app/shared/services/logging/logger.service";
import { BuildTarget } from "@elevate/shared/enums";

export const environment = {
  buildTarget: BuildTarget.EXTENSION,
  production: false,
  logLevel: LoggerService.LEVEL_DEBUG,
  minBackupVersion: "7.0.0-0.alpha",
  skipRestoreSyncedBackupCheck: false
};
