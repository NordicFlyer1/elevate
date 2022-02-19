import { Inject, Injectable } from "@angular/core";
import { YearProgressModel } from "../models/year-progress.model";
import _ from "lodash";
import moment, { Moment } from "moment";
import { ProgressModel } from "../models/progress.model";
import { ProgressAtDayModel } from "../models/progress-at-date.model";
import { ProgressType } from "../enums/progress-type.enum";
import { Subject } from "rxjs";
import { YearToDateProgressPresetModel } from "../models/year-to-date-progress-preset.model";
import { YearProgressPresetDao } from "../dao/year-progress-preset.dao";
import { AppError } from "../../../shared/models/app-error.model";
import { YearProgressTypeModel } from "../models/year-progress-type.model";
import { TargetProgressModel } from "../models/target-progress.model";
import { ProgressMode } from "../enums/progress-mode.enum";
import { ProgressConfig } from "../interfaces/progress-config";
import { YearToDateProgressConfigModel } from "../models/year-to-date-progress-config.model";
import { RollingProgressConfigModel } from "../models/rolling-progress-config.model";
import { RollingProgressPresetModel } from "../models/rolling-progress-preset.model";
import { YearProgressActivity } from "../models/year-progress-activity.model";
import { Activity } from "@elevate/shared/models/sync/activity.model";
import { Constant } from "@elevate/shared/constants/constant";

@Injectable()
export class YearProgressService {
  public static readonly ERROR_NO_ACTIVITY_MODELS: string = "Empty activity";
  public static readonly ERROR_NO_TYPES_FILTER: string = "Empty types filter";
  public static readonly ERROR_NO_YEAR_PROGRESS_MODELS: string = "Empty YearProgressModels from given activity types";

  public momentWatched: Moment;
  public momentWatchedChanges$: Subject<Moment>;

  constructor(@Inject(YearProgressPresetDao) public readonly yearProgressPresetDao: YearProgressPresetDao) {
    this.momentWatched = this.getTodayMoment().clone().startOf("day"); // By default moment watched is today. Moment watched can be edited from external
    this.momentWatchedChanges$ = new Subject<Moment>();
  }

  public static provideProgressTypes(isMetric: boolean): YearProgressTypeModel[] {
    return [
      new YearProgressTypeModel(
        ProgressType.DISTANCE,
        "Distance",
        isMetric ? "kilometers" : "miles",
        isMetric ? "km" : "mi"
      ),
      new YearProgressTypeModel(ProgressType.TIME, "Time", "hours", "h"),
      new YearProgressTypeModel(
        ProgressType.ELEVATION,
        "Elevation",
        isMetric ? "meters" : "feet",
        isMetric ? "m" : "ft"
      ),
      new YearProgressTypeModel(ProgressType.COUNT, "Count")
    ];
  }

  public progressions(config: ProgressConfig, isMetric: boolean, activities: Activity[]): YearProgressModel[] {
    if (_.isEmpty(activities)) {
      throw new Error(YearProgressService.ERROR_NO_ACTIVITY_MODELS);
    }

    if (_.isEmpty(config.activityTypes)) {
      throw new Error(YearProgressService.ERROR_NO_TYPES_FILTER);
    }

    let yearProgressActivities = this.createFilterYearProgressActivities(activities, config.activityTypes);

    if (_.isEmpty(yearProgressActivities)) {
      throw new Error(YearProgressService.ERROR_NO_YEAR_PROGRESS_MODELS);
    }

    // Sort yearProgressActivities along startTime
    yearProgressActivities = _.sortBy(yearProgressActivities, (activity: YearProgressActivity) => {
      return activity.startTime;
    });

    // Find along types date from & to / From: 1st january of first year / To: Today
    const todayMoment = this.getTodayMoment();
    const fromMoment: Moment = moment(_.first(activities).startTime).startOf("year"); // 1st january of first year
    const toMoment: Moment = this.getTodayMoment().clone().endOf("year").endOf("day");

    return config.mode === ProgressMode.YEAR_TO_DATE
      ? this.computeYearToDateSumProgressions(
          config as YearToDateProgressConfigModel,
          isMetric,
          fromMoment,
          toMoment,
          todayMoment,
          yearProgressActivities
        )
      : this.computeRollingSumProgressions(
          config as RollingProgressConfigModel,
          isMetric,
          fromMoment,
          toMoment,
          todayMoment,
          yearProgressActivities
        );
  }

