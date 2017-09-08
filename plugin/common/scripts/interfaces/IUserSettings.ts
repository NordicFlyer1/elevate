import {IZone} from "./IActivityData";

export interface IUserSettings {
    autoSyncMinutes: number;
    localStorageMustBeCleared: boolean;
    userGender: string;
    userMaxHr: number;
    userRestHr: number;
    userFTP: number;
    userSwimFTP: number;
    userWeight: number;
    zones: {
        speed: IZone[];
        pace: IZone[];
        heartRate: IZone[];
        power: IZone[];
        runningPower: IZone[];
        cyclingCadence: IZone[];
        runningCadence: IZone[];
        grade: IZone[];
        elevation: IZone[];
        ascent: IZone[];
    };
    targetsYearRide: number;
    targetsYearRun: number;
    remoteLinks: boolean;
    feedAutoScroll: boolean;
    defaultLeaderBoardFilter: string;
    activateRunningGradeAdjustedPace: boolean;
    activateRunningHeartRate: boolean;
    activateRunningCadence: boolean;
    activateRunningTemperature: boolean;
    activityStravaMapType: string;
    displaySegmentRankPercentage: boolean;
    displayNearbySegments: boolean;
    displayMotivationScore: boolean;
    displayActivityRatio: boolean;
    displayAdvancedPowerData: boolean;
    displayAdvancedSpeedData: boolean;
    displayAdvancedHrData: boolean;
    displayCadenceData: boolean;
    displayAdvancedGradeData: boolean;
    displayAdvancedElevationData: boolean;
    displayBikeOdoInActivity: boolean;
    enableBothLegsCadence: boolean;
    feedHideChallenges: boolean;
    feedHideCreatedRoutes: boolean;
    feedHideSuggestedAthletes: boolean;
    feedHideVirtualRides: boolean;
    feedHideRideActivitiesUnderDistance: number;
    feedHideRunActivitiesUnderDistance: number;
    displaySegmentTimeComparisonToKOM: boolean;
    displaySegmentTimeComparisonToPR: boolean;
    displaySegmentTimeComparisonToCurrentYearPR: boolean;
    displaySegmentTimeComparisonPosition: boolean;
    displayExtendedGoals: boolean;
    reviveGoogleMaps: boolean;
    displayRecentEffortsHRAdjustedPacePower: boolean;
    reviveGoogleMapsLayerType: string;
    displayActivityBestSplits: boolean;
    bestSplitsConfiguration: any; // TODO Type this !
    temperatureUnit: string;
    windUnit: string;
    showHiddenBetaFeatures: boolean;
    displayReliveCCLink: boolean;
}
