import { Inject, Injectable } from "@angular/core";
import { SyncDateTimeDao } from "../../../dao/sync/sync-date-time.dao";
import { VersionsProvider } from "../../versions/versions-provider";
import { ActivityService } from "../../activity/activity.service";
import { AthleteService } from "../../athlete/athlete.service";
import { UserSettingsService } from "../../user-settings/user-settings.service";
import { LoggerService } from "../../logging/logger.service";
import { SyncedActivityModel } from "@elevate/shared/models/sync/synced-activity.model";
import { AthleteModel } from "@elevate/shared/models/athlete/athlete.model";
import _ from "lodash";
import moment from "moment";
import { SyncService } from "../sync.service";
import { SyncState } from "../sync-state.enum";
import { ExtensionDumpModel } from "../../../models/dumps/extension-dump.model";
import { DumpModel } from "../../../models/dumps/dump.model";
import { StreamsService } from "../../streams/streams.service";
import { SyncDateTime } from "@elevate/shared/models/sync/sync-date-time.model";
import { DataStore } from "../../../data-store/data-store";
import { ExtensionDataStore } from "../../../data-store/impl/extension-data-store.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { filter } from "rxjs/operators";
import { CoreMessages } from "@elevate/shared/models";
import { ChromiumService } from "../../../../extension/chromium.service";
import { ExtensionUserSettingsService } from "../../user-settings/extension/extension-user-settings.service";

@Injectable()
export class ExtensionSyncService extends SyncService<SyncDateTime> {
  /**
   * Dump version threshold at which a "greater or equal" imported backup version is compatible with current code.
   */

  public static readonly SYNC_URL_BASE: string = "https://www.strava.com/dashboard";
  public trackedSyncTabId: number;
  public isSyncing: boolean;

  constructor(
    @Inject(VersionsProvider) public readonly versionsProvider: VersionsProvider,
    @Inject(DataStore) public readonly extensionDataStore: ExtensionDataStore<object>,
    @Inject(ActivityService) public readonly activityService: ActivityService,
    @Inject(StreamsService) public readonly streamsService: StreamsService,
    @Inject(AthleteService) public readonly athleteService: AthleteService,
    @Inject(UserSettingsService) public readonly userSettingsService: ExtensionUserSettingsService,
    @Inject(LoggerService) public readonly logger: LoggerService,
    @Inject(SyncDateTimeDao) public readonly syncDateTimeDao: SyncDateTimeDao,
    @Inject(ChromiumService) public readonly chromiumService: ChromiumService,
    @Inject(MatSnackBar) public readonly snackBar: MatSnackBar
  ) {
    super(
      versionsProvider,
      extensionDataStore,
      activityService,
      streamsService,
      athleteService,
      userSettingsService,
      logger
    );

    // Self listening syncing status
    this.isSyncing = false;
    this.isSyncing$.subscribe(isSyncing => {
      this.isSyncing = isSyncing;
    });

    // Detect if sync window has been closed
    this.chromiumService.getTabs().onRemoved.addListener(tabId => {
      if (this.isSyncing && tabId === this.trackedSyncTabId) {
        this.isSyncing$.next(false);
      }
    });

    // Listen for external sync start/done
    this.chromiumService.externalMessages$
      .pipe(
        filter(
          message => message === CoreMessages.ON_EXTERNAL_SYNC_START || message === CoreMessages.ON_EXTERNAL_SYNC_DONE
        )
      )
      .subscribe(message => {
        if (message === CoreMessages.ON_EXTERNAL_SYNC_START) {
          this.isSyncing$.next(true);
        }

        if (message === CoreMessages.ON_EXTERNAL_SYNC_DONE) {
          this.isSyncing$.next(false);
          this.chromiumService.getTabs().remove(this.trackedSyncTabId);
          window.location.reload();
        }
      });
  }

  public sync(fastSync: boolean, forceSync: boolean): Promise<void> {
    const params = "?elevateSync=true&fastSync=" + fastSync + "&forceSync=" + forceSync;

    // Create tab for sync
    const url = ExtensionSyncService.SYNC_URL_BASE + params;

    this.chromiumService.createTab(url).then(createdTab => {
      this.trackedSyncTabId = createdTab.id;

      const snackBarRef = this.snackBar.open(
        "Sync just started in a new tab. Login to Strava if necessary.",
        "View tab",
        {
          duration: 10000
        }
      );
      snackBarRef.onAction().subscribe(() => {
        this.chromiumService.getTabs().update(createdTab.id, { selected: true });
      });
    });

    return Promise.resolve();
  }

