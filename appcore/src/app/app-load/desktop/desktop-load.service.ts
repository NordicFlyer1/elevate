import { Inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Channel, IpcMessage, IpcTunnelService, RuntimeInfo } from "@elevate/shared/electron";
import { LoggerService } from "../../shared/services/logging/logger.service";
import { StravaConnectorInfoService } from "../../shared/services/strava-connector-info/strava-connector-info.service";
import { VersionsProvider } from "../../shared/services/versions/versions-provider";
import { AppLoadService } from "../app-load.service";
import { concatMap, delay, retryWhen } from "rxjs/operators";
import { of, throwError } from "rxjs";
import { DesktopBoot } from "./desktop-boot";
import { StatusCodes } from "http-status-codes";
import { StravaConnectorInfo } from "@elevate/shared/sync";
import { DesktopMigrationService } from "../../desktop/migration/desktop-migration.service";
import { DataStore } from "../../shared/data-store/data-store";
import { FileConnectorInfoService } from "../../shared/services/file-connector-info/file-connector-info.service";
import { DesktopUnauthorizedMachineIdDialogComponent } from "./desktop-unauthorized-machine-id-dialog/desktop-unauthorized-machine-id-dialog.component";
import { IPC_TUNNEL_SERVICE } from "../../desktop/ipc/ipc-tunnel-service.token";
import { DesktopUpdateService } from "../../desktop/app-update/desktop-update.service";

@Injectable()
export class DesktopLoadService extends AppLoadService {
  private static readonly ATHLETE_ACCESS_API_URL = "https://api.elevate.duckdns.org/api/athlete/access";
  private static readonly AUTH_RETRY_COUNT = 1;
  private static readonly AUTH_RETRY_DELAY = 1000;

  public runtimeInfo: RuntimeInfo;

  constructor(
    @Inject(DataStore) protected readonly dataStore: DataStore<object>,
    @Inject(VersionsProvider) private readonly versionsProvider: VersionsProvider,
    @Inject(IPC_TUNNEL_SERVICE) public readonly ipcTunnelService: IpcTunnelService,
    @Inject(HttpClient) private readonly httpClient: HttpClient,
    @Inject(StravaConnectorInfoService) private readonly stravaConnectorInfoService: StravaConnectorInfoService,
    @Inject(DesktopUpdateService) private readonly desktopUpdateService: DesktopUpdateService,
    @Inject(DesktopMigrationService) private readonly desktopMigrationService: DesktopMigrationService,
    @Inject(FileConnectorInfoService) private readonly fsConnectorInfoService: FileConnectorInfoService,
    @Inject(Router) private readonly router: Router,
    @Inject(MatDialog) private readonly dialog: MatDialog,
    @Inject(LoggerService) private readonly logger: LoggerService
  ) {
    super(dataStore);
    this.runtimeInfo = null;
  }

  public loadApp(): Promise<void> {
    return super.loadApp().then(() => {
      let hasBeenUpgradedToVersion = null;

      return this.desktopMigrationService
        .upgrade()
        .then((upgradedToVersion: string) => {
          hasBeenUpgradedToVersion = upgradedToVersion;
          return this.desktopUpdateService.handleUpdate();
        })
        .then(() => {
          return this.getRuntimeInfo()
            .then(runtimeInfo => {
              this.runtimeInfo = runtimeInfo;
              return this.desktopBoot(this.runtimeInfo);
            })
            .then(accessAuthorized => {
              if (!accessAuthorized) {
                this.dialog.open(DesktopUnauthorizedMachineIdDialogComponent, {
                  minHeight: "100%",
                  maxHeight: "100%",
                  minWidth: "100%",
                  maxWidth: "100%",
                  width: "100%",
                  height: "100%",
                  hasBackdrop: true,
                  closeOnNavigation: false,
                  disableClose: true,
                  data: this.runtimeInfo.athleteMachineId
                });

                return Promise.reject(`Access non-authorized for machine: ${this.runtimeInfo.athleteMachineId}`);
              }

              // Make sure local file connector source directory exists
              return this.fsConnectorInfoService.ensureSourceDirectoryCompliance();
            })
            .then(() => {
              return Promise.resolve(hasBeenUpgradedToVersion);
            })
            .catch(error => {
              this.logger.error(error);
              return Promise.reject(error);
            });
        })
        .then((hasBeenUpgradedToVersionVersion: string) => {
          // Check if a version has been installed. If so show release note popup
          if (hasBeenUpgradedToVersionVersion) {
            this.versionsProvider.notifyInstalledVersion(hasBeenUpgradedToVersionVersion);
          }
        });
    });
  }

  public getRuntimeInfo(): Promise<RuntimeInfo> {
    return this.ipcTunnelService.send<void, RuntimeInfo>(new IpcMessage(Channel.runtimeInfo));
  }

  public desktopBoot(runtimeInfo: RuntimeInfo, authRetry: boolean = false): Promise<boolean> {
    return Promise.all([this.versionsProvider.getPackageVersion(), this.stravaConnectorInfoService.fetch()]).then(
      result => {
        const installedVersion = result[0];
        const stravaConnectorInfo: StravaConnectorInfo = result[1] as StravaConnectorInfo;

        return new Promise<boolean>(resolve => {
          const athleteAccessBodyData = {
            athleteMachineId: this.runtimeInfo.athleteMachineId,
            version: {
              name: installedVersion
            },
            osPlatform: `${this.runtimeInfo.osPlatform.name}; ${this.runtimeInfo.osPlatform.arch}`,
            osUsername: this.runtimeInfo.osUsername,
            memorySizeGb: this.runtimeInfo.memorySizeGb,
            cpu: `${this.runtimeInfo.cpu.name}; ${this.runtimeInfo.cpu.threads}`,
            stravaAccount: stravaConnectorInfo.stravaAccount ? stravaConnectorInfo.stravaAccount : null
          };

          this.httpClient
            .post(DesktopLoadService.ATHLETE_ACCESS_API_URL, athleteAccessBodyData, {
              responseType: "text"
            })
            .pipe(
              retryWhen(errors =>
                errors.pipe(
                  concatMap((error: HttpErrorResponse, tryIndex: number) => {
                    if (error.status === StatusCodes.UNAUTHORIZED) {
                      return throwError(error);
                    }
                    return tryIndex + 1 > DesktopLoadService.AUTH_RETRY_COUNT
                      ? throwError(error)
                      : of(error).pipe(delay(DesktopLoadService.AUTH_RETRY_DELAY));
                  })
                )
              )
            )
            .subscribe(
              authCode => {
                const authenticated = this.verifyAthleteMachineId(this.runtimeInfo.athleteMachineId, authCode);

                if (authenticated) {
                  resolve(authenticated);
                } else if (authRetry) {
                  resolve(authenticated);
                } else {
                  setTimeout(() => {
                    this.logger.info("Retry machine authentication");
                    this.desktopBoot(runtimeInfo, true).then(isAuthenticated => {
                      resolve(isAuthenticated);
                    });
                  }, DesktopLoadService.AUTH_RETRY_DELAY);
                }
              },
              () => {
                resolve(false);
              }
            );
        });
      }
    );
  }

  public verifyAthleteMachineId(athleteMachineId: string, remoteAuthCode: string): boolean {
    return DesktopBoot.test(athleteMachineId, remoteAuthCode);
  }
}
