import { ComponentFixture, TestBed } from "@angular/core/testing";
import { EditDatedAthleteSettingsDialogComponent } from "./edit-dated-athlete-settings-dialog.component";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { CoreModule } from "../../../core/core.module";
import { SharedModule } from "../../../shared/shared.module";
import { AthleteSettingsModule } from "../../athlete-settings.module";
import _ from "lodash";
import { DatedAthleteSettingsDialogData } from "./dated-athlete-settings-dialog-data.model";
import { DatedAthleteSettingsAction } from "./dated-athlete-settings-action.enum";
import { UserSettingsService } from "../../../shared/services/user-settings/user-settings.service";
import { DataStore } from "../../../shared/data-store/data-store";
import { TestingDataStore } from "../../../shared/data-store/testing-datastore.service";
import { TargetModule } from "../../../shared/modules/target/desktop-target.module";
import { UserSettings } from "@elevate/shared/models/user-settings/user-settings.namespace";
import { DatedAthleteSettings } from "@elevate/shared/models/athlete/athlete-settings/dated-athlete-settings.model";
import DesktopUserSettings = UserSettings.DesktopUserSettings;

describe("EditDatedAthleteSettingsDialogComponent", () => {
  let component: EditDatedAthleteSettingsDialogComponent;
  let fixture: ComponentFixture<EditDatedAthleteSettingsDialogComponent>;
  let userSettingsService: UserSettingsService;

  beforeEach(done => {
    const datedAthleteSettingsDialogData: DatedAthleteSettingsDialogData = {
      action: DatedAthleteSettingsAction.ACTION_ADD,
      datedAthleteSettings: DatedAthleteSettings.DEFAULT_MODEL
    };

    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetModule, AthleteSettingsModule],
      providers: [
        {
          provide: DataStore,
          useClass: TestingDataStore
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: datedAthleteSettingsDialogData
        },
        {
          provide: MatDialogRef,
          useValue: {}
        }
      ]
    }).compileComponents();

    userSettingsService = TestBed.inject(UserSettingsService);

    spyOn(userSettingsService, "fetch").and.returnValue(
      Promise.resolve(_.cloneDeep(DesktopUserSettings.DEFAULT_MODEL))
    );

    fixture = TestBed.createComponent(EditDatedAthleteSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    done();
  });

  it("should create", done => {
    expect(component).toBeTruthy();
    done();
  });
});