  public getSyncState(): Promise<SyncState> {
    return Promise.all([this.getSyncDateTime(), this.activityService.count()]).then((result: any[]) => {
      const syncDateTime: SyncDateTime = result[0] as SyncDateTime;
      const syncedActivitiesCount: number = result[1] as number;

      const hasSyncDateTime: boolean = syncDateTime && _.isNumber(syncDateTime.syncDateTime);
      const hasSyncedActivityModels: boolean = syncedActivitiesCount > 0;

      let syncState: SyncState;
      if (!hasSyncDateTime && !hasSyncedActivityModels) {
        syncState = SyncState.NOT_SYNCED;
      } else if (!hasSyncDateTime && hasSyncedActivityModels) {
        syncState = SyncState.PARTIALLY_SYNCED;
      } else {
        syncState = SyncState.SYNCED;
      }

      return Promise.resolve(syncState);
    });
  }

  public stop(): Promise<void> {
    throw new Error("ExtensionSyncService do not support sync stop");
  }

  public export(): Promise<{ filename: string; size: number }> {
    return this.prepareForExport().then(
      (backupModel: ExtensionDumpModel) => {
        const blob = new Blob([JSON.stringify(backupModel)], { type: "application/json; charset=utf-8" });
        const filename = moment().format("Y.M.D-H.mm") + "_v" + backupModel.pluginVersion + ".history.json";
        this.saveAs(blob, filename);
        return Promise.resolve({ filename: filename, size: blob.size });
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  public prepareForExport(): Promise<DumpModel> {
    return Promise.all([
      this.syncDateTimeDao.findOne(),
      this.activityService.fetch(),
      this.athleteService.fetch(),
      this.versionsProvider.getPackageVersion()
    ]).then((result: any[]) => {
      const syncDateTime: SyncDateTime = result[0] as SyncDateTime;
      const syncedActivityModels: SyncedActivityModel[] = result[1] as SyncedActivityModel[];
      const athleteModel: AthleteModel = result[2] as AthleteModel;
      const appVersion: string = result[3] as string;

      if (!syncDateTime || !_.isNumber(syncDateTime.syncDateTime)) {
        return Promise.reject("Cannot export. No last synchronization date found.");
      }

      const backupModel: DumpModel = {
        syncDateTime: DataStore.cleanDbObject<SyncDateTime>(syncDateTime),
        syncedActivities: DataStore.cleanDbCollection<SyncedActivityModel>(syncedActivityModels),
        athleteModel: DataStore.cleanDbObject<AthleteModel>(athleteModel),
        pluginVersion: appVersion
      };

      return Promise.resolve(backupModel);
    });
  }

  public import(importedBackupModel: ExtensionDumpModel): Promise<void> {
    if (_.isEmpty(importedBackupModel.syncedActivities)) {
      return Promise.reject(
        "Activities are not defined or empty in provided backup file. Try to perform a clean full re-sync."
      );
    }

    if (_.isEmpty(importedBackupModel.pluginVersion)) {
      return Promise.reject(
        "Plugin version is not defined in provided backup file. Try to perform a clean full re-sync."
      );
    }

    return this.isDumpCompatible(importedBackupModel.pluginVersion, this.getCompatibleBackupVersionThreshold())
      .then(() => {
        return this.clearSyncedActivities();
      })
      .then(() => {
        return this.athleteService.clear(true);
      })
      .then(() => {
        let promiseImportDatedAthleteSettings;
        // If no dated athlete settings provided in backup then reset dated athlete settings
        if (_.isEmpty(importedBackupModel.athleteModel)) {
          promiseImportDatedAthleteSettings = this.athleteService.resetSettings();
        } else {
          promiseImportDatedAthleteSettings = this.athleteService.validateInsert(importedBackupModel.athleteModel);
        }

        return Promise.all([
          this.updateSyncDateTime(importedBackupModel.syncDateTime),
          this.activityService.insertMany(importedBackupModel.syncedActivities, true),
          promiseImportDatedAthleteSettings,
          this.userSettingsService.clearLocalStorageOnNextLoad()
        ]);
      })
      .then(() => {
        return Promise.resolve();
      });
  }

  public getSyncDateTime(): Promise<SyncDateTime> {
    return this.syncDateTimeDao.findOne();
  }

  public updateSyncDateTime(syncDateTime: SyncDateTime): Promise<SyncDateTime> {
    return this.syncDateTimeDao.put(syncDateTime, true);
  }

  public clearSyncTime(): Promise<void> {
    return this.syncDateTimeDao.clear(true);
  }

  public redirect(): void {
    this.sync(false, false);
  }
}
