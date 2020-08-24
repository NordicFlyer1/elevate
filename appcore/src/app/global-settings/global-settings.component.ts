import { Component, OnDestroy, OnInit } from "@angular/core";
import { UserSettingsService } from "../shared/services/user-settings/user-settings.service";
import { GlobalSettingsService } from "./services/global-settings.service";
import * as _ from "lodash";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute } from "@angular/router";
import { OptionHelperDialogComponent } from "./option-helper-dialog/option-helper-dialog.component";
import { OptionHelperReaderService } from "./services/option-helper-reader.service";
import { SectionModel } from "./models/section.model";
import { OptionModel } from "./models/option.model";
import { OptionHelperDataModel } from "./option-helper-dialog/option-helper-data.model";
import { Subscription } from "rxjs";
import { LoggerService } from "../shared/services/logging/logger.service";
import { environment } from "../../environments/environment";
import { UserSettings } from "@elevate/shared/models";
import UserSettingsModel = UserSettings.UserSettingsModel;

@Component({
    selector: "app-global-settings",
    templateUrl: "./global-settings.component.html",
    styleUrls: ["./global-settings.component.scss"],

})
export class GlobalSettingsComponent implements OnInit, OnDestroy {

    public sections: SectionModel[];
    public searchText = null;

    public routeQueryParamsSubscription: Subscription;

    constructor(public userSettingsService: UserSettingsService,
                public globalSettingsService: GlobalSettingsService,
                public optionHelperReaderService: OptionHelperReaderService,
                public route: ActivatedRoute,
                public dialog: MatDialog,
                public logger: LoggerService) {
    }

    public static getOptionHelperDir(pathname: string): string {

        if (_.isEmpty(pathname)) {
            return null;
        }

        const pathNames = pathname.split("/");
        pathNames.pop();
        return pathNames.join("/") + "/assets/option-helpers/";
    }

    public ngOnInit(): void {

        this.sections = this.globalSettingsService.getSectionsByEnvTarget(environment.target);

        this.userSettingsService.fetch().then((userSettings: UserSettingsModel) => {
            this.renderOptionsForEachSection(userSettings);
        });

        // Watch query params to filter options from URL
        // OR open option dialog from external
        this.routeQueryParamsSubscription = this.route.queryParams.subscribe(params => {

            // Check query param: ?searchText=value and apply value to searchText data binding
            if (!_.isEmpty(params.searchText)) {
                this.searchText = params.searchText;
            }

            if (!_.isEmpty(params.viewOptionHelperId)) {
                _.defer(() => this.showOptionHelperDialog(params.viewOptionHelperId));
            }
        });
    }

    public renderOptionsForEachSection(userSettings: UserSettingsModel): void {

        _.forEach(this.sections, (section: SectionModel) => {

            _.forEach(section.options, (option: OptionModel) => {

                if (option.type === GlobalSettingsService.TYPE_OPTION_CHECKBOX) {

                    option.active = _.propertyOf(userSettings)(option.key);

                    if (option.enableSubOption) {
                        _.forEach(option.enableSubOption, (subKey: string) => {
                            this.displaySubOption(subKey, _.propertyOf(userSettings)(option.key));
                        });
                    }

                } else if (option.type === GlobalSettingsService.TYPE_OPTION_LIST) {

                    option.active = _.find(option.list, {
                        key: _.propertyOf(userSettings)(option.key),
                    });

                } else if (option.type === GlobalSettingsService.TYPE_OPTION_NUMBER) {

                    option.value = _.propertyOf(userSettings)(option.key);

                } else {
                    this.logger.error("Option type not supported");
                }
            });
        });
    }

    public onOptionChange(option: OptionModel): void {

        if (option.type === GlobalSettingsService.TYPE_OPTION_CHECKBOX) {

            this.userSettingsService.saveProperty(option.key, option.active).then(() => {
                this.logger.info(option.key + " has been updated to ", option.active);
            });

            // Enable/disable sub option if needed
            if (option.enableSubOption) {
                // Replace this to find option object from option.enableSubOption
                _.forEach(option.enableSubOption, (subKey: string) => {
                    this.displaySubOption(subKey, option.active);
                });
            }
        } else if (option.type === GlobalSettingsService.TYPE_OPTION_LIST) {

            this.userSettingsService.saveProperty(option.key, option.active.key).then(() => {
                this.logger.info(option.key + " has been updated to ", option.active);
            });

        } else if (option.type === GlobalSettingsService.TYPE_OPTION_NUMBER) {


            if (_.isNull(option.value) || _.isUndefined(option.value) || !_.isNumber(option.value)) {

                this.resetOptionToDefaultValue(option);

            } else { // Save !

                if (option.value < option.min || option.value > option.max) {
                    this.resetOptionToDefaultValue(option);
                }

                this.userSettingsService.saveProperty(option.key, option.value).then(() => {
                    this.logger.info(option.key + " has been updated to " + option.value);
                });
            }
        }


    }

    public resetOptionToDefaultValue(option: OptionModel): void {
        const resetValue = _.propertyOf(UserSettings.getDefaultsByEnvTarget(environment.target))(option.key);
        this.logger.info(option.key + " value not compliant, Reset to  " + resetValue);
        option.value = resetValue;
    }

    public displaySubOption(subOptionKey: string, show: boolean): void {

        _.forEach(this.sections, (section: SectionModel) => {

            const foundOption: OptionModel = _.find(section.options, {
                key: subOptionKey,
            });

            if (foundOption) {
                foundOption.hidden = !show;
            }
        });
    }

    public showOptionHelperDialog(optionKeyParam: string): void {

        let option: OptionModel = null;

        _.forEach(this.sections, (section: SectionModel) => {

            const foundOption: OptionModel = _.find(section.options, {
                key: optionKeyParam,
            });

            if (foundOption) {
                option = foundOption;
            }
        });

        if (option) {

            // Construct markdown template URI from asset option helper dir & option key
            const markdownTemplateUri = GlobalSettingsComponent.getOptionHelperDir(location.pathname) + option.key + ".md";

            this.optionHelperReaderService.get(markdownTemplateUri).then(markdownData => {

                const optionHelperData: OptionHelperDataModel = {
                    title: option.title,
                    markdownData: markdownData
                };

                this.dialog.open(OptionHelperDialogComponent, {
                    minWidth: OptionHelperDialogComponent.MIN_WIDTH,
                    maxWidth: OptionHelperDialogComponent.MAX_WIDTH,
                    data: optionHelperData,
                    autoFocus: false
                });
            });
        }
    }

    public ngOnDestroy(): void {
        this.routeQueryParamsSubscription.unsubscribe();
    }
}