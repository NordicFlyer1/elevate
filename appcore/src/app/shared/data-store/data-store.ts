import { AppUsageDetails } from "../models/app-usage-details.model";
import { CollectionDef } from "./collection-def";
import { ReplaySubject } from "rxjs";
import _ from "lodash";
import { LoggerService } from "../services/logging/logger.service";
import Loki from "lokijs";
import { Inject } from "@angular/core";
import semver from "semver/preload";
import { environment } from "../../../environments/environment";

export enum DbEvent {
  AUTO_LOADED,
  AUTO_SAVED
}

export abstract class DataStore<T extends {}> {
  protected constructor(@Inject(LoggerService) protected readonly logger: LoggerService) {
    this.initDatabase();
  }

  private static readonly DATABASE_NAME = "elevate";
  private static readonly SAVE_DEBOUNCE_WAIT_MS = 1000;
  private static readonly DEFAULT_LOKI_ID_FIELD = "$loki";
  private static readonly DEFAULT_LOKI_META_FIELD = "meta";
  public db: LokiConstructor;
  public dbEvent$: ReplaySubject<DbEvent>;
  private COLLECTIONS_MAP: Map<string, Collection<T>>;
  private saveDatabaseDebounce: () => void;

  public static isBackupCompatible(dumpVersion): boolean {
    return semver.gte(dumpVersion, this.getMinBackupVersion()) || environment.skipRestoreSyncedBackupCheck;
  }

  public static getMinBackupVersion(): string {
    return environment.minBackupVersion;
  }

  public static cleanDbObject<T>(dbObj: LokiQuery<T & LokiObj>): T {
    delete dbObj[DataStore.DEFAULT_LOKI_ID_FIELD];
    delete dbObj[DataStore.DEFAULT_LOKI_META_FIELD];
    return dbObj as T;
  }

  public static cleanDbCollection<T>(dbObjs: LokiQuery<T & LokiObj>[]): T[] {
    return dbObjs.map(dbObj => {
      return DataStore.cleanDbObject(dbObj);
    });
  }

  protected initDatabase(): void {
    this.dbEvent$ = new ReplaySubject<DbEvent>();
    this.db = new Loki(DataStore.DATABASE_NAME, this.getDbOptions());
    this.COLLECTIONS_MAP = new Map<string, Collection<T>>();

    this.saveDatabaseDebounce = _.debounce(
      () =>
        this.db.saveDatabase(err => {
          if (err) {
            this.logger.error("Datastore save error: ", err);
          } else {
            this.logger.debug("Datastore Saved!");
          }
        }),
      DataStore.SAVE_DEBOUNCE_WAIT_MS,
      { leading: true }
    );
  }

  public abstract getPersistenceAdapter(): LokiPersistenceAdapter;

  public abstract getAppUsageDetails(): Promise<AppUsageDetails>;

  public getDbOptions(): Partial<LokiConstructorOptions> &
    Partial<LokiConfigOptions> &
    Partial<ThrottledSaveDrainOptions> {
    return {
      adapter: this.getPersistenceAdapter(),
      env: "BROWSER",
      autosave: false,
      autoload: true,
      throttledSaves: false,
      autoloadCallback: err => this.onAutoLoadDone(err),
      autosaveCallback: () => this.onAutoSaveDone()
    };
  }

  public resolveCollection(collectionDef: CollectionDef<T>): Collection<T> {
    // Is collection already tracked?
    let collection = this.COLLECTIONS_MAP.get(collectionDef.name);

    // If yes use it if collection not dirty
    if (collection && !collection.dirty) {
      return collection;
    }

    // Else try to get it from database through lokijs
    collection = this.db.getCollection(collectionDef.name);

    // If missing collection then create it...
    if (!collection) {
      collection = this.db.addCollection(collectionDef.name, collectionDef.options);
    }

    // Make indexes are applied
    const indices = collectionDef.options?.indices as (keyof T)[];
    if (indices && indices.length) {
      indices.forEach(field => collection.ensureIndex(field, true));
    }

    // If unique fields apply them
    if (collectionDef.options && collectionDef.options.unique && collectionDef.options.unique.length) {
      collectionDef.options.unique.forEach(field => collection.ensureUniqueIndex(field));
    }

    // Track collection
    this.COLLECTIONS_MAP.set(collectionDef.name, collection);

    return collection;
  }

  public find(
    collectionDef: CollectionDef<T>,
    defaultStorageValue: T[],
    query?: LokiQuery<T & LokiObj>,
    sort?: { propName: keyof T; options: Partial<SimplesortOptions> }
  ): Promise<T[]> {
    const collection = this.resolveCollection(collectionDef);

    // Find document on current collection
    const resultSet = collection.chain().find(query);

    // Sort along property if given
    if (sort && sort.propName && sort.options) {
      resultSet.simplesort(sort.propName, sort.options);
    }

    return Promise.resolve(resultSet.data());
  }

  public findOne(collectionDef: CollectionDef<T>, defaultStorageValue: T, query: LokiQuery<T & LokiObj>): Promise<T> {
    const collection = this.resolveCollection(collectionDef);

    // Find document on current collection
    const doc = collection.findOne(query);

    // If doc is missing then save and return default value
    if (!doc) {
      const insertedDefaultDoc = collection.insert(defaultStorageValue);
      return Promise.resolve(insertedDefaultDoc);
    }

    return Promise.resolve(doc);
  }

  public update(collectionDef: CollectionDef<T>, doc: T, persistImmediately: boolean): Promise<T> {
    const updatedDoc = this.resolveCollection(collectionDef).update(doc);

    const updatePromise = Promise.resolve(updatedDoc);

    return this.persist(persistImmediately).then(() => {
      return updatePromise;
    });
  }

