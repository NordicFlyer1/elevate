import moment from "moment";
import _ from "lodash";
import { TestBed } from "@angular/core/testing";
import { FitnessService } from "./fitness.service";
import { ActivityService } from "../../../shared/services/activity/activity.service";
import { FitnessPreparedActivityModel } from "../models/fitness-prepared-activity.model";
import { AthleteSettingsModel, AthleteSnapshotModel, Gender, SyncedActivityModel } from "@elevate/shared/models";
import { HeartRateImpulseMode } from "../enums/heart-rate-impulse-mode.enum";
import { DayFitnessTrendModel } from "../models/day-fitness-trend.model";
import { DayStressModel } from "../models/day-stress.model";
import { AppError } from "../../../shared/models/app-error.model";
import { FitnessTrendConfigModel } from "../models/fitness-trend-config.model";
import { FakeSyncedActivityHelper } from "../helpers/fake-synced-activity.helper";
import { CoreModule } from "../../../core/core.module";
import { SharedModule } from "../../../shared/shared.module";
import { FitnessTrendModule } from "../../fitness-trend.module";
import { ElevateSport } from "@elevate/shared/enums";
import { DataStore } from "../../../shared/data-store/data-store";
import { TestingDataStore } from "../../../shared/data-store/testing-datastore.service";
import { TargetModule } from "../../../shared/modules/target/desktop-target.module";
import { TargetBootModule } from "../../../boot/desktop-boot.module";
import { IPC_TUNNEL_SERVICE } from "../../../desktop/ipc/ipc-tunnel-service.token";
import { IpcRendererTunnelServiceMock } from "../../../desktop/ipc/ipc-renderer-tunnel-service.mock";

