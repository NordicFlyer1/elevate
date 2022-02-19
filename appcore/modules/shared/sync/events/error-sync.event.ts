import { SyncEventType } from "./sync-event-type";
import { SyncEvent } from "./sync.event";
import moment from "moment";
import { ConnectorType } from "../connectors/connector-type.enum";
import { BareActivity } from "../../models/sync/bare-activity.model";
import { Activity } from "../../models/sync/activity.model";

/**
 * TODO Create dedicated sub-classes for all errors.
 * TODO Rework/Cleanup/Merge SyncException+SyncEvent or "extends SyncException implements SyncEvent"
 * TODO The sub-classes have to be exceptions
 */
export class ErrorSyncEvent extends SyncEvent {
  public static UNHANDLED_ERROR_SYNC = {
    code: "UNHANDLED_ERROR_SYNC",
    create: (fromConnectorType: ConnectorType, description: string): ErrorSyncEvent => {
      return new ErrorSyncEvent(fromConnectorType, {
        code: ErrorSyncEvent.UNHANDLED_ERROR_SYNC.code,
        description: description,
        sourceError: null
      });
    }
  };

  public static MULTIPLE_ACTIVITIES_FOUND = {
    code: "MULTIPLE_ACTIVITIES_FOUND",
    create: (
      fromConnectorType: ConnectorType,
      activityInfo: string,
      from: Date,
      to: Date,
      othersActivitiesInfo: string[]
    ): ErrorSyncEvent => {
      return new ErrorSyncEvent(fromConnectorType, {
        code: ErrorSyncEvent.MULTIPLE_ACTIVITIES_FOUND.code,
        description: `Cannot handle activity <${activityInfo} from ${moment(from).format("LLL")} to ${moment(to).format(
          "LLL"
        )}> because of existing overlapping activities: ${othersActivitiesInfo.join(" & ")}`,
        sourceError: null
      });
    }
  };

  public static SYNC_ERROR_COMPUTE = {
    code: "SYNC_ERROR_COMPUTE",
    create: (
      fromConnectorType: ConnectorType,
      description: string,
      activity: BareActivity = null,
      sourceError: Error = null
    ): ErrorSyncEvent => {
      return new ErrorSyncEvent(
        fromConnectorType,
        {
          code: ErrorSyncEvent.SYNC_ERROR_COMPUTE.code,
          description: description,
          sourceError: sourceError
        },
        activity
      );
    }
  };

  public static SYNC_ALREADY_STARTED = {
    code: "SYNC_ALREADY_STARTED",
    create: (
      fromConnectorType: ConnectorType,
      description: string = null,
      sourceError: Error = null
    ): ErrorSyncEvent => {
      return new ErrorSyncEvent(fromConnectorType, {
        code: ErrorSyncEvent.SYNC_ALREADY_STARTED.code,
        description: description,
        sourceError: sourceError
      });
    }
  };

  public static SYNC_ERROR_UPSERT_ACTIVITY_DATABASE = {
    code: "SYNC_ERROR_UPSERT_ACTIVITY_DATABASE",
    create: (fromConnectorType: ConnectorType, activity: Activity, sourceError: Error = null): ErrorSyncEvent => {
      const errorSyncEvent = new ErrorSyncEvent(fromConnectorType, {
        code: ErrorSyncEvent.SYNC_ERROR_UPSERT_ACTIVITY_DATABASE.code,
        description: `Unable to save the new activity "${activity.name}" on date "${activity.startTime}" into database.`,
        sourceError: sourceError
      });
      errorSyncEvent.activity = activity;
      return errorSyncEvent;
    }
  };

  public static STRAVA_API_UNAUTHORIZED = {
    code: "STRAVA_API_UNAUTHORIZED",
    create: (): ErrorSyncEvent => {
      return new ErrorSyncEvent(ConnectorType.STRAVA, {
        code: ErrorSyncEvent.STRAVA_API_UNAUTHORIZED.code,
        description: `Unauthorized call to Strava api`,
        sourceError: null
      });
    }
  };

  public static STRAVA_API_FORBIDDEN = {
    code: "STRAVA_API_FORBIDDEN",
    create: (): ErrorSyncEvent => {
      return new ErrorSyncEvent(ConnectorType.STRAVA, {
        code: ErrorSyncEvent.STRAVA_API_FORBIDDEN.code,
        description: `Unauthorized call to Strava api`,
        sourceError: null
      });
    }
  };

  public static STRAVA_INSTANT_QUOTA_REACHED = {
    code: "STRAVA_INSTANT_QUOTA_REACHED",
    create: (usage: number, limit: number): ErrorSyncEvent => {
      return new ErrorSyncEvent(ConnectorType.STRAVA, {
        code: ErrorSyncEvent.STRAVA_INSTANT_QUOTA_REACHED.code,
        description: `The instant strava api calls have been reached: ${usage} calls performed for a limit of ${limit} each 15 minutes. Wait 20 minutes and retry.`,
        sourceError: null
      });
    }
  };

  public static STRAVA_DAILY_QUOTA_REACHED = {
    code: "STRAVA_DAILY_QUOTA_REACHED",
    create: (usage: number, limit: number): ErrorSyncEvent => {
      return new ErrorSyncEvent(ConnectorType.STRAVA, {
        code: ErrorSyncEvent.STRAVA_DAILY_QUOTA_REACHED.code,
        description: `The instant strava api calls have been reached for today: ${usage} calls performed for a limit of ${limit} per day. Please retry tomorrow.`,
        sourceError: null
      });
    }
  };

  public static STRAVA_API_RESOURCE_NOT_FOUND = {
    code: "STRAVA_API_RESOURCE_NOT_FOUND",
    create: (url: string): ErrorSyncEvent => {
      return new ErrorSyncEvent(ConnectorType.STRAVA, {
        code: ErrorSyncEvent.STRAVA_API_RESOURCE_NOT_FOUND.code,
        description: `Resource not found at url: '${url}'`,
        sourceError: null
      });
    }
  };

  public static STRAVA_API_TIMEOUT = {
    code: "STRAVA_API_TIMEOUT",
    create: (url: string): ErrorSyncEvent => {
      return new ErrorSyncEvent(ConnectorType.STRAVA, {
        code: ErrorSyncEvent.STRAVA_API_TIMEOUT.code,
        description: `Request Timeout at url: '${url}'`,
        sourceError: null
      });
    }
  };

  public static FS_SOURCE_DIRECTORY_DONT_EXISTS = {
    code: "FS_SOURCE_DIRECTORY_DONT_EXISTS",
    create: (sourceDirectory: string, sourceError: Error = null): ErrorSyncEvent => {
      return new ErrorSyncEvent(ConnectorType.FILE, {
        code: ErrorSyncEvent.FS_SOURCE_DIRECTORY_DONT_EXISTS.code,
        description: "Source directory '" + sourceDirectory + "' do not exists",
        sourceError: sourceError
      });
    }
  };

  public readonly code: string;
  public readonly details: string;
  public readonly stack: string;
  public activity?: BareActivity;

  constructor(
    fromConnectorType: ConnectorType,
    errorDetails: { code: string; description: string; sourceError: Error },
    activity: BareActivity = null
  ) {
    super(SyncEventType.ERROR, fromConnectorType, errorDetails.description);
    this.code = errorDetails.code ? errorDetails.code : null;
    this.details = errorDetails.sourceError ? errorDetails.sourceError.message : null;
    this.stack = errorDetails.sourceError ? JSON.stringify(errorDetails.sourceError.stack) : null;
    this.activity = activity;
  }
}
