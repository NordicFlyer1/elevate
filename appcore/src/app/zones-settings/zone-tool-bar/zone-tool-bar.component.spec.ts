import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ZoneToolBarComponent } from "./zone-tool-bar.component";
import _ from "lodash";
import { CoreModule } from "../../core/core.module";
import { SharedModule } from "../../shared/shared.module";
import { ZoneDefinitionModel } from "../../shared/models/zone-definition.model";
import { UserSettingsService } from "../../shared/services/user-settings/user-settings.service";
import { DataStore } from "../../shared/data-store/data-store";
import { TestingDataStore } from "../../shared/data-store/testing-datastore.service";
import { TargetModule } from "../../shared/modules/target/desktop-target.module";
import { IpcRendererTunnelServiceMock } from "../../desktop/ipc/ipc-renderer-tunnel-service.mock";
import { IPC_TUNNEL_SERVICE } from "../../desktop/ipc/ipc-tunnel-service.token";
import { UserSettings } from "@elevate/shared/models/user-settings/user-settings.namespace";
import { ZoneType } from "@elevate/shared/enums/zone-type.enum";
import DesktopUserSettings = UserSettings.DesktopUserSettings;

describe("ZoneToolBarComponent", () => {
  let component: ZoneToolBarComponent;
  let fixture: ComponentFixture<ZoneToolBarComponent>;
  let userSettingsService: UserSettingsService;

  const zoneSpeedDefinition: ZoneDefinitionModel[] = [
    {
      name: "Cycling Speed",
      value: ZoneType.SPEED,
      units: "KPH",
      step: 0.1,
      min: 0,
      max: 9999,
      customDisplay: null
    },
    {
      name: "Heart Rate",
      value: ZoneType.HEART_RATE,
      units: "BPM",
      step: 1,
      min: 0,
      max: 9999,
      customDisplay: null
    }
  ];

  beforeEach(done => {
    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetModule],
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
    fixture = TestBed.createComponent(ZoneToolBarComponent);
    component = fixture.componentInstance;

    component.zoneDefinitions = _.clone(zoneSpeedDefinition);
    component.zoneDefinitionSelected = _.first(_.clone(zoneSpeedDefinition));
    component.zonesService.zoneDefinition = _.first(_.clone(zoneSpeedDefinition));

    fixture.detectChanges();
    done();
  });

  it("should create", done => {
    expect(component).toBeTruthy();
    done();
  });

  it("should call zone service on AddLastZone", done => {
    // Given
    const spy = spyOn(component.zonesService, "addLastZone").and.returnValue(Promise.resolve(null));
    const compiled = fixture.debugElement.nativeElement;

    // When
    compiled.querySelector("#addLastZone").click();

    // Then
    expect(spy).toHaveBeenCalledTimes(1);
    done();
  });

  it("should call zone service on RemoveLastZone", done => {
    // Given
    const spy = spyOn(component.zonesService, "removeLastZone").and.returnValue(Promise.resolve(null));
    const compiled = fixture.debugElement.nativeElement;

    // When
    compiled.querySelector("#removeLastZone").click();

    // Then
    expect(spy).toHaveBeenCalledTimes(1);
    done();
  });
});
