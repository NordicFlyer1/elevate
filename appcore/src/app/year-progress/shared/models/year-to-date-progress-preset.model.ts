import _ from "lodash";
import { ProgressType } from "../enums/progress-type.enum";
import { ProgressMode } from "../enums/progress-mode.enum";
import { ElevateSport } from "@elevate/shared/enums/elevate-sport.enum";
import { Identifier } from "@elevate/shared/tools/identifier";

export class YearToDateProgressPresetModel {
  public readonly mode: ProgressMode = ProgressMode.YEAR_TO_DATE;
  public id: string;
  public progressType: ProgressType;
  public activityTypes: ElevateSport[];
  public includeCommuteRide: boolean;
  public includeIndoorRide: boolean;
  public targetValue?: number;

  constructor(
    progressType: ProgressType,
    activityTypes: ElevateSport[],
    includeCommuteRide: boolean,
    includeIndoorRide: boolean,
    targetValue?: number
  ) {
    this.id = Identifier.generate();
    this.progressType = progressType;
    this.activityTypes = activityTypes;
    this.includeCommuteRide = includeCommuteRide;
    this.includeIndoorRide = includeIndoorRide;
    this.targetValue = _.isNumber(targetValue) && targetValue > 0 ? targetValue : null;
  }
}
