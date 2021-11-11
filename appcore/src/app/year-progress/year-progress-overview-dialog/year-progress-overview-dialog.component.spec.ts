import { ComponentFixture, TestBed } from "@angular/core/testing";
import { YearProgressOverviewDialogComponent } from "./year-progress-overview-dialog.component";
import { YearProgressModule } from "../year-progress.module";
import { CoreModule } from "../../core/core.module";
import { SharedModule } from "../../shared/shared.module";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { YearProgressForOverviewModel } from "../shared/models/year-progress-for-overview.model";
import { YearProgressStyleModel } from "../year-progress-graph/models/year-progress-style.model";
import moment from "moment";
import { YearToDateProgressConfigModel } from "../shared/models/year-to-date-progress-config.model";
import { TargetModule } from "../../shared/modules/target/desktop-target.module";
import { ElevateSport } from "@elevate/shared/enums/elevate-sport.enum";

describe("YearProgressOverviewDialogComponent", () => {
  let component: YearProgressOverviewDialogComponent;
  let fixture: ComponentFixture<YearProgressOverviewDialogComponent>;

  const yearsColorsMap = new Map<number, string>();
  yearsColorsMap.set(2015, "red");
  yearsColorsMap.set(2016, "blue");
  yearsColorsMap.set(2017, "green");
  yearsColorsMap.set(2018, "purple");
  const colors: string[] = ["red", "blue", "green", "purple"];

  const yearProgressForOverviewModel: YearProgressForOverviewModel = {
    progressConfig: new YearToDateProgressConfigModel([ElevateSport.Ride, ElevateSport.Run], true, true),
    momentWatched: moment(),
    selectedYears: [2017, 2016],
    yearProgressStyleModel: new YearProgressStyleModel(yearsColorsMap, colors),
    yearProgressions: [],
    progressTypes: []
  };

  beforeEach(done => {
    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetModule, YearProgressModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: yearProgressForOverviewModel
        },
        {
          provide: MatDialogRef,
          useValue: {}
        }
      ]
    }).compileComponents();

    done();
  });

  beforeEach(done => {
    fixture = TestBed.createComponent(YearProgressOverviewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    done();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