  public computeYearToDateSumProgressions(
    config: YearToDateProgressConfigModel,
    isMetric: boolean,
    fromMoment: Moment,
    toMoment: Moment,
    todayMoment,
    yearProgressActivities
  ): YearProgressModel[] {
    const yearProgressions: YearProgressModel[] = [];
    let lastProgress: ProgressModel = null;

    // From 'fromMoment' to 'todayMoment' loop on days...
    const currentDayMoment = moment(fromMoment);
    let currentYearProgress: YearProgressModel = null;

    while (currentDayMoment.isSameOrBefore(toMoment)) {
      const currentYear = currentDayMoment.year();
      let progress: ProgressModel = null;

      // Create new year progress if current year do not exists
      const isNewYearProgress = !_.find(yearProgressions, { year: currentYear });

      if (isNewYearProgress) {
        lastProgress = null; // New year then remove

        currentYearProgress = {
          mode: config.mode,
          year: currentYear,
          progressions: []
        };

        // Start totals from 0
        progress = new ProgressModel(currentDayMoment.year(), currentDayMoment.dayOfYear(), 0, 0, 0, 0);

        yearProgressions.push(currentYearProgress); // register inside yearProgressions
      } else {
        // Year exists
        progress = new ProgressModel(
          currentDayMoment.year(),
          currentDayMoment.dayOfYear(),
          lastProgress.distance,
          lastProgress.time,
          lastProgress.elevation,
          lastProgress.count
        );
      }

      // Seek for activities performed that day
      const dayYearProgressActivities: YearProgressActivity[] = _.filter<YearProgressActivity>(yearProgressActivities, {
        year: currentDayMoment.year(),
        dayOfYear: currentDayMoment.dayOfYear()
      });

      if (dayYearProgressActivities.length > 0) {
        dayYearProgressActivities.forEach(activity => {
          if ((!config.includeCommuteRide && activity.commute) || (!config.includeIndoorRide && activity.trainer)) {
            return;
          }

          progress.distance += activity.distance;
          progress.time += activity.movingTime;
          progress.elevation += activity.elevationGain;
          progress.count++;
        });
      }

      lastProgress = _.clone(progress); // Keep tracking for tomorrow day.

      // Tag progression day as future or not
      progress.isFuture = !currentDayMoment.isSameOrBefore(todayMoment);

      // Prepare along metric/imperial & push
      currentYearProgress.progressions.push(this.prepareAlongSystemUnits(progress, isMetric));
      currentDayMoment.add(1, "days"); // Add a day until todayMoment
    }

    return yearProgressions;
  }

