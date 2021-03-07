import { ComponentFixture, TestBed } from "@angular/core/testing";

import { StravaConnectorComponent } from "./strava-connector.component";
import { CoreModule } from "../../core/core.module";
import { SharedModule } from "../../shared/shared.module";
import { DataStore } from "../../shared/data-store/data-store";
import { TestingDataStore } from "../../shared/data-store/testing-datastore.service";
import { TargetBootModule } from "../../boot/desktop-boot.module";
import { TargetModule } from "../../shared/modules/target/desktop-target.module";
import { IPC_TUNNEL_SERVICE } from "../../desktop/ipc/ipc-tunnel-service.token";
import { IpcRendererTunnelServiceMock } from "../../desktop/ipc/ipc-renderer-tunnel-service.mock";

describe("StravaConnectorComponent", () => {
  let component: StravaConnectorComponent;
  let fixture: ComponentFixture<StravaConnectorComponent>;

  beforeEach(done => {
    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetBootModule, TargetModule],
      providers: [
        { provide: DataStore, useClass: TestingDataStore },
        { provide: IPC_TUNNEL_SERVICE, useClass: IpcRendererTunnelServiceMock }
      ]
    }).compileComponents();
    done();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StravaConnectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