describe("FitnessService", () => {
  const todayDate = "2015-12-01 12:00";
  const momentDatePattern = "YYYY-MM-DD hh:mm";

  let _ATHLETE_MODEL_SNAPSHOT_: AthleteSnapshotModel;
  let fitnessTrendConfigModel: FitnessTrendConfigModel;
  let powerMeterEnable;
  let swimEnable;

  let fitnessService: FitnessService = null;
  let activityService: ActivityService = null;

  let getTodayMomentSpy = null;

  beforeEach(done => {
    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetBootModule, TargetModule, FitnessTrendModule],
      providers: [
        { provide: DataStore, useClass: TestingDataStore },
        { provide: IPC_TUNNEL_SERVICE, useClass: IpcRendererTunnelServiceMock }
      ]
    });

    // Define default athlete model
    _ATHLETE_MODEL_SNAPSHOT_ = new AthleteSnapshotModel(
      Gender.MEN,
      new AthleteSettingsModel(
        190,
        60,
        {
          default: 163,
          cycling: null,
          running: null
        },
        150,
        300,
        31,
        70
      )
    );

    // Retrieve injected service
    fitnessService = TestBed.inject(FitnessService);
    activityService = TestBed.inject(ActivityService);

    fitnessTrendConfigModel = {
      heartRateImpulseMode: HeartRateImpulseMode.HRSS,
      initializedFitnessTrendModel: {
        atl: null,
        ctl: null
      },
      allowEstimatedPowerStressScore: false,
      allowEstimatedRunningStressScore: false,
      ignoreBeforeDate: null,
      ignoreActivityNamePatterns: null
    };

    // Enable PSS and SSS by default
    powerMeterEnable = true;
    swimEnable = true;

    getTodayMomentSpy = spyOn(fitnessService, "getTodayMoment");
    getTodayMomentSpy.and.returnValue(moment(todayDate, momentDatePattern));

    done();
  });

  it("should be created", done => {
    expect(fitnessService).toBeTruthy();
    done();
  });

  describe("prepare fitness activities", () => {
    it("should prepare fitness activities (only heart rate based activities) w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=TRIMP", done => {
      // Given
      const expectedFitnessPreparedActivitiesLength = 3;
      const expectedHeartRateStressScoredActivitiesLength = 0;
      const expectedTrimpScoredActivitiesLength = 3;
      const expectedPowerScoredActivitiesLength = 0;
      const expectedSwimScoredActivitiesLength = 0;

      fitnessTrendConfigModel.heartRateImpulseMode = HeartRateImpulseMode.TRIMP;
      powerMeterEnable = false;
      swimEnable = false;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 01",
          ElevateSport.Ride,
          "2018-01-01",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 02",
          ElevateSport.Ride,
          "2018-01-15",
          180,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 03",
          ElevateSport.Ride,
          "2018-01-30",
          135,
          null,
          false
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const hearRateStressScoredActivities = _.filter(result, "heartRateStressScore");
          const trimpScoredActivities = _.filter(result, "trainingImpulseScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(hearRateStressScoredActivities.length).toEqual(expectedHeartRateStressScoredActivitiesLength);
          expect(trimpScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities (only power based activities) w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=HRSS", done => {
      // Given
      const expectedFitnessPreparedActivitiesLength = 3;
      const expectedTrimpScoredActivitiesLength = 0;
      const expectedPowerScoredActivitiesLength = 3;
      const expectedSwimScoredActivitiesLength = 0;

      swimEnable = false;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 01",
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 02",
          ElevateSport.Ride,
          "2018-01-15",
          null,
          275,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 03",
          ElevateSport.Ride,
          "2018-01-30",
          null,
          190,
          true
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const trimpScoredActivities = _.filter(result, "trainingImpulseScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(trimpScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=HRSS & Est.PSS=ON & Est.RSS=ON", done => {
      // Given
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = true;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = true;
      const skipActivityTypes = null;
      const expectedFitnessPreparedActivitiesLength = 9;
      const expectedTrimpScoredActivitiesLength = 3;
      const expectedPowerScoredActivitiesLength = 3;
      const expectedRunningScoredActivitiesLength = 5;
      const expectedSwimScoredActivitiesLength = 1;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // HR Scored + Est PSS Scored
          ElevateSport.Ride,
          "2018-01-15",
          190,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-02",
          175,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-03",
          182,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          8,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          9,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor VirtualRun 1", // RSS Scored
          ElevateSport.VirtualRun,
          "2018-02-10",
          null,
          null,
          false,
          300
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivityTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const heartRateStressScoredActivities = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const runningScoredActivities = _.filter(result, "runningStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(heartRateStressScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(runningScoredActivities.length).toEqual(expectedRunningScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=HRSS & Est.PSS=OFF & Est.RSS=OFF", done => {
      // Given
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = false;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = false;
      const expectedFitnessPreparedActivitiesLength = 8;
      const expectedTrimpScoredActivitiesLength = 3;
      const expectedPowerScoredActivitiesLength = 1;
      const expectedRunningScoredActivitiesLength = 0;
      const expectedSwimScoredActivitiesLength = 1;
      const skipActivityTypes = null;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // HR Scored
          ElevateSport.Ride,
          "2018-01-15",
          190,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored
          ElevateSport.Run,
          "2018-02-02",
          175,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored
          ElevateSport.Run,
          "2018-02-03",
          182,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          8,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivityTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const heartRateStressScoredActivities = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const runningScoredActivities = _.filter(result, "runningStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(heartRateStressScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(runningScoredActivities.length).toEqual(expectedRunningScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=ON & CONFIG_HR_MODE=HRSS & Est.PSS=ON & Est.RSS=ON", done => {
      // Given
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = true;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = true;
      const expectedFitnessPreparedActivitiesLength = 8;
      const expectedTrimpScoredActivitiesLength = 3;
      const expectedPowerScoredActivitiesLength = 0;
      const expectedRunningScoredActivitiesLength = 4;
      const expectedSwimScoredActivitiesLength = 1;
      const skipActivityTypes = null;
      powerMeterEnable = false;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // HR Scored
          ElevateSport.Ride,
          "2018-01-15",
          190,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-02",
          175,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-03",
          182,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          8,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivityTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const heartRateStressScoredActivities = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const runningScoredActivities = _.filter(result, "runningStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(heartRateStressScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(runningScoredActivities.length).toEqual(expectedRunningScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=ON & CONFIG_HR_MODE=HRSS & Est.PSS=OFF & Est.RSS=OFF", done => {
      // Given
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = false;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = false;
      const expectedFitnessPreparedActivitiesLength = 8;
      const expectedTrimpScoredActivitiesLength = 3;
      const expectedPowerScoredActivitiesLength = 0;
      const expectedRunningScoredActivitiesLength = 0;
      const expectedSwimScoredActivitiesLength = 1;
      const skipActivityTypes = null;
      powerMeterEnable = false;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // HR Scored
          ElevateSport.Ride,
          "2018-01-15",
          190,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-02",
          175,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-03",
          182,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          8,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivityTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const heartRateStressScoredActivities = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const runningScoredActivities = _.filter(result, "runningStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(heartRateStressScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(runningScoredActivities.length).toEqual(expectedRunningScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=HRSS & Est.PSS=ON & Est.RSS=ON", done => {
      // Given
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = true;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = true;
      const expectedFitnessPreparedActivitiesLength = 8;
      const expectedTrimpScoredActivitiesLength = 3;
      const expectedPowerScoredActivitiesLength = 0;
      const expectedRunningScoredActivitiesLength = 4;
      const expectedSwimScoredActivitiesLength = 0;
      const skipActivityTypes = null;
      powerMeterEnable = false;
      swimEnable = false;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // HR Scored + Est PSS Scored
          ElevateSport.Ride,
          "2018-01-15",
          190,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-02",
          175,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-03",
          182,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          8,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivityTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const heartRateStressScoredActivities = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const runningScoredActivities = _.filter(result, "runningStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(heartRateStressScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(runningScoredActivities.length).toEqual(expectedRunningScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=HRSS & Est.PSS=OFF & Est.RSS=OFF", done => {
      // Given
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = false;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = false;
      const expectedFitnessPreparedActivitiesLength = 4;
      const expectedTrimpScoredActivitiesLength = 0;
      const expectedPowerScoredActivitiesLength = 0;
      const expectedRunningScoredActivitiesLength = 0;
      const expectedSwimScoredActivitiesLength = 0;
      const skipActivityTypes = null;
      powerMeterEnable = false;
      swimEnable = false;

      const syncedActivityModels: SyncedActivityModel[] = [];

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          8,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivityTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const heartRateStressScoredActivities = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const runningScoredActivities = _.filter(result, "runningStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(heartRateStressScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(runningScoredActivities.length).toEqual(expectedRunningScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities (only power based activities) w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=HRSS", done => {
      // Given
      const expectedCount = 3;
      powerMeterEnable = false;
      swimEnable = false;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 01",
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 02",
          ElevateSport.Ride,
          "2018-01-15",
          null,
          275,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 03",
          ElevateSport.Ride,
          "2018-01-30",
          null,
          190,
          true
        )
      );

      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(syncedActivityModels));

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedCount);
          done();
        },
        (error: AppError) => {
          expect(error).toBeNull();
          done();
        }
      );
    });

    it("should prepare fitness WITHOUT HR/POWERED/SWIM activities w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=HRSS", done => {
      // Given
      const expectedCount = 3;
      powerMeterEnable = false;
      swimEnable = false;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 01",
          ElevateSport.Ride,
          "2018-01-01",
          null,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 02",
          ElevateSport.Ride,
          "2018-01-15",
          null,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 03",
          ElevateSport.Ride,
          "2018-01-30",
          null,
          null,
          false
        )
      );

      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(syncedActivityModels));

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedCount);
          done();
        },
        (error: AppError) => {
          expect(error).toBeNull();
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=HRSS & Est.PSS=OFF & Est.RSS=OFF", done => {
      // Given
      const skipActivityTypes = null;
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = false;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = false;
      powerMeterEnable = false;
      swimEnable = false;
      const expectedCount = 5;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(syncedActivityModels));

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivityTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedCount);
          done();
        },
        (error: AppError) => {
          expect(error).toBeNull();
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=TRIMP & Est.PSS=ON & Est.RSS=ON", done => {
      // Given
      fitnessTrendConfigModel.heartRateImpulseMode = HeartRateImpulseMode.TRIMP;
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = true;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = true;
      powerMeterEnable = true;
      swimEnable = true;

      const expectedCount = 6;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // Trimp Scored
          ElevateSport.Ride,
          "2018-02-11",
          165,
          150,
          false
        )
      );

      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(syncedActivityModels));

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedCount);

          let activity: FitnessPreparedActivityModel = _.find(result, { id: 1 });
          expect(activity).not.toBeNull();
          expect(activity.powerStressScore).toBeUndefined();

          activity = _.find(result, { id: 2 });
          expect(activity).not.toBeNull();
          expect(activity.powerStressScore).toBeUndefined();

          activity = _.find(result, { id: 3 });
          expect(activity).not.toBeNull();
          expect(activity.runningStressScore).toBeUndefined();

          activity = _.find(result, { id: 4 });
          expect(activity).not.toBeNull();
          expect(activity.runningStressScore).toBeUndefined();

          activity = _.find(result, { id: 5 });
          expect(activity).not.toBeNull();
          expect(activity.swimStressScore).toBeUndefined();

          activity = _.find(result, { id: 6 });
          expect(activity).not.toBeNull();
          expect(activity.heartRateStressScore).toBeUndefined();
          expect(activity.powerStressScore).toBeUndefined();
          expect(_.isNumber(activity.trainingImpulseScore)).toBeTruthy();

          done();
        },
        (error: AppError) => {
          expect(error).toBeNull();
          done();
        }
      );

      done();
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=TRIMP & Est.PSS=ON & Est.RSS=ON", done => {
      // Given
      fitnessTrendConfigModel.heartRateImpulseMode = HeartRateImpulseMode.TRIMP;
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = true;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = true;
      powerMeterEnable = true;
      swimEnable = true;

      const expectedCount = 6;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // RSS Scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // Trimp Scored
          ElevateSport.Ride,
          "2018-02-11",
          165,
          150,
          false
        )
      );

      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(syncedActivityModels));

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedCount);

          let activity: FitnessPreparedActivityModel = _.find(result, { id: 1 });
          expect(activity).not.toBeNull();
          expect(activity.powerStressScore).toBeUndefined();

          activity = _.find(result, { id: 2 });
          expect(activity).not.toBeNull();
          expect(activity.powerStressScore).toBeUndefined();

          activity = _.find(result, { id: 3 });
          expect(activity).not.toBeNull();
          expect(activity.runningStressScore).toBeUndefined();

          activity = _.find(result, { id: 4 });
          expect(activity).not.toBeNull();
          expect(activity.runningStressScore).toBeUndefined();

          activity = _.find(result, { id: 5 });
          expect(activity).not.toBeNull();
          expect(activity.swimStressScore).toBeUndefined();

          activity = _.find(result, { id: 6 });
          expect(activity).not.toBeNull();
          expect(activity.heartRateStressScore).toBeUndefined();
          expect(activity.powerStressScore).toBeUndefined();
          expect(_.isNumber(activity.trainingImpulseScore)).toBeTruthy();

          done();
        },
        (error: AppError) => {
          expect(error).toBeNull();
          done();
        }
      );

      done();
    });

    it("should prepare fitness activities (only power based activities) w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=HRSS w/ ALL activity.athleteSettings.cyclingFtp=null", done => {
      // Given
      const expectedFitnessPreparedActivitiesLength = 3;
      const expectedHeartRateStressScoredActivitiesLength = 0;
      const expectedPowerScoredActivitiesLength = 0;
      const expectedSwimScoredActivitiesLength = 0;

      _ATHLETE_MODEL_SNAPSHOT_.athleteSettings.cyclingFtp = null;

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 01",
          ElevateSport.Ride,
          "2018-01-01",
          null,
          250,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 02",
          ElevateSport.Ride,
          "2018-01-15",
          null,
          275,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperPoweredRide 03",
          ElevateSport.Ride,
          "2018-01-30",
          null,
          190,
          true
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const hrssScoredActivitiesLength = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(hrssScoredActivitiesLength.length).toEqual(expectedHeartRateStressScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=TRIMP & Est.PSS=ON & Est.RSS=ON w/ athleteModels.(cyclingFtp|swimFtp|runningFtp)=(number|null)", done => {
      // Given
      const expectedFitnessPreparedActivitiesLength = 10;
      const expectedHeartRateStressScoredActivitiesLength = 1;
      const expectedPowerScoredActivitiesLength = 3;
      const expectedSwimScoredActivitiesLength = 1;
      const expectedRunningStressScoredActivitiesLength = 1;

      fitnessTrendConfigModel.allowEstimatedPowerStressScore = true;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = true;

      const syncedActivityModels: SyncedActivityModel[] = [];

      // Add activity: SuperPoweredRide not having cyclingFtp on his athleteSnapshot
      const syncedActivityModel01 = FakeSyncedActivityHelper.create(
        1,
        _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
        "SuperPoweredRide 01",
        ElevateSport.Ride,
        "2018-01-01",
        null,
        250,
        true
      );
      syncedActivityModel01.athleteSnapshot.athleteSettings.cyclingFtp = null;
      syncedActivityModels.push(syncedActivityModel01);

      // Add activity
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "SuperPoweredRide 02",
          ElevateSport.Ride,
          "2018-01-15",
          null,
          275,
          true
        )
      );

      // Add activity
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "SuperPoweredRide 03",
          ElevateSport.Ride,
          "2018-01-30",
          null,
          190,
          true
        )
      );

      // Add activity
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "Swimming 01", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      // Add activity: Swimming 02 not having swimFtp on his athleteSnapshot
      const syncedActivityModel05 = FakeSyncedActivityHelper.create(
        5,
        _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
        "Swimming 02", // SSS Scored
        ElevateSport.Swim,
        "2018-02-10",
        null,
        null,
        false,
        419
      );
      syncedActivityModel05.athleteSnapshot.athleteSettings.swimFtp = null;
      syncedActivityModels.push(syncedActivityModel05);

      // Add activity:
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "SuperHeartRateRun 01", // HRSS Scored
          ElevateSport.Run,
          "2018-02-11",
          185,
          null,
          false
        )
      );

      // Add activity (w/ Est Stress Score):
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "No sensor Run 1", // Est RSS scored
          ElevateSport.Run,
          "2018-02-16",
          null, // => NO HRSS
          null,
          false,
          300
        )
      ); // => RSS: 100 (priority)

      // Add activity (w/ Est Stress Score): No sensor Run 2 not having runningFtp on his athleteSnapshot
      const syncedActivityModel08 = FakeSyncedActivityHelper.create(
        8,
        _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
        "No sensor Run 2", // Est RSS scored
        ElevateSport.Run,
        "2018-02-17",
        null, // => NO HRSS
        null,
        false,
        300
      ); // => RSS: 100 (priority)
      syncedActivityModel08.athleteSnapshot.athleteSettings.runningFtp = null;
      syncedActivityModels.push(syncedActivityModel08);

      // Add activity (w/ Est Stress Score)
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          9,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "SuperPoweredRide Est 01", // Est PSS scored
          ElevateSport.Ride,
          "2018-03-01",
          null,
          250,
          false
        )
      );

      // Add activity (w/ Est Stress Score): SuperPoweredRide Est 02 not having runningFtp on his athleteSnapshot
      const syncedActivityModel010 = FakeSyncedActivityHelper.create(
        10,
        _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
        "SuperPoweredRide Est 02", // Est PSS scored
        ElevateSport.Ride,
        "2018-03-01",
        null,
        250,
        false
      );
      syncedActivityModel010.athleteSnapshot.athleteSettings.cyclingFtp = null;
      syncedActivityModels.push(syncedActivityModel010);

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const hrssScoredActivitiesLength = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const swimScored = _.filter(result, "swimStressScore");
          const runningStressScored = _.filter(result, "runningStressScore");

          expect(hrssScoredActivitiesLength.length).toEqual(expectedHeartRateStressScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);
          expect(runningStressScored.length).toEqual(expectedRunningStressScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should prepare fitness activities w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=TRIMP & Est.PSS=OFF & Est.RSS=OFF w/ athleteModels.(cyclingFtp|swimFtp|runningFtp)=(number|null)", done => {
      // Given
      const expectedFitnessPreparedActivitiesLength = 10;
      const expectedHeartRateStressScoredActivitiesLength = 1;
      const expectedPowerScoredActivitiesLength = 2;
      const expectedSwimScoredActivitiesLength = 1;
      const expectedRunningStressScoredActivitiesLength = 0;

      fitnessTrendConfigModel.allowEstimatedPowerStressScore = false;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = false;

      const syncedActivityModels: SyncedActivityModel[] = [];

      // Add activity: SuperPoweredRide not having cyclingFtp on his athleteSnapshot
      const syncedActivityModel01 = FakeSyncedActivityHelper.create(
        1,
        _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
        "SuperPoweredRide 01",
        ElevateSport.Ride,
        "2018-01-01",
        null,
        250,
        true
      );
      syncedActivityModel01.athleteSnapshot.athleteSettings.cyclingFtp = null;
      syncedActivityModels.push(syncedActivityModel01);

      // Add activity
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "SuperPoweredRide 02",
          ElevateSport.Ride,
          "2018-01-15",
          null,
          275,
          true
        )
      );

      // Add activity
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "SuperPoweredRide 03",
          ElevateSport.Ride,
          "2018-01-30",
          null,
          190,
          true
        )
      );

      // Add activity
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "Swimming 01", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      // Add activity: Swimming 02 not having swimFtp on his athleteSnapshot
      const syncedActivityModel05 = FakeSyncedActivityHelper.create(
        5,
        _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
        "Swimming 02", // SSS Scored
        ElevateSport.Swim,
        "2018-02-10",
        null,
        null,
        false,
        419
      );
      syncedActivityModel05.athleteSnapshot.athleteSettings.swimFtp = null;
      syncedActivityModels.push(syncedActivityModel05);

      // Add activity:
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "SuperHeartRateRun 01", // HRSS Scored
          ElevateSport.Run,
          "2018-02-11",
          185,
          null,
          false
        )
      );

      // Add activity (w/ Est Stress Score):
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "No sensor Run 1", // Est RSS scored
          ElevateSport.Run,
          "2018-02-16",
          null, // => NO HRSS
          null,
          false,
          300
        )
      ); // => RSS: 100 (priority)

      // Add activity (w/ Est Stress Score): No sensor Run 2 not having runningFtp on his athleteSnapshot
      const syncedActivityModel08 = FakeSyncedActivityHelper.create(
        8,
        _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
        "No sensor Run 2", // Est RSS scored
        ElevateSport.Run,
        "2018-02-17",
        null, // => NO HRSS
        null,
        false,
        300
      ); // => RSS: 100 (priority)
      syncedActivityModel08.athleteSnapshot.athleteSettings.runningFtp = null;
      syncedActivityModels.push(syncedActivityModel08);

      // Add activity (w/ Est Stress Score)
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          9,
          _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
          "SuperPoweredRide Est 01",
          ElevateSport.Ride,
          "2018-03-01",
          null,
          250,
          false
        )
      );

      // Add activity (w/ Est Stress Score): SuperPoweredRide Est 02 not having runningFtp on his athleteSnapshot
      const syncedActivityModel10 = FakeSyncedActivityHelper.create(
        10,
        _.cloneDeep(_ATHLETE_MODEL_SNAPSHOT_),
        "SuperPoweredRide Est 02",
        ElevateSport.Ride,
        "2018-03-01",
        null,
        250,
        false
      );
      syncedActivityModel10.athleteSnapshot.athleteSettings.cyclingFtp = null;
      syncedActivityModels.push(syncedActivityModel10);

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const hrssScoredActivitiesLength = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const swimScored = _.filter(result, "swimStressScore");
          const runningStressScored = _.filter(result, "runningStressScore");

          expect(hrssScoredActivitiesLength.length).toEqual(expectedHeartRateStressScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);
          expect(runningStressScored.length).toEqual(expectedRunningStressScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should skip activities types 'Run' & 'EBikeRide' on prepare fitness w/ TOGGLE_POWER_METER=OFF & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=TRIMP", done => {
      // Given
      const expectedFitnessPreparedActivitiesLength = 2;
      const expectedTrimpScoredActivitiesLength = 2;
      const expectedPowerScoredActivitiesLength = 0;
      const expectedSwimScoredActivitiesLength = 0;

      fitnessTrendConfigModel.heartRateImpulseMode = HeartRateImpulseMode.TRIMP;
      powerMeterEnable = false;
      swimEnable = false;

      const skipActivitiesTypes: string[] = [ElevateSport.Run, "EBikeRide"];

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          151,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 01",
          ElevateSport.Ride,
          "2018-01-01",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          235,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Super E-Bike Ride",
          ElevateSport.EBikeRide,
          "2018-01-15",
          90,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          666,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 02",
          ElevateSport.Ride,
          "2018-01-30",
          135,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          999,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRun 01",
          ElevateSport.Run,
          "2018-01-30",
          185,
          null,
          false
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivitiesTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const trimpScoredActivities = _.filter(result, "trainingImpulseScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(trimpScoredActivities.length).toEqual(expectedTrimpScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);
          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);

          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should skip activities types 'Ride & 'Run' on prepare fitness w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=OFF & CONFIG_HR_MODE=HRSS", done => {
      // Given
      const expectedFitnessPreparedActivitiesLength = 1;
      const expectedHeartRateStressScoredActivitiesLength = 1;
      const expectedPowerScoredActivitiesLength = 1;
      const expectedSwimScoredActivitiesLength = 0;

      swimEnable = false;

      const skipActivitiesTypes: string[] = [ElevateSport.Ride, "Run"];

      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          151,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 01",
          ElevateSport.Ride,
          "2018-01-01",
          150,
          230,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          235,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Super E-Bike Ride",
          ElevateSport.EBikeRide,
          "2018-01-15",
          90,
          210,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          666,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 02",
          ElevateSport.Ride,
          "2018-01-30",
          135,
          null,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          999,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRun 01",
          ElevateSport.Run,
          "2018-01-30",
          185,
          null,
          false
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivitiesTypes
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const heartRateStressScoredActivities = _.filter(result, "heartRateStressScore");
          const powerScoredActivities = _.filter(result, "powerStressScore");
          const swimScored = _.filter(result, "swimStressScore");

          expect(heartRateStressScoredActivities.length).toEqual(expectedHeartRateStressScoredActivitiesLength);
          expect(powerScoredActivities.length).toEqual(expectedPowerScoredActivitiesLength);

          expect(_.first(heartRateStressScoredActivities).type).toEqual("EBikeRide");
          expect(_.first(heartRateStressScoredActivities).trainingImpulseScore).not.toBeNull();
          expect(_.first(heartRateStressScoredActivities).powerStressScore).not.toBeNull();

          expect(swimScored.length).toEqual(expectedSwimScoredActivitiesLength);
          expect(findDaoSpy).toHaveBeenCalledTimes(1);
          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should ignore activities before a user defined date", done => {
      // Given
      const activityShouldExistsId = 3;
      const ignoreActivitiesBefore = "2018-01-16";
      fitnessTrendConfigModel.ignoreBeforeDate = moment(ignoreActivitiesBefore, "YYYY-MM-DD")
        .startOf("day")
        .toISOString();
      const expectedFitnessPreparedActivitiesLength = 4;
      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 01",
          ElevateSport.Ride,
          "2018-01-01",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 02",
          ElevateSport.Ride,
          "2018-01-15",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 03",
          ElevateSport.Ride,
          "2018-01-16",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 04",
          ElevateSport.Ride,
          "2018-01-17",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 05",
          ElevateSport.Ride,
          "2018-01-18",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Run 01",
          ElevateSport.Run,
          "2018-01-19",
          150,
          null,
          false
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(findDaoSpy).toHaveBeenCalledTimes(1);
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          const firstActivity = _.first(result);
          expect(firstActivity).not.toBeNull();
          expect(firstActivity.id).toEqual(activityShouldExistsId);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should ignore activities matching exclusion pattern", done => {
      // Given
      fitnessTrendConfigModel.ignoreActivityNamePatterns = ["#MTBDH", "@skipMe"];
      const expectedFitnessPreparedActivitiesLength = 3;
      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 01",
          ElevateSport.Ride,
          "2018-01-01",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 02 #MTBDH",
          ElevateSport.Ride,
          "2018-01-15",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 03 #MTBDH",
          ElevateSport.Ride,
          "2018-01-16",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 04",
          ElevateSport.Ride,
          "2018-01-17",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 05 @skipMe",
          ElevateSport.Ride,
          "2018-01-18",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Run 01",
          ElevateSport.Run,
          "2018-01-19",
          150,
          null,
          false
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(findDaoSpy).toHaveBeenCalledTimes(1);
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          let activity: FitnessPreparedActivityModel = _.find(result, { id: 1 });
          expect(activity).not.toBeNull();
          expect(activity.name).toEqual("Ride 01");

          activity = _.find(result, { id: 4 });
          expect(activity).not.toBeNull();
          expect(activity.name).toEqual("Ride 04");

          activity = _.find(result, { id: 6 });
          expect(activity).not.toBeNull();
          expect(activity.name).toEqual("Run 01");

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should ignore activities matching exclusion pattern & defined before date", done => {
      // Given
      const ignoreActivitiesBefore = "2018-01-17";

      fitnessTrendConfigModel.ignoreBeforeDate = moment(ignoreActivitiesBefore, "YYYY-MM-DD")
        .startOf("day")
        .toISOString();
      fitnessTrendConfigModel.ignoreActivityNamePatterns = ["#MTBDH", "@skipMe"];

      const expectedFitnessPreparedActivitiesLength = 2;
      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 01",
          ElevateSport.Ride,
          "2018-01-01",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 02 #MTBDH",
          ElevateSport.Ride,
          "2018-01-15",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 03 #MTBDH",
          ElevateSport.Ride,
          "2018-01-16",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 04",
          ElevateSport.Ride,
          "2018-01-17",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 05 @skipMe",
          ElevateSport.Ride,
          "2018-01-18",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Run 01",
          ElevateSport.Run,
          "2018-01-19",
          150,
          null,
          false
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(findDaoSpy).toHaveBeenCalledTimes(1);
          expect(result).not.toBeNull();
          expect(result.length).toEqual(expectedFitnessPreparedActivitiesLength);

          let activity = _.find(result, { id: 4 });
          expect(activity).not.toBeNull();
          expect(activity.name).toEqual("Ride 04");

          activity = _.find(result, { id: 6 });
          expect(activity).not.toBeNull();
          expect(activity.name).toEqual("Run 01");

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should reject no activities provided", done => {
      // Given
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = false;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = false;
      powerMeterEnable = false;
      swimEnable = false;

      const emptyModels: SyncedActivityModel[] = [];
      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(emptyModels));

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).toBeNull();
          done();
        },
        (error: AppError) => {
          expect(error).not.toBeNull();
          expect(error.code).toBe(AppError.FT_NO_ACTIVITIES);
          expect(error.message).toBe("No activities available to generate the fitness trend");
          done();
        }
      );
    });

    it("should reject when activities no AthleteModel linked", done => {
      // Given
      const syncedActivityModels: SyncedActivityModel[] = [];

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 01",
          ElevateSport.Ride,
          "2018-01-01",
          150,
          null,
          false
        )
      );

      const activityModel = FakeSyncedActivityHelper.create(
        2,
        _ATHLETE_MODEL_SNAPSHOT_,
        "Ride 02",
        ElevateSport.Ride,
        "2018-01-15",
        150,
        null,
        false
      );
      activityModel.athleteSnapshot = undefined;
      syncedActivityModels.push(activityModel);

      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(syncedActivityModels));

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).toBeNull();
          done();
        },
        (error: AppError) => {
          expect(error).not.toBeNull();
          expect(error.code).toBe(AppError.FT_NO_ACTIVITY_ATHLETE_MODEL);
          expect(error.message).toBe(
            "Some of your synced activities are missing athlete settings. " +
              'To fix that check your athlete settings and "clear and re-sync your activities"'
          );
          done();
        }
      );
    });

    it("should reject all activities filtered", done => {
      // Given
      fitnessTrendConfigModel.ignoreActivityNamePatterns = [ElevateSport.Ride];
      const syncedActivityModels: SyncedActivityModel[] = [];
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 01",
          ElevateSport.Ride,
          "2018-01-01",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 02 #MTBDH",
          ElevateSport.Ride,
          "2018-01-15",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 03 #MTBDH",
          ElevateSport.Ride,
          "2018-01-16",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Ride 04",
          ElevateSport.Ride,
          "2018-01-17",
          150,
          null,
          false
        )
      );

      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(syncedActivityModels));

      // When
      const promise: Promise<FitnessPreparedActivityModel[]> = fitnessService.prepare(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (result: FitnessPreparedActivityModel[]) => {
          expect(result).toBeNull();
          done();
        },
        (error: AppError) => {
          expect(error).not.toBeNull();
          expect(error.code).toBe(AppError.FT_ALL_ACTIVITIES_FILTERED);
          expect(error.message).toBe(
            "No activities available. They all have been filtered. Unable to generate the fitness trend."
          );
          done();
        }
      );
    });
  });

  describe("generate daily activities", () => {
    it("should generate athlete daily activities w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=HRSS & Est.PSS=ON & Est.RSS=ON", done => {
      // Given
      getTodayMomentSpy.and.returnValue(moment("2018-02-15 12:00", momentDatePattern));
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = true;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = true;
      const skipActivityTypes = null;
      const expectedDailyActivityLength = 61;
      const expectedPreviewDays = 14;
      const expectedFirstDay = moment("2017-12-31", "YYYY-MM-DD").toDate().getTime();
      const expectedLastRealDay = moment("2018-02-15", "YYYY-MM-DD").toDate().getTime();
      const expectedLastPreviewDay = moment("2018-03-01", "YYYY-MM-DD").toDate().getTime();

      const syncedActivityModels: SyncedActivityModel[] = [];

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          0,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride + HR", // PSS Scored + HRSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          190,
          150,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-02",
          null,
          150,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // HR Scored
          ElevateSport.Ride,
          "2018-01-15",
          190,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride 2", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-02",
          190,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run 2", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-03",
          190,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // Est RSS scored
          ElevateSport.Run,
          "2018-02-07",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // Est RSS scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          8,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Swimming", // SSS Scored
          ElevateSport.Swim,
          "2018-02-09",
          null,
          null,
          false,
          419
        )
      );

      // ... Grouped activities 2018-02-12; Final SS => 380
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          9,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run 3", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-12",
          190, // => HRSS: 190 (priority)
          null,
          false,
          300
        )
      ); // => RSS: 100

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          10,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR + Est power Ride", // HR + PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-02-12",
          190, // => HRSS: 190 (priority)
          150,
          false
        )
      ); // => Est PSS: 100

      // ... Grouped activities 2018-02-13; Final SS => 372
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          11,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run 4", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-13",
          190, // => HRSS: 190 (priority)
          null,
          false,
          300
        )
      ); // => RSS: 100

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          12,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 3", // Est RSS scored
          ElevateSport.Run,
          "2018-02-13",
          null, // => NO HRSS
          null,
          false,
          300
        )
      ); // => RSS: 300 (priority)

      // ... Grouped activities 2018-02-14;
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          13,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-02-14",
          null,
          150, // => PSS: 150 (priority)
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          14,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR + Est power Ride", // HR + PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-02-14",
          190, // => HRSS: 190 (priority)
          150,
          false
        )
      ); // => Est PSS: 150

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          15,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run 4", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-14",
          190, // => HRSS: 190 (priority)
          null,
          false,
          300
        )
      ); // => RSS: 300

      const swimActivity = FakeSyncedActivityHelper.create(
        16,
        _ATHLETE_MODEL_SNAPSHOT_,
        "Swimming", // SSS Scored
        ElevateSport.Swim,
        "2018-02-14",
        null,
        null,
        false,
        419
      );
      swimActivity.distance_raw = 3000; // SSS => 419 (priority)
      syncedActivityModels.push(swimActivity);

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<DayStressModel[]> = fitnessService.generateDailyStress(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivityTypes
      );

      // Then
      promise.then(
        (dailyActivity: DayStressModel[]) => {
          expect(findDaoSpy).toHaveBeenCalledTimes(1);
          expect(dailyActivity).not.toBeNull();

          // Test real & preview days
          expect(dailyActivity.length).toEqual(expectedDailyActivityLength);

          const previewDailyActivity = _.filter(dailyActivity, (dayActivity: DayStressModel) => {
            return dayActivity.previewDay === true;
          });
          expect(previewDailyActivity.length).toEqual(expectedPreviewDays);

          const realDailyActivity = _.filter(dailyActivity, (dayActivity: DayStressModel) => {
            return dayActivity.previewDay === false;
          });
          expect(realDailyActivity.length).toEqual(expectedDailyActivityLength - expectedPreviewDays);

          // Test dates
          expect(_.first(dailyActivity).date.getTime()).toEqual(expectedFirstDay);
          expect(_.last(realDailyActivity).date.getTime()).toEqual(expectedLastRealDay);
          expect(_.last(previewDailyActivity).date.getTime()).toEqual(expectedLastPreviewDay);
          expect(_.last(dailyActivity).date.getTime()).toEqual(expectedLastPreviewDay);

          // Test stress scores
          let activity: DayStressModel;

          activity = _.find(dailyActivity, { ids: [0] });
          expect(_.floor(activity.powerStressScore)).toEqual(150);
          expect(_.floor(activity.heartRateStressScore)).toEqual(190);
          expect(_.floor(activity.finalStressScore)).toEqual(150);
          expect(activity.runningStressScore).toBeNull();
          expect(activity.swimStressScore).toBeNull();

          activity = _.find(dailyActivity, { ids: [1] });
          expect(_.floor(activity.powerStressScore)).toEqual(150);
          expect(_.floor(activity.finalStressScore)).toEqual(150);
          expect(activity.heartRateStressScore).toBeNull();
          expect(activity.runningStressScore).toBeNull();
          expect(activity.swimStressScore).toBeNull();

          activity = _.find(dailyActivity, { ids: [2] });
          expect(_.floor(activity.powerStressScore)).toEqual(150);
          expect(_.floor(activity.heartRateStressScore)).toEqual(190);
          expect(_.floor(activity.finalStressScore)).toEqual(190);
          expect(activity.runningStressScore).toBeNull();
          expect(activity.swimStressScore).toBeNull();

          activity = _.find(dailyActivity, { ids: [3] });
          expect(_.floor(activity.powerStressScore)).toEqual(150);
          expect(_.floor(activity.finalStressScore)).toEqual(150);
          expect(activity.heartRateStressScore).toBeNull();
          expect(activity.runningStressScore).toBeNull();
          expect(activity.swimStressScore).toBeNull();

          activity = _.find(dailyActivity, { ids: [4] });
          expect(_.floor(activity.runningStressScore)).toEqual(300);
          expect(_.floor(activity.heartRateStressScore)).toEqual(190);
          expect(_.floor(activity.finalStressScore)).toEqual(190);
          expect(activity.powerStressScore).toBeNull();
          expect(activity.swimStressScore).toBeNull();

          activity = _.find(dailyActivity, { ids: [5] });
          expect(_.floor(activity.runningStressScore)).toEqual(300);
          expect(_.floor(activity.heartRateStressScore)).toEqual(190);
          expect(_.floor(activity.finalStressScore)).toEqual(190);
          expect(activity.powerStressScore).toBeNull();
          expect(activity.swimStressScore).toBeNull();

          activity = _.find(dailyActivity, { ids: [6] });
          expect(_.floor(activity.runningStressScore)).toEqual(300);
          expect(_.floor(activity.finalStressScore)).toEqual(300);
          expect(activity.heartRateStressScore).toBeNull();
          expect(activity.powerStressScore).toBeNull();
          expect(activity.swimStressScore).toBeNull();

          activity = _.find(dailyActivity, { ids: [7] });
          expect(_.floor(activity.runningStressScore)).toEqual(300);
          expect(_.floor(activity.finalStressScore)).toEqual(300);

          activity = _.find(dailyActivity, { ids: [8] });
          expect(_.isNumber(activity.swimStressScore)).toBeTruthy();
          expect(_.isNumber(activity.finalStressScore)).toBeTruthy();

          activity = _.find(dailyActivity, { ids: [9, 10] });
          expect(_.floor(activity.heartRateStressScore)).toEqual(380);
          expect(_.floor(activity.powerStressScore)).toEqual(150);
          expect(_.floor(activity.runningStressScore)).toEqual(300);
          expect(_.floor(activity.finalStressScore)).toEqual(380);

          activity = _.find(dailyActivity, { ids: [11, 12] });
          expect(_.floor(activity.heartRateStressScore)).toEqual(190);
          expect(_.floor(activity.runningStressScore)).toEqual(600);
          expect(_.floor(activity.finalStressScore)).toEqual(490);

          activity = _.find(dailyActivity, { ids: [13, 14, 15, 16] });
          expect(_.floor(activity.heartRateStressScore)).toEqual(380);
          expect(_.floor(activity.powerStressScore)).toEqual(300);
          expect(_.floor(activity.runningStressScore)).toEqual(300);
          expect(_.floor(activity.swimStressScore)).toEqual(419);
          expect(_.floor(activity.finalStressScore)).toEqual(949);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should generate athlete daily activities without hr or power based activities & CONFIG_HR_MODE=HRSS", done => {
      // Given
      const expectedDailyActivityLength = 61;
      const syncedActivityModels: SyncedActivityModel[] = [];
      getTodayMomentSpy.and.returnValue(moment("2018-02-15 12:00", momentDatePattern));
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 01",
          ElevateSport.Ride,
          "2018-01-01",
          null,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 02",
          ElevateSport.Ride,
          "2018-01-15",
          null,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "SuperHeartRateRide 03",
          ElevateSport.Ride,
          "2018-01-30",
          null,
          null,
          false
        )
      );

      spyOn(activityService.activityDao, "find").and.returnValue(Promise.resolve(syncedActivityModels));

      const promise: Promise<DayStressModel[]> = fitnessService.generateDailyStress(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable
      );

      // Then
      promise.then(
        (dailyActivity: DayStressModel[]) => {
          expect(dailyActivity).not.toBeNull();
          expect(dailyActivity.length).toEqual(expectedDailyActivityLength);

          let activity: DayStressModel;

          activity = _.find(dailyActivity, { ids: [1] });
          expect(_.floor(activity.powerStressScore)).toEqual(0);
          expect(_.floor(activity.heartRateStressScore)).toEqual(0);
          expect(_.floor(activity.runningStressScore)).toEqual(0);
          expect(_.floor(activity.finalStressScore)).toEqual(0);

          activity = _.find(dailyActivity, { ids: [2] });
          expect(_.floor(activity.powerStressScore)).toEqual(0);
          expect(_.floor(activity.heartRateStressScore)).toEqual(0);
          expect(_.floor(activity.runningStressScore)).toEqual(0);
          expect(_.floor(activity.finalStressScore)).toEqual(0);

          activity = _.find(dailyActivity, { ids: [3] });
          expect(_.floor(activity.powerStressScore)).toEqual(0);
          expect(_.floor(activity.heartRateStressScore)).toEqual(0);
          expect(_.floor(activity.runningStressScore)).toEqual(0);
          expect(_.floor(activity.finalStressScore)).toEqual(0);

          done();
        },
        (error: AppError) => {
          expect(error).toBeNull();
          done();
        }
      );
    });
  });

  describe("compute fitness trend", () => {
    it("should compute fitness trend w/ TOGGLE_POWER_METER=ON & TOGGLE_SWIM=ON & CONFIG_HR_MODE=HRSS & Est.PSS=ON & Est.RSS=ON", done => {
      // Given
      getTodayMomentSpy.and.returnValue(moment("2018-02-15 12:00", momentDatePattern));
      fitnessTrendConfigModel.allowEstimatedPowerStressScore = true;
      fitnessTrendConfigModel.allowEstimatedRunningStressScore = true;
      const expectedLength = 61;
      const skipActivitiesTypes = null;
      const syncedActivityModels: SyncedActivityModel[] = [];
      const expectedRideName = "HR Ride";
      const expectedRunName = "HR Run 2";

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          0,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride + HR", // PSS Scored + HRSS Scored
          ElevateSport.Ride,
          "2018-01-01",
          190,
          150,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-01-02",
          null,
          150,
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Ride", // HR Scored
          ElevateSport.Ride,
          "2018-01-15",
          190,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          3,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Ride 2", // PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-01-30",
          null,
          150,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          4,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-02",
          190,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          5,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run 2", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-03",
          190,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          6,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run", // Est RSS scored
          ElevateSport.Run,
          "2018-02-07",
          null,
          null,
          false,
          300
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          7,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 2", // Est RSS scored
          ElevateSport.Run,
          "2018-02-08",
          null,
          null,
          false,
          300
        )
      );

      const swimActivity1 = FakeSyncedActivityHelper.create(
        8,
        _ATHLETE_MODEL_SNAPSHOT_,
        "Swimming", // SSS Scored
        ElevateSport.Swim,
        "2018-02-09",
        null,
        null,
        false,
        419
      );
      swimActivity1.distance_raw = 3000; // SSS => 419 (priority)
      syncedActivityModels.push(swimActivity1);

      // ... Grouped activities 2018-02-12; Final SS => 380
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          9,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run 3", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-12",
          190, // => HRSS: 190 (priority)
          null,
          false,
          300
        )
      ); // => RSS: 100

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          10,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR + Est power Ride", // HR + PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-02-12",
          190, // => HRSS: 190 (priority)
          150,
          false
        )
      ); // => Est PSS: 100

      // ... Grouped activities 2018-02-13; Final SS => 372
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          11,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run 4", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-13",
          190, // => HRSS: 190 (priority)
          null,
          false,
          300
        )
      ); // => RSS: 100

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          12,
          _ATHLETE_MODEL_SNAPSHOT_,
          "No sensor Run 3", // Est RSS scored
          ElevateSport.Run,
          "2018-02-13",
          null, // => NO HRSS
          null,
          false,
          300
        )
      ); // => RSS: 300 (priority)

      // ... Grouped activities 2018-02-14;
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          13,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Power Ride", // PSS Scored
          ElevateSport.Ride,
          "2018-02-14",
          null,
          150, // => PSS: 150 (priority)
          true
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          14,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR + Est power Ride", // HR + PSS Scored (estimated)
          ElevateSport.Ride,
          "2018-02-14",
          190, // => HRSS: 190 (priority)
          150,
          false
        )
      ); // => Est PSS: 150

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          15,
          _ATHLETE_MODEL_SNAPSHOT_,
          "HR Run 4", // HR Scored + Est RSS scored
          ElevateSport.Run,
          "2018-02-14",
          190, // => HRSS: 190 (priority)
          null,
          false,
          300
        )
      ); // => RSS: 300

      const swimActivity2 = FakeSyncedActivityHelper.create(
        16,
        _ATHLETE_MODEL_SNAPSHOT_,
        "Swimming", // SSS Scored
        ElevateSport.Swim,
        "2018-02-14",
        null,
        null,
        false,
        419
      );
      swimActivity2.distance_raw = 3000; // SSS => 419 (priority)
      syncedActivityModels.push(swimActivity2);

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      const promise: Promise<DayFitnessTrendModel[]> = fitnessService.computeTrend(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        skipActivitiesTypes
      );

      // Then
      promise.then(
        (fitnessTrend: DayFitnessTrendModel[]) => {
          expect(fitnessTrend).not.toBeNull();

          expect(fitnessTrend.length).toEqual(expectedLength);
          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          let dayTrend: DayFitnessTrendModel;

          dayTrend = _.find(fitnessTrend, ["ids", [2]]);
          expect(dayTrend).not.toBeNull();
          expect(_.indexOf(dayTrend.activitiesName, expectedRideName)).not.toEqual(-1);
          expect(dayTrend.heartRateStressScore).toEqual(190);
          expect(dayTrend.powerStressScore).toEqual(150);
          expect(dayTrend.runningStressScore).toBeNull();
          expect(dayTrend.finalStressScore).toEqual(190);
          expect(_.floor(dayTrend.atl, 2)).toEqual(31.11);
          expect(_.floor(dayTrend.ctl, 2)).toEqual(9.58);
          expect(_.floor(dayTrend.tsb, 2)).toEqual(-1.48);

          dayTrend = _.find(fitnessTrend, ["ids", [5]]);
          expect(dayTrend).not.toBeNull();
          expect(dayTrend.activitiesName[0]).toEqual(expectedRunName);
          expect(dayTrend.heartRateStressScore).toEqual(190);
          expect(dayTrend.runningStressScore).toEqual(300);
          expect(dayTrend.powerStressScore).toBeNull();
          expect(dayTrend.finalStressScore).toEqual(190);
          expect(_.floor(dayTrend.atl, 2)).toEqual(60.55);
          expect(_.floor(dayTrend.ctl, 2)).toEqual(18.14);
          expect(_.floor(dayTrend.tsb, 2)).toEqual(-26.68);

          dayTrend = _.find(fitnessTrend, ["ids", [7]]);
          expect(_.floor(dayTrend.atl, 2)).toEqual(104.2);
          expect(_.floor(dayTrend.ctl, 2)).toEqual(30.05);
          expect(_.floor(dayTrend.tsb, 2)).toEqual(-50.59);

          dayTrend = _.find(fitnessTrend, { ids: [9, 10] });
          expect(_.floor(dayTrend.atl, 2)).toEqual(145.76);
          expect(_.floor(dayTrend.ctl, 2)).toEqual(45.44);
          expect(_.floor(dayTrend.tsb, 2)).toEqual(-72.42);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });

    it("should compute fitness trend with initial fitness and fatigue value", done => {
      // Given
      const syncedActivityModels = [];

      // Add some fakes EBikeRides
      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          1,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Super Bike Ride 01",
          ElevateSport.Ride,
          "2015-11-15",
          150,
          null,
          false
        )
      );

      syncedActivityModels.push(
        FakeSyncedActivityHelper.create(
          2,
          _ATHLETE_MODEL_SNAPSHOT_,
          "Super Bike Ride 02",
          ElevateSport.Ride,
          "2015-11-20",
          150,
          null,
          false
        )
      );

      const findDaoSpy = spyOn(activityService.activityDao, "find").and.returnValue(
        Promise.resolve(syncedActivityModels)
      );

      // When
      fitnessTrendConfigModel.initializedFitnessTrendModel = {
        atl: 100,
        ctl: 50
      };

      const promise: Promise<DayFitnessTrendModel[]> = fitnessService.computeTrend(
        fitnessTrendConfigModel,
        powerMeterEnable,
        swimEnable,
        null
      );

      // Then
      promise.then(
        (fitnessTrend: DayFitnessTrendModel[]) => {
          expect(fitnessTrend).not.toBeNull();
          expect(findDaoSpy).toHaveBeenCalledTimes(1);

          const firstDay = _.first(fitnessTrend);
          expect(firstDay.ctl).toEqual(fitnessTrendConfigModel.initializedFitnessTrendModel.ctl);
          expect(firstDay.atl).toEqual(fitnessTrendConfigModel.initializedFitnessTrendModel.atl);
          expect(firstDay.tsb).toEqual(
            fitnessTrendConfigModel.initializedFitnessTrendModel.ctl -
              fitnessTrendConfigModel.initializedFitnessTrendModel.atl
          );

          const secondDay = fitnessTrend[1];
          expect(secondDay.ctl).toBeGreaterThan(fitnessTrendConfigModel.initializedFitnessTrendModel.ctl);
          expect(secondDay.atl).toBeGreaterThan(fitnessTrendConfigModel.initializedFitnessTrendModel.atl);

          done();
        },
        error => {
          expect(error).toBeNull();
          throw new Error("Whoops! I should not be here!");
          done();
        }
      );
    });
  });
});
