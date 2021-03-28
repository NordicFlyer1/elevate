import { Component, Inject, OnInit, ViewChild } from "@angular/core";
import { AthleteModel, Gender, PracticeLevel } from "@elevate/shared/models";
import { GenderModel } from "../models/gender.model";
import { ActivityService } from "../../shared/services/activity/activity.service";
import { LoggerService } from "../../shared/services/logging/logger.service";
import { AthleteService } from "../../shared/services/athlete/athlete.service";
import { AppService } from "../../shared/services/app-service/app.service";
import { ElevateSport } from "@elevate/shared/enums";
import _ from "lodash";
import { NgForm } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";

// TODO Give a helper guide to find dated settings (how to?)
// TODO Show athleteSnapshot used on strava activities

@Component({
  selector: "app-athlete-settings",
  templateUrl: "./athlete-settings.component.html",
  styleUrls: ["./athlete-settings.component.scss"]
})
export class AthleteSettingsComponent implements OnInit {
  private static readonly USUAL_SPORTS_CATEGORY: ElevateSport[] = [
    ElevateSport.Ride,
    ElevateSport.Run,
    ElevateSport.Swim,
    ElevateSport.Triathlon,
    ElevateSport.Hike,
    ElevateSport.Walk,
    ElevateSport.Rowing
  ];

  private static readonly HIDDEN_SPORTS_CATEGORY: ElevateSport[] = [
    ElevateSport.Cardio,
    ElevateSport.Manual,
    ElevateSport.Mountaineering,
    ElevateSport.Orienteering,
    ElevateSport.Other,
    ElevateSport.VirtualRide,
    ElevateSport.VirtualRun,
    ElevateSport.Workout
  ];

  private static readonly BIRTH_YEARS_COUNT: number = 120;

  public readonly MAX_SPORTS: number = 10;

  public readonly GENDERS: GenderModel[] = [
    {
      type: Gender.MEN,
      display: "Male"
    },
    {
      type: Gender.WOMEN,
      display: "Female"
    }
  ];

  public readonly PracticeLevel = PracticeLevel;
  public readonly PRACTICE_LEVELS: PracticeLevel[] = [
    PracticeLevel.NOVICE,
    PracticeLevel.ENTHUSIAST,
    PracticeLevel.COMPETITIVE,
    PracticeLevel.PRO
  ];

  public athleteModel: AthleteModel;
  public sportsCategories: { label: string; sportKeys: ElevateSport[] }[];

  @ViewChild("athleteForm") athleteForm: NgForm;

  constructor(
    @Inject(AppService) public readonly appService: AppService,
    @Inject(AthleteService) private readonly athleteService: AthleteService,
    @Inject(ActivityService) private readonly activityService: ActivityService,
    @Inject(MatSnackBar) private readonly snackBar: MatSnackBar,
    @Inject(LoggerService) private readonly logger: LoggerService
  ) {
    this.setupSportsCategories();
  }

  public ngOnInit(): void {
    this.athleteService.fetch().then((athleteModel: AthleteModel) => {
      this.athleteModel = athleteModel;
      setTimeout(() => this.athleteForm.control.markAllAsTouched()); // Force template driven form validation
    });
  }

  public onAthleteSettingsChanged(): void {
    this.verifyConsistencyWithAthleteSettings();
  }

  public onAthleteChanged(): void {
    if (this.athleteModel.sports.length >= this.MAX_SPORTS) {
      this.snackBar.open(`You can't add more than ${this.MAX_SPORTS} preferred sports`, "Ok", { duration: 4000 });
    }
    this.athleteService.update(this.athleteModel).then(() => this.onAthleteSettingsChanged());
  }

  public onDatedAthleteSettingsModelsChanged(): void {
    this.onAthleteSettingsChanged();
  }

  private verifyConsistencyWithAthleteSettings() {
    this.activityService.verifyConsistencyWithAthleteSettings();
  }

  public startCase(sport: string): string {
    return _.startCase(sport);
  }

  public getYear(): number {
    return new Date().getFullYear();
  }

  public generateBirthYears(): number[] {
    let count = AthleteSettingsComponent.BIRTH_YEARS_COUNT;
    const curYear = new Date().getFullYear();
    count++;
    return [...Array(count).keys()].map(i => i + (curYear - count)).reverse();
  }

  private setupSportsCategories(): void {
    this.sportsCategories = [
      {
        label: "Usual Sports",
        sportKeys: AthleteSettingsComponent.USUAL_SPORTS_CATEGORY
      },
      {
        label: "Others Sports",
        sportKeys: _.difference(
          _.keys(ElevateSport) as ElevateSport[],
          AthleteSettingsComponent.USUAL_SPORTS_CATEGORY,
          AthleteSettingsComponent.HIDDEN_SPORTS_CATEGORY
        )
      }
    ];
  }
}
