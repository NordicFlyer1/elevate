import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FitnessInfoDialogComponent } from "./fitness-info-dialog.component";
import { CoreModule } from "../../core/core.module";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { SharedModule } from "../../shared/shared.module";
import { FitnessTrendModule } from "../fitness-trend.module";
import { TargetModule } from "../../shared/modules/target/desktop-target.module";

describe("FitnessInfoDialogComponent", () => {
  let component: FitnessInfoDialogComponent;
  let fixture: ComponentFixture<FitnessInfoDialogComponent>;

  beforeEach(done => {
    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetModule, FitnessTrendModule],
      declarations: [],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {}
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
    fixture = TestBed.createComponent(FitnessInfoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    done();
  });

  it("should create", done => {
    // Given, When
    const compiled = fixture.debugElement.nativeElement;
    const htmlContent = compiled.querySelector("mat-dialog-content").textContent;

    // Then
    expect(component).toBeTruthy();
    expect(htmlContent).not.toBeNull();
    done();
  });
});
