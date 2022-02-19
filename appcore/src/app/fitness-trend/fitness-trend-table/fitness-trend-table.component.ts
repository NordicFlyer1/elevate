import { AfterViewInit, Component, Inject, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from "@angular/core";
import { DayFitnessTrendModel } from "../shared/models/day-fitness-trend.model";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import _ from "lodash";
import moment from "moment";
import { HeartRateImpulseMode } from "../shared/enums/heart-rate-impulse-mode.enum";
import { FitnessTrendConfigModel } from "../shared/models/fitness-trend-config.model";
import { Parser as Json2CsvParser } from "json2csv";
import { saveAs } from "file-saver";
import { GotItDialogComponent } from "../../shared/dialogs/got-it-dialog/got-it-dialog.component";
import { GotItDialogDataModel } from "../../shared/dialogs/got-it-dialog/got-it-dialog-data.model";
import { FitnessTrendColumnModel } from "./fitness-trend-column.model";
import { FitnessTrendColumnType } from "./fitness-trend-column.enum";
import { FitnessTrendActivitiesLinksDialogComponent } from "../fitness-trend-activities-links-dialog/fitness-trend-activities-links-dialog.component";
import { LoggerService } from "../../shared/services/logging/logger.service";
import {
  OPEN_RESOURCE_RESOLVER,
  OpenResourceResolver
} from "../../shared/services/links-opener/open-resource-resolver";

@Component({
  selector: "app-fitness-trend-table",
  templateUrl: "./fitness-trend-table.component.html",
  styleUrls: ["./fitness-trend-table.component.scss"]
})
export class FitnessTrendTableComponent implements OnInit, OnChanges, AfterViewInit {
  public static readonly COLUMN_DATE: string = "date";
  public static readonly COLUMN_TYPES: string = "types";
  public static readonly COLUMN_ACTIVITIES: string = "activities";
  public static readonly COLUMN_TRAINING_IMPULSE_SCORE: string = "trainingImpulseScore";
  public static readonly COLUMN_HEART_RATE_STRESS_SCORE: string = "heartRateStressScore";
  public static readonly COLUMN_POWER_STRESS_SCORE: string = "powerStressScore";
  public static readonly COLUMN_RUNNING_STRESS_SCORE: string = "runningStressScore";
  public static readonly COLUMN_SWIM_STRESS_SCORE: string = "swimStressScore";
  public static readonly COLUMN_FINAL_STRESS_SCORE: string = "finalStressScore";
  public static readonly COLUMN_CTL: string = "ctl";
  public static readonly COLUMN_ATL: string = "atl";
  public static readonly COLUMN_TSB: string = "tsb";
  public static readonly COLUMN_TRAINING_ZONE: string = "zone";
  public static readonly COLUMN_ATHLETE_SETTINGS: string = "athleteSettings";
  public static readonly COLUMN_STRAVA_LINK: string = "link";

  public static readonly AVAILABLE_COLUMNS: FitnessTrendColumnModel[] = [
    {
      id: FitnessTrendTableComponent.COLUMN_DATE,
      header: "Date",
      type: FitnessTrendColumnType.TEXT,
      width: 13,
      printText: (dayFitnessTrend: DayFitnessTrendModel) =>
        `${moment(dayFitnessTrend.date).format("ddd, MMM DD, YYYY")}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_TYPES,
      header: "Types",
      width: 13,
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printTypes("-")}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_ACTIVITIES,
      header: "Activities",
      width: 25,
      type: FitnessTrendColumnType.ACTIVITY_NAME,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printActivities("-")}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_HEART_RATE_STRESS_SCORE,
      header: "HRSS",
      width: 5,
      description: "Heart Rate Stress Score",
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printHeartRateStressScore()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_TRAINING_IMPULSE_SCORE,
      header: "TRIMP",
      width: 5,
      description: "Training Impulse",
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printTrainingImpulseScore()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_POWER_STRESS_SCORE,
      header: "PSS",
      width: 5,
      description: "Power Stress Score",
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printPowerStressScore()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_RUNNING_STRESS_SCORE,
      header: "RSS",
      width: 5,
      description: "Running Stress Score",
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printRunningStressScore()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_SWIM_STRESS_SCORE,
      header: "SwimSS",
      width: 5,
      description: "Swim Stress Score",
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printSwimStressScore()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_FINAL_STRESS_SCORE,
      header: "Final Stress",
      width: 5,
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printFinalStressScore()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_CTL,
      header: "Fitness",
      width: 5,
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printFitness()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_ATL,
      header: "Fatigue",
      width: 5,
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printFatigue()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_TSB,
      header: "Form",
      width: 5,
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printForm()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_TRAINING_ZONE,
      header: "Training Zone",
      type: FitnessTrendColumnType.TEXT,
      printText: (dayFitnessTrend: DayFitnessTrendModel) => `${dayFitnessTrend.printTrainingZone()}`
    },
    {
      id: FitnessTrendTableComponent.COLUMN_ATHLETE_SETTINGS,
      header: "Settings",
      width: 5,
      type: FitnessTrendColumnType.ATHLETE_SETTINGS
    }
  ];

  public dataSource: MatTableDataSource<DayFitnessTrendModel>;
  public FitnessTrendColumnType = FitnessTrendColumnType;
  public columns: FitnessTrendColumnModel[];
  public displayedColumns: string[];
  public searchText: string;

  public initialized = false;

  @Input()
  public fitnessTrend: DayFitnessTrendModel[];

  @Input()
  public fitnessTrendConfigModel: FitnessTrendConfigModel;

  @Input()
  public isTrainingZonesEnabled;

  @Input()
  public isPowerMeterEnabled;

  @Input()
  public isSwimEnabled;

  @ViewChild(MatPaginator, { static: true })
  public matPaginator: MatPaginator;

  @ViewChild(MatSort, { static: true })
  public matSort: MatSort;

  constructor(
    @Inject(OPEN_RESOURCE_RESOLVER) private readonly openResourceResolver: OpenResourceResolver,
    @Inject(MatDialog) private readonly dialog: MatDialog,
    @Inject(LoggerService) private readonly logger: LoggerService
  ) {}

  public ngOnInit(): void {
    this.setup();
    this.initialized = true;
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }

    this.columns = _.filter(FitnessTrendTableComponent.AVAILABLE_COLUMNS, (column: FitnessTrendColumnModel) => {
      if (
        (column.id === FitnessTrendTableComponent.COLUMN_POWER_STRESS_SCORE && !this.isPowerMeterEnabled) ||
        (column.id === FitnessTrendTableComponent.COLUMN_SWIM_STRESS_SCORE && !this.isSwimEnabled) ||
        (column.id === FitnessTrendTableComponent.COLUMN_TRAINING_ZONE && !this.isTrainingZonesEnabled) ||
        (column.id === FitnessTrendTableComponent.COLUMN_RUNNING_STRESS_SCORE &&
          !this.fitnessTrendConfigModel.allowEstimatedRunningStressScore) ||
        (column.id === FitnessTrendTableComponent.COLUMN_HEART_RATE_STRESS_SCORE &&
          this.fitnessTrendConfigModel.heartRateImpulseMode !== HeartRateImpulseMode.HRSS) ||
        (column.id === FitnessTrendTableComponent.COLUMN_RUNNING_STRESS_SCORE &&
          this.fitnessTrendConfigModel.heartRateImpulseMode !== HeartRateImpulseMode.HRSS) ||
        (column.id === FitnessTrendTableComponent.COLUMN_TRAINING_IMPULSE_SCORE &&
          this.fitnessTrendConfigModel.heartRateImpulseMode !== HeartRateImpulseMode.TRIMP)
      ) {
        return false;
      }
      return true;
    });

    this.displayedColumns = this.columns.map(column => column.id);

    if (changes.fitnessTrend && changes.fitnessTrend.currentValue) {
      this.dataSource.data = this.prepareFitnessTrendModels(changes.fitnessTrend.currentValue);
    }
  }

  public setup(): void {
    this.dataSource = new MatTableDataSource<DayFitnessTrendModel>();
    this.dataSource.sortingDataAccessor = (dayFitnessTrendModel: DayFitnessTrendModel, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case FitnessTrendTableComponent.COLUMN_DATE:
          return dayFitnessTrendModel.timestamp;

        case FitnessTrendTableComponent.COLUMN_TYPES:
          return dayFitnessTrendModel.printTypes();

        case FitnessTrendTableComponent.COLUMN_ACTIVITIES:
          return dayFitnessTrendModel.printActivities();

        case FitnessTrendTableComponent.COLUMN_HEART_RATE_STRESS_SCORE:
          return dayFitnessTrendModel.heartRateStressScore;

        case FitnessTrendTableComponent.COLUMN_TRAINING_IMPULSE_SCORE:
          return dayFitnessTrendModel.trainingImpulseScore;

        case FitnessTrendTableComponent.COLUMN_POWER_STRESS_SCORE:
          return dayFitnessTrendModel.powerStressScore;

        case FitnessTrendTableComponent.COLUMN_RUNNING_STRESS_SCORE:
          return dayFitnessTrendModel.runningStressScore;

        case FitnessTrendTableComponent.COLUMN_SWIM_STRESS_SCORE:
          return dayFitnessTrendModel.swimStressScore;

        case FitnessTrendTableComponent.COLUMN_FINAL_STRESS_SCORE:
          return dayFitnessTrendModel.finalStressScore;

        case FitnessTrendTableComponent.COLUMN_CTL:
          return dayFitnessTrendModel.ctl;

        case FitnessTrendTableComponent.COLUMN_ATL:
          return dayFitnessTrendModel.atl;

        case FitnessTrendTableComponent.COLUMN_TSB:
          return dayFitnessTrendModel.tsb;

        case FitnessTrendTableComponent.COLUMN_TRAINING_ZONE:
          return dayFitnessTrendModel.trainingZone;

        case FitnessTrendTableComponent.COLUMN_ATHLETE_SETTINGS:
          return null;

        case FitnessTrendTableComponent.COLUMN_STRAVA_LINK:
          return dayFitnessTrendModel.timestamp;

        default:
          throw new Error("sortHeaderId: " + sortHeaderId + " is not listed");
      }
    };
  }

  public prepareFitnessTrendModels(fitnessTrendModels: DayFitnessTrendModel[]): DayFitnessTrendModel[] {
    // Remove preview days
    fitnessTrendModels = _.filter(fitnessTrendModels, {
      previewDay: false
    });

    // Sort by date desc
    fitnessTrendModels = _.sortBy(fitnessTrendModels, (dayFitnessTrendModel: DayFitnessTrendModel) => {
      return dayFitnessTrendModel.timestamp * -1;
    });

    return fitnessTrendModels;
  }

  public applyFilter(filterValue: string): void {
    filterValue = filterValue.trim(); // Remove whitespace
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.dataSource.filter = filterValue;
  }

  public ngAfterViewInit(): void {
    this.dataSource.paginator = this.matPaginator;
    this.dataSource.sort = this.matSort;
  }

  public onActivitiesClicked(dayFitnessTrend: DayFitnessTrendModel): void {
    if (dayFitnessTrend.ids.length > 1) {
      this.dialog.open(FitnessTrendActivitiesLinksDialogComponent, {
        minWidth: FitnessTrendActivitiesLinksDialogComponent.MIN_WIDTH,
        maxWidth: FitnessTrendActivitiesLinksDialogComponent.MAX_WIDTH,
        data: dayFitnessTrend
      });
    } else {
      this.openResourceResolver.openActivity(_.first(dayFitnessTrend.ids));
    }
  }

  public onViewAthleteSettings(dayFitnessTrendModel: DayFitnessTrendModel): void {
    this.dialog.open(GotItDialogComponent, {
      minWidth: GotItDialogComponent.MIN_WIDTH,
      maxWidth: GotItDialogComponent.MAX_WIDTH,
      data: new GotItDialogDataModel("Calculated with athlete settings", dayFitnessTrendModel.printAthleteSettings())
    });
  }

  public onSpreadSheetExport(): void {
    try {
      const exportedFields = _.without(this.displayedColumns, FitnessTrendTableComponent.COLUMN_STRAVA_LINK);
      const parser = new Json2CsvParser({ fields: exportedFields });
      const csvData = parser.parse(this.generateSpreadSheetExportData());
      const blob = new Blob([csvData], { type: "application/csv; charset=utf-8" });
      const filename = "fitness_trend_export." + moment().format("Y.M.D-H.mm.ss") + ".csv";
      saveAs(blob, filename);
    } catch (err) {
      this.logger.error(err);
    }
  }

  private generateSpreadSheetExportData(): any[] {
    const exportedFitnessTrend = [];

    _.forEach(this.fitnessTrend, (dayFitnessTrendModel: DayFitnessTrendModel) => {
      const exportedFitnessDay: any = _.clone(dayFitnessTrendModel);

      exportedFitnessDay[FitnessTrendTableComponent.COLUMN_DATE] = dayFitnessTrendModel.dateString;
      exportedFitnessDay[FitnessTrendTableComponent.COLUMN_ACTIVITIES] = dayFitnessTrendModel.printActivities();
      exportedFitnessDay[FitnessTrendTableComponent.COLUMN_TYPES] = dayFitnessTrendModel.printTypes();

      exportedFitnessDay.atl = _.floor(dayFitnessTrendModel.atl, 2);
      exportedFitnessDay.ctl = _.floor(dayFitnessTrendModel.ctl, 2);
      exportedFitnessDay.tsb = _.floor(dayFitnessTrendModel.tsb, 2);
      exportedFitnessDay.zone = dayFitnessTrendModel.printTrainingZone();

      exportedFitnessDay.trainingImpulseScore = dayFitnessTrendModel.trainingImpulseScore
        ? _.floor(dayFitnessTrendModel.trainingImpulseScore, 2)
        : "";
      exportedFitnessDay.heartRateStressScore = dayFitnessTrendModel.heartRateStressScore
        ? _.floor(dayFitnessTrendModel.heartRateStressScore, 2)
        : "";
      exportedFitnessDay.runningStressScore = dayFitnessTrendModel.runningStressScore
        ? _.floor(dayFitnessTrendModel.runningStressScore, 2)
        : "";
      exportedFitnessDay.powerStressScore = dayFitnessTrendModel.powerStressScore
        ? _.floor(dayFitnessTrendModel.powerStressScore, 2)
        : "";
      exportedFitnessDay.finalStressScore = dayFitnessTrendModel.finalStressScore
        ? _.floor(dayFitnessTrendModel.finalStressScore, 2)
        : "";

      exportedFitnessDay.athleteSettings = dayFitnessTrendModel.printAthleteSettings()
        ? dayFitnessTrendModel.printAthleteSettings()
        : "";

      exportedFitnessTrend.push(exportedFitnessDay);
    });

    return exportedFitnessTrend;
  }
}
