import _ from "lodash";
import { AbstractDataView } from "./abstract-data.view";
import { ActivityInfoModel } from "@elevate/shared/models/activity-data/activity-info.model";
import { Time } from "@elevate/shared/tools/time";

export class HeaderView extends AbstractDataView {
  protected activityInfo: ActivityInfoModel;

  constructor(activityInfo: ActivityInfoModel) {
    super(null);
    this.activityInfo = activityInfo;
  }

  public render(): void {
    let detail: string;
    if (this.isSegmentEffortView && !_.isEmpty(this.activityInfo.segmentEffort)) {
      // Segment effort only
      detail =
        "SEGMENT EFFORT on <i>&lt;" +
        this.activityInfo.segmentEffort.name +
        "&gt;</i> // TIME " +
        Time.secToMilitary(this.activityInfo.segmentEffort.elapsedTimeSec);
    } else {
      // Complete activity
      detail = "ACTIVITY <i>&lt;" + this.activityInfo.name + "&gt;</i>";
    }

    this.content +=
      "<div style='width:100%; margin-left: 10px; margin-top: 10px; margin-bottom: 5px;font-size: 14px;'>";
    this.content +=
      "   <div style='display: inline;'><img style='width:30px' src='" + this.appResources.logoNoText + "'/></div>";
    this.content += "   <div style='display: inline;'>" + detail + "</div>";
    this.content += "   <div style='display: inline; margin-right: 10px;'>";
    this.content +=
      "       <a href='" +
      this.appResources.settingsLink +
      "#/donate' target='_blank' class=\"btn btn-sm btn-primary\" style='position: initial;' '>Do you like this stuff?</a>";
    this.content += "   </div>";
    this.content += "</div>";
    this.content += '<hr style="margin: 10px 0;"/>';
  }

  public displayGraph(): void {}

  protected insertDataIntoGrid(): void {}
}
