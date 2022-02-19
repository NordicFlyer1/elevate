import _ from "lodash";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { SharedModule } from "../../shared/shared.module";
import { CoreModule } from "../../core/core.module";
import { FitnessTrendModule } from "../fitness-trend.module";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FitnessTrendComponent } from "../fitness-trend.component";
import { FitnessTrendConfigDialogData } from "../shared/models/fitness-trend-config-dialog-data.model";
import { FitnessTrendConfigDialogComponent } from "./fitness-trend-config-dialog.component";
import { TargetModule } from "../../shared/modules/target/desktop-target.module";

describe("FitnessTrendConfigDialogComponent", () => {
  let component: FitnessTrendConfigDialogComponent;
  let fixture: ComponentFixture<FitnessTrendConfigDialogComponent>;
  let fitnessTrendConfigDialogData: FitnessTrendConfigDialogData;

  beforeEach(done => {
    fitnessTrendConfigDialogData = {
      fitnessTrendConfigModel: FitnessTrendComponent.DEFAULT_CONFIG,
      lastFitnessActiveDate: new Date(),
      isPowerMeterEnabled: true
    };

    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetModule, FitnessTrendModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: fitnessTrendConfigDialogData
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
    fixture = TestBed.createComponent(FitnessTrendConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    done();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should handle ignore patterns formatting for storage", done => {
    // Given
    const userInputPatterns: string =
      "#tag_1\n" +
      "#tag_2\n" +
      "#tag_3 \n" + // Added space
      "#tag_4\n" +
      "#tag_5\r\n" + // combined carriage returns
      "#tag_6\n" +
      "#tag_6\n" + // Duplicate of previous
      "\n"; // Fake return

    // When
    const result: string[] = component.formatPatternsForStorage(userInputPatterns);

    // Then
    expect(result).not.toBeNull();
    expect(result.length).toEqual(6);
    expect(_.first(result)).toEqual("#tag_1");
    expect(_.last(result)).toEqual("#tag_6");
    expect(result[2]).toEqual("#tag_3");

    done();
  });

  it("should handle ignore patterns empty (1)", done => {
    // Given
    const userInputPatterns = " ";

    // When
    const result: string[] = component.formatPatternsForStorage(userInputPatterns);

    // Then
    expect(result).toBeNull();
    done();
  });

  it("should handle ignore patterns empty (2)", done => {
    // Given
    const userInputPatterns = "\n";

    // When
    const result: string[] = component.formatPatternsForStorage(userInputPatterns);

    // Then
    expect(result).toBeNull();
    done();
  });

  it("should handle ignore patterns empty (3)", done => {
    // Given
    const userInputPatterns = "";

    // When
    const result: string[] = component.formatPatternsForStorage(userInputPatterns);

    // Then
    expect(result).toBeNull();
    done();
  });

  it("should handle ignore patterns formatting for display", done => {
    // Given
    const patterns: string[] = ["#tag_1", "#tag_2"];
    const expectedResult = "#tag_1\n#tag_2";

    // When
    const result: string = component.formatPatternsForDisplay(patterns);

    // Then
    expect(result).not.toBeNull();
    expect(result).toEqual(expectedResult);
    done();
  });
});
