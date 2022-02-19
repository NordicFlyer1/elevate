import Loki from "lokijs";
import { Inject, Injectable } from "@angular/core";
import { DataStore } from "./data-store";
import { LoggerService } from "../services/logging/logger.service";
import { AppUsageDetails } from "../models/app-usage-details.model";

@Injectable()
export class TestingDataStore<T extends {}> extends DataStore<T> {
  constructor(@Inject(LoggerService) protected readonly logger: LoggerService) {
    super(logger);
  }

  public getPersistenceAdapter(): LokiPersistenceAdapter {
    return new Loki.LokiMemoryAdapter(); // Use memory persistence for testing;
  }

  public getAppUsageDetails(): Promise<AppUsageDetails> {
    return Promise.resolve(null);
  }
}
