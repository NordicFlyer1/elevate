import { AthleteSnapshot } from "@elevate/shared/models/athlete/athlete-snapshot.model";

export class DayStressModel {
  public ids: (string | number)[];
  public date: Date;
  public timestamp: number;
  public types: string[];
  public activitiesName: string[];
  public athleteSnapshot: AthleteSnapshot;

  public heartRateStressScore?: number = null;
  public trainingImpulseScore?: number = null;
  public powerStressScore?: number = null;
  public runningStressScore?: number = null;
  public swimStressScore?: number = null;

  public finalStressScore: number = null;
  public previewDay: boolean;

  constructor(date: Date, previewDay: boolean) {
    this.ids = [];
    this.date = date;
    this.timestamp = date.getTime();
    this.types = [];
    this.activitiesName = [];
    this.previewDay = previewDay;
  }

  public printHeartRateStressScore(): string {
    return this.heartRateStressScore ? Math.round(this.heartRateStressScore).toString() : "-";
  }

  public printTrainingImpulseScore(): string {
    return this.trainingImpulseScore ? Math.round(this.trainingImpulseScore).toString() : "-";
  }

  public printPowerStressScore(): string {
    return this.powerStressScore ? Math.round(this.powerStressScore).toString() : "-";
  }

  public printRunningStressScore(): string {
    return this.runningStressScore ? Math.round(this.runningStressScore).toString() : "-";
  }

  public printSwimStressScore(): string {
    return this.swimStressScore ? Math.round(this.swimStressScore).toString() : "-";
  }

  public printFinalStressScore(): string {
    return this.finalStressScore ? Math.round(this.finalStressScore).toString() : "-";
  }
}
