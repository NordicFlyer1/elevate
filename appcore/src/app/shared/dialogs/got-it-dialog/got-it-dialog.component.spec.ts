import { ComponentFixture, TestBed } from "@angular/core/testing";
import { GotItDialogComponent } from "./got-it-dialog.component";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { SharedModule } from "../../shared.module";
import { CoreModule } from "../../../core/core.module";
import { GotItDialogDataModel } from "./got-it-dialog-data.model";
import { TargetModule } from "../../modules/target/desktop-target.module";

describe("GotItDialogComponent", () => {
  const dialogTitle = "Hello World";
  const dialogContent = "Oh my god !";

  let component: GotItDialogComponent;
  let fixture: ComponentFixture<GotItDialogComponent>;
  let gotItDialogDataModel: GotItDialogDataModel;

  beforeEach(done => {
    gotItDialogDataModel = new GotItDialogDataModel(dialogTitle, dialogContent);
    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: gotItDialogDataModel
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
    fixture = TestBed.createComponent(GotItDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    done();
  });

  it("should create", done => {
    expect(component).toBeTruthy();
    done();
  });

  it("should render the 'got-it' dialog", done => {
    // Given
    const compiled = fixture.debugElement.nativeElement;

    // When
    fixture.detectChanges();

    // Then
    expect(component.dialogData.title).toEqual(gotItDialogDataModel.title);
    expect(component.dialogData.content).toEqual(gotItDialogDataModel.content);
    expect(compiled.querySelector("h2").textContent).toContain(dialogTitle);
    expect(compiled.querySelector("mat-dialog-content").textContent).toContain(dialogContent);
    done();
  });
});