  public computeRollingSumProgressions(
    config: RollingProgressConfigModel,
    isMetric: boolean,
    fromMoment: Moment,
    toMoment: Moment,
    todayMoment,
    yearProgressActivities
  ): YearProgressModel[] {
    const yearProgressions: YearProgressModel[] = [];

    // From 'fromMoment' to 'todayMoment' loop on days...
    const currentDayMoment = moment(fromMoment);
    let currentYearProgress: YearProgressModel = null;

    let isRollingBufferSizeReached = false;
    let rollingBufferSize = 0;
    const rollingBuffers = {
      distance: [],
      time: [],
      elevation: [],
      count: []
    };

    while (currentDayMoment.isSameOrBefore(toMoment)) {
      // Increase buffer size until rolling days length is reached
      if (!isRollingBufferSizeReached) {
        rollingBufferSize === config.rollingDays ? (isRollingBufferSizeReached = true) : rollingBufferSize++;
      }

      const currentYear = currentDayMoment.year();

      const activitiesFound: YearProgressActivity[] = _.filter<YearProgressActivity>(yearProgressActivities, {
        year: currentDayMoment.year(),
        dayOfYear: currentDayMoment.dayOfYear()
      });

      const onDayTotals = {
        distance: 0,
        time: 0,
        elevation: 0,
        count: 0
      };

      // Seek for activities performed that day
      const hasCurrentDayActivities = activitiesFound.length > 0;
      if (hasCurrentDayActivities) {
        activitiesFound.forEach(activity => {
          if ((!config.includeCommuteRide && activity.commute) || (!config.includeIndoorRide && activity.trainer)) {
            return;
          }

          onDayTotals.distance += activity.distance;
          onDayTotals.time += activity.movingTime;
          onDayTotals.elevation += activity.elevationGain;
          onDayTotals.count++;
        });
      }

      // Push totals performed on current day inside buffer
      rollingBuffers.distance.push(onDayTotals.distance);
      rollingBuffers.time.push(onDayTotals.time);
      rollingBuffers.elevation.push(onDayTotals.elevation);
      rollingBuffers.count.push(onDayTotals.count);

      const rollingSum = {
        distance: _.sum(rollingBuffers.distance) - (isRollingBufferSizeReached ? rollingBuffers.distance.shift() : 0),
        time: _.sum(rollingBuffers.time) - (isRollingBufferSizeReached ? rollingBuffers.time.shift() : 0),
        elevation:
          _.sum(rollingBuffers.elevation) - (isRollingBufferSizeReached ? rollingBuffers.elevation.shift() : 0),
        count: _.sum(rollingBuffers.count) - (isRollingBufferSizeReached ? rollingBuffers.count.shift() : 0)
      };

      const progression: ProgressModel = new ProgressModel(
        currentDayMoment.year(),
        currentDayMoment.dayOfYear(),
        rollingSum.distance,
        rollingSum.time,
        rollingSum.elevation,
        rollingSum.count
      );

      // Create new year progress if current year do not exists
      const isNewYearProgress = !_.find(yearProgressions, { year: currentYear });
      if (isNewYearProgress) {
        currentYearProgress = {
          mode: config.mode,
          year: currentYear,
          progressions: []
        };
        yearProgressions.push(currentYearProgress); // register inside yearProgressions
      }

      // Tag progression day as future or not
      progression.isFuture = !currentDayMoment.isSameOrBefore(todayMoment);

      // Prepare along metric/imperial & push
      currentYearProgress.progressions.push(this.prepareAlongSystemUnits(progression, isMetric));
      currentDayMoment.add(1, "days"); // Add a day until todayMoment
    }

    return yearProgressions;
  }

  public prepareAlongSystemUnits(progression: ProgressModel, isMetric: boolean): ProgressModel {
    // Distance conversion
    let distance = progression.distance / 1000; // KM

    if (!isMetric) {
      distance *= Constant.KM_TO_MILE_FACTOR; // Imperial (Miles)
    }
    progression.distance = Math.round(distance);

    // Elevation conversion
    let elevation = progression.elevation; // Meters
    if (!isMetric) {
      elevation *= Constant.METER_TO_FEET_FACTOR; // Imperial (feet)
    }
    progression.elevation = Math.round(elevation);

    // Convert time in seconds to hours
    progression.time = progression.time / 3600;

    return progression;
  }

  public yearToDateTargetProgression(year: number, targetValue: number): TargetProgressModel[] {
    const targetProgressModels: TargetProgressModel[] = [];
    const daysInYear = moment().year(year).isLeapYear() ? 366 : 365;
    const progressStep = targetValue / daysInYear;

    let targetProgress = progressStep; // Start progression

    for (let day = 1; day <= daysInYear; day++) {
      targetProgressModels.push({
        dayOfYear: day,
        value: targetProgress
      });
      targetProgress += progressStep;
    }

    return targetProgressModels;
  }

  public rollingTargetProgression(year: number, targetValue: number): TargetProgressModel[] {
    const targetProgressModels: TargetProgressModel[] = [];
    const daysInYear = moment().year(year).isLeapYear() ? 366 : 365;

    for (let day = 1; day <= daysInYear; day++) {
      targetProgressModels.push({
        dayOfYear: day,
        value: targetValue
      });
    }
    return targetProgressModels;
  }

  public availableYears(activities: Activity[]): number[] {
    activities = _.sortBy(activities, "startTime");

    const availableYears = [];
    const startYear: number = moment(_.first(activities).startTime).year();
    const endYear: number = this.getTodayMoment().year();

    let year: number = startYear;
    while (year <= endYear) {
      availableYears.push(year);
      year++;
    }

    return availableYears.reverse();
  }

