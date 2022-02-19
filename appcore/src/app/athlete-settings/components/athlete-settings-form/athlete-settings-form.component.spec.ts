import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AthleteSettingsFormComponent } from "./athlete-settings-form.component";
import _ from "lodash";
import { CoreModule } from "../../../core/core.module";
import { SharedModule } from "../../../shared/shared.module";
import { AthleteSettingsModule } from "../../athlete-settings.module";
import { UserSettingsService } from "../../../shared/services/user-settings/user-settings.service";
import { DataStore } from "../../../shared/data-store/data-store";
import { TestingDataStore } from "../../../shared/data-store/testing-datastore.service";
import { TargetModule } from "../../../shared/modules/target/desktop-target.module";
import { IPC_TUNNEL_SERVICE } from "../../../desktop/ipc/ipc-tunnel-service.token";
import { IpcRendererTunnelServiceMock } from "../../../desktop/ipc/ipc-renderer-tunnel-service.mock";
import { UserSettings } from "@elevate/shared/models/user-settings/user-settings.namespace";
import { AthleteSettings } from "@elevate/shared/models/athlete/athlete-settings/athlete-settings.model";
import { MeasureSystem } from "@elevate/shared/enums/measure-system.enum";
import DesktopUserSettings = UserSettings.DesktopUserSettings;

describe("AthleteSettingsFormComponent", () => {
  let component: AthleteSettingsFormComponent;
  let fixture: ComponentFixture<AthleteSettingsFormComponent>;
  let userSettingsService: UserSettingsService;

  beforeEach(done => {
    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetModule, AthleteSettingsModule],
      providers: [
        { provide: DataStore, useClass: TestingDataStore },
        { provide: IPC_TUNNEL_SERVICE, useClass: IpcRendererTunnelServiceMock }
      ]
    }).compileComponents();

    userSettingsService = TestBed.inject(UserSettingsService);
    spyOn(userSettingsService, "fetch").and.returnValue(
      Promise.resolve(_.cloneDeep(DesktopUserSettings.DEFAULT_MODEL))
    );

    done();
  });

  beforeEach(done => {
    fixture = TestBed.createComponent(AthleteSettingsFormComponent);
    component = fixture.componentInstance;
    component.athleteSettingsModel = _.cloneDeep(AthleteSettings.DEFAULT_MODEL);
    fixture.detectChanges();

    done();
  });

  it("should create", done => {
    expect(component).toBeTruthy();
    done();
  });

  it("should convert runningFtp in seconds to pace using imperial system", done => {
    // Given
    component.athleteSettingsModel.runningFtp = 5 * 60; // 5 Minutes
    const expectedPace = "00:08:03/mi";

    // When
    const pace = component.convertToPace(MeasureSystem.IMPERIAL);

    // Then
    expect(pace).toEqual(expectedPace);
    done();
  });

  it("should convert runningFtp in seconds to pace using metric system", done => {
    // Given
    component.athleteSettingsModel.runningFtp = 5 * 60; // 5 Minutes
    const expectedPace = "00:05:00/km";

    // When
    const pace = component.convertToPace(MeasureSystem.METRIC);

    // Then
    expect(pace).toEqual(expectedPace);
    done();
  });
});
