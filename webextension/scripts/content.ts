import _ from "lodash";
import { Loader } from "../modules/loader";
import { AppResourcesModel } from "./models/app-resources.model";
import { StartCoreDataModel } from "./models/start-core-data.model";
import { BrowserStorageType } from "./models/browser-storage-type.enum";
import { BrowserStorage } from "./browser-storage";
import { UserSettings } from "@elevate/shared/models/user-settings/user-settings.namespace";
import { CoreMessages } from "@elevate/shared/models/core-messages";
import ExtensionUserSettings = UserSettings.ExtensionUserSettings;

export class Content {
  public static loader: Loader = new Loader();

  protected appResources: AppResourcesModel;

  constructor(appResourcesModel: AppResourcesModel) {
    this.appResources = appResourcesModel;
  }

  public isExtensionRunnableInThisContext(): boolean {
    let isRunnable = true;

    // Eject if http://www.strava.com/routes/new OR http://www.strava.com/routes/XXXX/edit
    if (
      window.location.pathname.match(/^\/routes\/new/) ||
      window.location.pathname.match(/^\/routes\/(\d+)\/edit$/) ||
      window.location.pathname.match(/^\/about/) ||
      window.location.pathname.match(/^\/running-app/) ||
      window.location.pathname.match(/^\/features/) ||
      window.location.pathname.match(/^\/api/) ||
      window.location.pathname.match(/^\/premium/) ||
      window.location.pathname.match(/^\/gopremium/) ||
      window.location.pathname.match(/^\/store/) ||
      window.location.pathname.match(/^\/how-it-works/) ||
      window.location.pathname.match(/^\/careers/)
    ) {
      isRunnable = false;
    }

    // Do not run extension if user not logged
    if (document.body.classList.contains("is-home-page") || document.body.classList.contains("logged-out")) {
      isRunnable = false;
    }

    return isRunnable;
  }

  public start(): void {
    // Skip execution if needed
    if (!this.isExtensionRunnableInThisContext()) {
      console.log("Skipping Elevate chrome extension execution in this page");
      return;
    }

    BrowserStorage.getInstance()
      .get<ExtensionUserSettings>(BrowserStorageType.LOCAL, "userSettings", true)
      .then((userSettingsResult: ExtensionUserSettings) => {
        let userSettings: ExtensionUserSettings;

        const defaultUserSettingsData = ExtensionUserSettings.DEFAULT_MODEL;

        if (userSettingsResult) {
          userSettings = userSettingsResult;
        } else {
          userSettings = defaultUserSettingsData;
        }

        const defaultSettings = _.keys(defaultUserSettingsData);
        const syncedSettings = _.keys(userSettings);
        if (_.difference(defaultSettings, syncedSettings).length !== 0) {
          // If settings shape has changed
          _.defaults(userSettings, defaultUserSettingsData);
        }

        const startCoreData: StartCoreDataModel = {
          extensionId: chrome.runtime.id,
          userSettings: userSettings,
          appResources: this.appResources
        };

        // Inject jQuery as $
        Content.loader.injectJS("const $ = jQuery;");

        Content.loader.require(["extension/boot.bundle.js"], () => {
          this.emitStartCoreEvent(startCoreData);
        });
      });
  }

  protected emitStartCoreEvent(startCoreData: StartCoreDataModel) {
    const startCorePluginEvent: CustomEvent = new CustomEvent("Event");
    startCorePluginEvent.initCustomEvent(CoreMessages.ON_START_CORE_EVENT, true, true, startCoreData);
    dispatchEvent(startCorePluginEvent);
  }
}

