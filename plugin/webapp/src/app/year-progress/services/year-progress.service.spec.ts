import { TestBed } from '@angular/core/testing';

import { YearProgressService } from './year-progress.service';
import { YearProgressActivitiesFixture } from "./year-progress-activities.fixture";
import { YearProgressModel } from "../models/year-progress.model";
import { SyncedActivityModel } from "../../../../../common/scripts/models/Sync";
import * as _ from "lodash";
import { ActivityCountByTypeModel } from "../models/activity-count-by-type.model";

describe('YearProgressService', () => {

	let yearProgressService: YearProgressService;
	let syncedActivityModels: SyncedActivityModel[];

	beforeEach((done: Function) => {

		TestBed.configureTestingModule({
			providers: [YearProgressService]
		});

		yearProgressService = TestBed.get(YearProgressService);

		syncedActivityModels = YearProgressActivitiesFixture.provide();

		done();
	});

	it("should be created", (done: Function) => {

		expect(yearProgressService).toBeTruthy();
		done();
	});


	it("should compute progression on ~2.5 years", (done: Function) => {

		// Given
		const expectedLength = 3;
		const typesFilters: string[] = ["Ride", "VirtualRide", "Run"];

		// When
		const progression: YearProgressModel[] = yearProgressService.progression(syncedActivityModels, typesFilters);

		// Then
		expect(progression).not.toBeNull();
		expect(progression.length).toEqual(expectedLength);

		expect(progression[0].year).toEqual(2015);
		expect(progression[1].year).toEqual(2016);
		expect(progression[2].year).toEqual(2017);

		expect(progression[0].progressions.length).toEqual(365);
		expect(progression[1].progressions.length).toEqual(366);
		expect(progression[2].progressions.length).toEqual(152);

		done();


	});

	it("should compute progression with proper totals metrics", (done: Function) => {

		// Given
		const typesFilters: string[] = ["Ride", "VirtualRide", "Run"];

		const expectedFirstDay2015 = {
			onTimestamp: 1420066800000,
			onYear: 2015,
			onDayOfYear: 1,
			totalDistance: 10000,
			totalTime: 3600,
			totalElevation: 50,
			count: 1
		};

		const expectedLastDay2015 = {
			onTimestamp: 1451516400000,
			onYear: 2015,
			onDayOfYear: 365,
			totalDistance: 6205000,
			totalTime: 788400,
			totalElevation: 70080,
			count: 292
		};

		const expectedFirstDay2016 = {
			onTimestamp: 1451602800000,
			onYear: 2016,
			onDayOfYear: 1,
			totalDistance: 10000,
			totalTime: 3600,
			totalElevation: 50,
			count: 1
		};

		const expectedLastDay2016 = {
			onTimestamp: 1483138800000,
			onYear: 2016,
			onDayOfYear: 366,
			totalDistance: 6215000,
			totalTime: 792000,
			totalElevation: 70130,
			count: 293
		};

		const expectedFirstDay2017 = {
			onTimestamp: 1483225200000,
			onYear: 2017,
			onDayOfYear: 1,
			totalDistance: 10000,
			totalTime: 3600,
			totalElevation: 50,
			count: 1
		};

		const expectedLastDay2017 = {
			onTimestamp: 1496268000000,
			onYear: 2017,
			onDayOfYear: 152,
			totalDistance: 2580000,
			totalTime: 329400,
			totalElevation: 29250,
			count: 122
		};

		// When
		const progression: YearProgressModel[] = yearProgressService.progression(syncedActivityModels, typesFilters);

		// Then
		expect(progression).not.toBeNull();

		const firstDay2015 = _.first(progression[0].progressions);
		const lastDay2015 = _.last(progression[0].progressions);
		expect(firstDay2015).toEqual(expectedFirstDay2015);
		expect(lastDay2015).toEqual(expectedLastDay2015);

		const firstDay2016 = _.first(progression[1].progressions);
		const lastDay2016 = _.last(progression[1].progressions);
		expect(firstDay2016).toEqual(expectedFirstDay2016);
		expect(lastDay2016).toEqual(expectedLastDay2016);

		const firstDay2017 = _.first(progression[2].progressions);
		const lastDay2017 = _.last(progression[2].progressions);
		expect(firstDay2017).toEqual(expectedFirstDay2017);
		expect(lastDay2017).toEqual(expectedLastDay2017);

		done();

	});

	it("should compute progression without commute rides and with proper totals metrics", (done: Function) => {

		// Given
		const typesFilters: string[] = ["Ride", "VirtualRide", "Run"];
		const excludeCommuteRides = true;

		const expectedLastDay2015 = {
			onTimestamp: 1451516400000,
			onYear: 2015,
			onDayOfYear: 365,
			totalDistance: 5110000,
			totalTime: 657000,
			totalElevation: 69350,
			count: 219
		};

		const expectedLastDay2016 = {
			onTimestamp: 1483138800000,
			onYear: 2016,
			onDayOfYear: 366,
			totalDistance: 5120000,
			totalTime: 660600,
			totalElevation: 69400,
			count: 220
		};
		const expectedLastDay2017 = {
			onTimestamp: 1496268000000,
			onYear: 2017,
			onDayOfYear: 152,
			totalDistance: 2130000,
			totalTime: 275400,
			totalElevation: 28950,
			count: 92
		};

		// When
		const progression: YearProgressModel[] = yearProgressService.progression(syncedActivityModels, typesFilters, excludeCommuteRides);

		// Then
		expect(progression).not.toBeNull();

		const lastDay2015 = _.last(progression[0].progressions);
		expect(lastDay2015).toEqual(expectedLastDay2015);

		const lastDay2016 = _.last(progression[1].progressions);
		expect(lastDay2016).toEqual(expectedLastDay2016);

		const lastDay2017 = _.last(progression[2].progressions);
		expect(lastDay2017).toEqual(expectedLastDay2017);

		done();

	});

	it("should not compute progression with empty activities", (done: Function) => {

		// Given
		const typesFilters: string[] = ["Ride", "VirtualRide", "Run"];
		const syncedActivityModels = [];
		const progressionMethodCall = () => yearProgressService.progression(syncedActivityModels, typesFilters);


		// When, Then
		expect(progressionMethodCall).toThrowError(YearProgressService.ERROR_NO_SYNCED_ACTIVITY_MODELS);

		done();

	});

	it("should not compute progression with empty types filters", (done: Function) => {

		// Given
		const typesFilters: string[] = [];
		const progressionMethodCall = () => yearProgressService.progression(syncedActivityModels, typesFilters);

		// When, Then
		expect(progressionMethodCall).toThrowError(YearProgressService.ERROR_NO_TYPES_FILTER);

		done();

	});

	it("should not compute progression with not existing type", (done: Function) => {

		// Given
		const typesFilters: string[] = ["FakeType"];
		const progressionMethodCall = () => yearProgressService.progression(syncedActivityModels, typesFilters);

		// When, Then
		expect(progressionMethodCall).toThrowError(YearProgressService.ERROR_NO_YEAR_PROGRESS_MODELS);

		done();

	});

	it("should provide activities count by types", (done: Function) => {

		// Given
		const expectedResult: ActivityCountByTypeModel[] = [
			{type: "Ride", count: 352},
			{type: "Run", count: 178},
			{type: "VirtualRide", count: 177}
		];

		// When
		const result: ActivityCountByTypeModel[] = yearProgressService.activitiesByTypes(syncedActivityModels);

		// Then
		expect(result).not.toBeNull();
		expect(result).toEqual(expectedResult);

		// Check order
		expect(_.first(result).type).toEqual("Ride");
		expect(result[1].type).toEqual("Run");
		expect(_.last(result).type).toEqual("VirtualRide");

		done();

	});

});
