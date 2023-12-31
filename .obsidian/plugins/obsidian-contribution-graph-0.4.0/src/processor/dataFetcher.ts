import { App } from "obsidian";
import { Contribution } from "../types";
import { getAPI } from "obsidian-dataview";
import { GraphProcessError } from "./graphProcessError";

export class DataviewDataFetcher {
	fetch(query: string, dateField?: string, app?: App): Contribution[] {
		if (!query) {
			return [];
		}
		const dv = getAPI(app);
		if (!dv) {
			throw new GraphProcessError("Dataview query not available");
		}
		const result = dv.pages(query);
		if (dateField) {
			return this.groupByCustomField(result, dateField);
		} else {
			return this.groupByFileCTime(result);
		}
	}

	groupByCustomField(result: any, dateFieldName: string) {
		const convertFailedPages: ConvertFail[] = [];
		const data = result
			// @ts-ignore
			.filter((page) => {
				if (page[dateFieldName]) {
					try {
						page[dateFieldName].toFormat("yyyy-MM-dd");
						return true;
					} catch (e) {
						convertFailedPages.push({
							page: page.file.name,
							reason:
								"can't convert dateField " +
								dateFieldName +
								" to date, please check the format, it should be like: 2022-02-02T00:00:00",
						});
						return false;
					}
				}
				convertFailedPages.push({
					page: page.file.name,
					reason: "can't find field " + dateFieldName + " in page",
				});
				return false;
			})
			// @ts-ignore
			.groupBy((page) => {
				return page[dateFieldName].toFormat("yyyy-MM-dd");
			})
			// @ts-ignore
			.map((entry) => {
				return {
					date: entry.key,
					value: entry.rows.length,
				};
			});
		if (convertFailedPages.length > 0) {
			console.warn("this page can't be processed", convertFailedPages);
		}
		return data;
	}

	groupByFileCTime(data: any) {
		return (
			data
				// @ts-ignore
				.groupBy((p) => p.file.ctime.toFormat("yyyy-MM-dd"))
				// @ts-ignore
				.map((entry) => {
					return {
						date: entry.key,
						value: entry.rows.length,
					};
				})
		);
	}
}

export class ConvertFail {
	page: string;
	reason: string;
}