export const appResources: AppResourcesModel = {
  settingsLink: chrome.extension.getURL("/app/index.html"),
  logoElevate: chrome.extension.getURL("/extension/icons/logo_elevate_no_circle.svg"),
  menuIconBlack: chrome.extension.getURL("/extension/icons/ic_menu_24px_black.svg"),
  menuIconOrange: chrome.extension.getURL("/extension/icons/ic_menu_24px_orange.svg"),
  remoteViewIcon: chrome.extension.getURL("/extension/icons/ic_open_in_new_24px.svg"),
  pollIcon: chrome.extension.getURL("/extension/icons/ic_poll_24px.svg"),
  helpIcon: chrome.extension.getURL("/extension/icons/ic_help_black_24px.svg"),
  veloviewerIcon: chrome.extension.getURL("/extension/icons/veloviewer.ico"),
  raceshapeIcon: chrome.extension.getURL("/extension/icons/raceshape.ico"),
  veloviewerDashboardIcon: chrome.extension.getURL("/extension/icons/ic_dashboard_24px.svg"),
  veloviewerChallengesIcon: chrome.extension.getURL("/extension/icons/ic_landscape_24px.svg"),
  labIcon: chrome.extension.getURL("/extension/icons/lab.png"),
  settingsIcon: chrome.extension.getURL("/extension/icons/ic_settings_24px.svg"),
  heartIcon: chrome.extension.getURL("/extension/icons/ic_favorite_24px.svg"),
  zonesIcon: chrome.extension.getURL("/extension/icons/ic_format_line_spacing_24px.svg"),
  komMapIcon: chrome.extension.getURL("/extension/icons/ic_looks_one_24px.svg"),
  heatmapIcon: chrome.extension.getURL("/extension/icons/ic_whatshot_24px.svg"),
  bugIcon: chrome.extension.getURL("/extension/icons/ic_bug_report_24px.svg"),
  rateIcon: chrome.extension.getURL("/extension/icons/ic_star_24px.svg"),
  aboutIcon: chrome.extension.getURL("/extension/icons/ic_info_outline_24px.svg"),
  peopleIcon: chrome.extension.getURL("/extension/icons/ic_supervisor_account_black_24px.svg"),
  eyeIcon: chrome.extension.getURL("/extension/icons/ic_remove_red_eye_24px.svg"),
  bikeIcon: chrome.extension.getURL("/extension/icons/ic_directions_bike_24px.svg"),
  mapIcon: chrome.extension.getURL("/extension/icons/ic_map_24px.svg"),
  wheatherIcon: chrome.extension.getURL("/extension/icons/ic_wb_sunny_24px.svg"),
  twitterIcon: chrome.extension.getURL("/extension/icons/twitter.svg"),
  systemUpdatesIcon: chrome.extension.getURL("/extension/icons/ic_system_update_24px.svg"),
  fitnessCenterIcon: chrome.extension.getURL("/extension/icons/ic_fitness_center_black_24px.svg"),
  timelineIcon: chrome.extension.getURL("/extension/icons/ic_timeline_black_24px.svg"),
  viewListIcon: chrome.extension.getURL("/extension/icons/baseline-view_list-24px.svg"),
  dateRange: chrome.extension.getURL("/extension/icons/ic_date_range_black_24px.svg"),
  athleteIcon: chrome.extension.getURL("/extension/icons/ic_accessibility_black_24px.svg"),
  donateIcon: chrome.extension.getURL("/extension/icons/ic_attach_money_24px.svg"),
  shareIcon: chrome.extension.getURL("/extension/icons/ic_share_24px.svg"),
  trackChangesIcon: chrome.extension.getURL("/extension/icons/ic_track_changes_24px.svg"),
  trendingUpIcon: chrome.extension.getURL("/extension/icons/ic_trending_up_black_24px.svg"),
  qrCodeIcon: chrome.extension.getURL("/extension/icons/qrcode.svg"),
  lightbulbIcon: chrome.extension.getURL("/extension/icons/fa-lightbulb-o.png"),
  heartBeatIcon: chrome.extension.getURL("/extension/icons/fa-heartbeat.png"),
  areaChartIcon: chrome.extension.getURL("/extension/icons/fa-area-chart.png"),
  tachometerIcon: chrome.extension.getURL("/extension/icons/fa-tachometer.png"),
  boltIcon: chrome.extension.getURL("/extension/icons/fa-bolt.png"),
  loadingIcon: chrome.extension.getURL("/extension/icons/loading.gif"),
  circleNotchIcon: chrome.extension.getURL("/extension/icons/fa-circle-o-notch.png"),
  lineChartIcon: chrome.extension.getURL("/extension/icons/fa-line-chart.png"),
  logArrowUpIcon: chrome.extension.getURL("/extension/icons/fa-long-arrow-up.png"),
  cogIcon: chrome.extension.getURL("/extension/icons/fa-cog.png"),
  logoNoText: chrome.extension.getURL("/extension/icons/logo_no_text.svg"),
  logoTextOnly: chrome.extension.getURL("/extension/icons/logo_text_only.svg"),
  extVersion: chrome.runtime.getManifest().version_name,
  extVersionName: chrome.runtime.getManifest().version_name,
  extensionId: chrome.runtime.id
};

const content: Content = new Content(appResources);
content.start();