  public createFilterYearProgressActivities(activities: Activity[], typesFilter: string[]): YearProgressActivity[] {
    const yearProgressActivities: YearProgressActivity[] = [];

    activities.forEach((activity: Activity) => {
      if (_.indexOf(typesFilter, activity.type) !== -1) {
        const momentStartTime: Moment = moment(activity.startTime);
        const yearProgressActivity: YearProgressActivity = {
          dayOfYear: momentStartTime.dayOfYear(),
          year: momentStartTime.year(),
          type: activity.type,
          startTime: activity.startTime,
          trainer: activity.trainer,
          commute: activity.commute,
          distance: activity.stats?.distance || null,
          movingTime: activity.stats?.movingTime || null,
          elevationGain: activity.stats?.elevationGain || null
        };

        yearProgressActivities.push(yearProgressActivity);
      }
    });

    return yearProgressActivities;
  }

  public findProgressionsAtDay(
    yearProgressions: YearProgressModel[],
    dayMoment: Moment,
    progressType: ProgressType,
    selectedYears: number[],
    yearsColorsMap: Map<number, string>
  ): ProgressAtDayModel[] {
    const progressionsAtDay: ProgressAtDayModel[] = [];

    _.forEach(selectedYears, (selectedYear: number) => {
      const dayMomentAtYear = dayMoment.year(selectedYear).startOf("day");

      const yearProgressModel: YearProgressModel = _.find(yearProgressions, {
        year: selectedYear
      });

      if (!yearProgressModel) {
        // Continue if we don't have year progressions for current selectedYear
        return;
      }

      const progressModel: ProgressModel = _.find(yearProgressModel.progressions, {
        dayOfYear: dayMomentAtYear.dayOfYear()
      });

      if (progressModel) {
        const progressAtDay: ProgressAtDayModel = {
          date: dayMomentAtYear.toDate(),
          year: dayMomentAtYear.year(),
          progressType: progressType,
          value: progressModel.valueOf(progressType),
          color: yearsColorsMap ? yearsColorsMap.get(dayMomentAtYear.year()) : null
        };

        progressionsAtDay.push(progressAtDay);
      }
    });

    return progressionsAtDay;
  }

  public onMomentWatchedChange(momentWatched: Moment): void {
    this.momentWatched = momentWatched;
    this.momentWatchedChanges$.next(momentWatched);
  }

  /**
   * Reset moment watch to default (today)
   */
  public resetMomentWatched(): Moment {
    const todayMoment = this.getTodayMoment().clone().startOf("day");
    this.onMomentWatchedChange(todayMoment.clone());
    return todayMoment;
  }

  public readableTimeProgress(hoursIn: number): string {
    if (!hoursIn) {
      return "0h";
    }

    const duration = moment.duration(Math.abs(hoursIn), "hours");
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();

    const showHours = hours ? `${hours}h` + (minutes ? ", " : "") : "";
    const showMinutes = minutes ? `${minutes}m` : "";

    return `${showHours}${showMinutes}`;
  }

  /**
   * Fetch all preset
   */
  public fetchPresets(): Promise<YearToDateProgressPresetModel[]> {
    return this.yearProgressPresetDao.find();
  }

  /**
   * Add preset to existing
   */
  public addPreset(presetModel: YearToDateProgressPresetModel): Promise<YearToDateProgressPresetModel> {
    return this.yearProgressPresetDao.find().then((models: YearToDateProgressPresetModel[]) => {
      const query: Partial<YearToDateProgressPresetModel> = {
        mode: presetModel.mode,
        progressType: presetModel.progressType,
        activityTypes: presetModel.activityTypes,
        includeCommuteRide: presetModel.includeCommuteRide,
        includeIndoorRide: presetModel.includeIndoorRide,
        targetValue: presetModel.targetValue
      };

      if (presetModel.mode === ProgressMode.ROLLING) {
        const rollingPresetModel = presetModel as RollingProgressPresetModel;
        (query as RollingProgressPresetModel).rollingPeriod = rollingPresetModel.rollingPeriod;
        (query as RollingProgressPresetModel).periodMultiplier = rollingPresetModel.periodMultiplier;
      }

      const existingModel = _.find(models, query);

      if (existingModel) {
        return Promise.reject(
          new AppError(AppError.YEAR_PROGRESS_PRESETS_ALREADY_EXISTS, "You already saved this preset.")
        );
      }

      return this.yearProgressPresetDao.insert(presetModel);
    });
  }

  /**
   * Remove preset at index
   */
  public deletePreset(id: string): Promise<void> {
    return this.yearProgressPresetDao.removeById(id);
  }

  public getTodayMoment(): Moment {
    return moment();
  }
}
