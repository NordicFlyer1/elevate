import { TestBed } from "@angular/core/testing";
import { StreamsService } from "./streams.service";
import { CoreModule } from "../../../core/core.module";
import { SharedModule } from "../../shared.module";
import { DataStore } from "../../data-store/data-store";
import { TestingDataStore } from "../../data-store/testing-datastore.service";
import { TargetModule } from "../../modules/target/desktop-target.module";

describe("StreamsService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CoreModule, SharedModule, TargetModule],
      providers: [{ provide: DataStore, useClass: TestingDataStore }]
    });
  });

  it("should be created", () => {
    const service: StreamsService = TestBed.inject(StreamsService);
    expect(service).toBeTruthy();
  });
});