  public updateMany(collectionDef: CollectionDef<T>, docs: T[], persistImmediately: boolean): Promise<void> {
    this.resolveCollection(collectionDef).update(docs);

    return this.persist(persistImmediately);
  }

  public insert(collectionDef: CollectionDef<T>, doc: T, persistImmediately: boolean): Promise<T> {
    const insertedDoc = this.resolveCollection(collectionDef).insert(doc);

    const insertedPromise = Promise.resolve(insertedDoc);

    return this.persist(persistImmediately).then(() => {
      return insertedPromise;
    });
  }

  public insertMany(collectionDef: CollectionDef<T>, docs: T[], persistImmediately: boolean): Promise<void> {
    this.resolveCollection(collectionDef).insert(docs);

    return this.persist(persistImmediately);
  }

  public put(collectionDef: CollectionDef<T>, doc: T, persistImmediately: boolean): Promise<T> {
    let putPromise;

    const collection = this.resolveCollection(collectionDef);

    // Resolve unique collection index value
    const idField = this.extractDefaultFieldId(collection);

    // Format query and exec query
    const query: any = {};
    query[idField] = (doc as any)[idField];

    // Exec query
    const existingDoc = collection.findOne(query);

    if (existingDoc) {
      const updatedDoc = _.assign(existingDoc, doc);
      putPromise = this.update(collectionDef, updatedDoc, persistImmediately);
    } else {
      // The doc don't exists. Do a create.
      putPromise = this.insert(collectionDef, doc, persistImmediately);
    }

    return putPromise;
  }

  public getById(collectionDef: CollectionDef<T>, id: number | string): Promise<T> {
    const collection = this.resolveCollection(collectionDef);

    // Resolve unique field on which we will perform the request
    const idField = this.extractDefaultFieldId(collection);

    // Format query
    const query: any = {};
    query[idField] = id;

    return Promise.resolve(collection.findOne(query) as T);
  }

  public remove(collectionDef: CollectionDef<T>, doc: T, persistImmediately: boolean): Promise<void> {
    this.resolveCollection(collectionDef).remove(doc);

    return this.persist(persistImmediately);
  }

  public removeById(collectionDef: CollectionDef<T>, id: number | string, persistImmediately: boolean): Promise<void> {
    const collection = this.resolveCollection(collectionDef);

    // Resolve unique field on which we will perform the request
    const idField = this.extractDefaultFieldId(collection);

    // Format query
    const query: any = {};
    query[idField] = id;

    collection.removeWhere(query);

    return this.persist(persistImmediately);
  }

  public removeByManyIds(
    collectionDef: CollectionDef<T>,
    ids: (number | string)[],
    persistImmediately: boolean
  ): Promise<void> {
    const collection = this.resolveCollection(collectionDef);

    // Resolve unique field on which we will perform the request
    const idField = this.extractDefaultFieldId(collection);

    // Format query
    const query: any = {};
    query[idField] = { $in: ids };

    collection.removeWhere(query);

    return this.persist(persistImmediately);
  }

  public count(collectionDef: CollectionDef<T>, query?: LokiQuery<T & LokiObj>): Promise<number> {
    const count = this.resolveCollection(collectionDef).count(query);
    return Promise.resolve(count);
  }

  public clear(collectionDef: CollectionDef<T>, persistImmediately: boolean): Promise<void> {
    this.resolveCollection(collectionDef).clear();
    return persistImmediately ? this.persist(persistImmediately) : Promise.resolve();
  }

  /**
   * Force persistence of data store
   */
  public persist(persistImmediately: boolean): Promise<void> {
    this.logger.debug("Save datastore requested");

    if (persistImmediately) {
      return new Promise<void>((resolve, reject) => {
        // Force save database to persistence adapter
        this.db.saveDatabase(err => {
          if (err) {
            this.logger.error("Datastore save error: ", err);
            reject(err);
          } else {
            this.logger.debug("Datastore Saved!");
            resolve();
          }
        });
      });
    }

    // Debounce safe instead
    this.saveDatabaseDebounce();

    return Promise.resolve();
  }

  public saveNow(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Force save database to persistence adapter
      this.db.saveDatabase(err => {
        if (err) {
          this.logger.error("Datastore save error: ", err);
          reject(err);
        } else {
          this.logger.debug("Datastore saved");
          resolve();
        }
      });
    });
  }

  public reload(options?: Partial<ThrottledSaveDrainOptions>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.loadDatabase(options, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  protected onAutoLoadDone(err: Error): void {
    if (err) {
      // Broadcast database error
      this.dbEvent$.error(err);
      this.logger.error(err);
    } else {
      // Broadcast database auto loaded event
      this.dbEvent$.next(DbEvent.AUTO_LOADED);

      // Allow access to database directly from window for debugging
      (window as any).db = this.db;

      // Allow access to collection data directly from window for debugging
      if (!environment.production) {
        (window as any).data = {};
        this.db.collections.forEach(collection => {
          (window as any).data[collection.name] = collection.data;
        });
      }
    }
  }

  protected onAutoSaveDone(): void {
    this.logger.debug("Database saved automatically");
    this.dbEvent$.next(DbEvent.AUTO_SAVED);
  }

  private extractDefaultFieldId(collection: Collection<T>): keyof T | "$loki" {
    const defaultIndex = collection.uniqueNames[0];
    if (defaultIndex) {
      return defaultIndex;
    }
    return DataStore.DEFAULT_LOKI_ID_FIELD;
  }
}
