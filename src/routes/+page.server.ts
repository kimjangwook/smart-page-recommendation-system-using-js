import type { Actions } from './$types';
import getPageInfo from '$lib/getPageInfo';
import getKeywordsUsingOpenAI from '$lib/getKeywordsUsingOpenAI';
import getPageInfoFromLocal from '$lib/getPageInfoFromLocal';
import analyzeUserKeywords from '$lib/analyzeUserKeywords';
import recommendPages from '$lib/recommendPages';

import fs from 'fs';

const chunkArray = (arr: any[], chunkSize: number): any[] => {
	const chunkedArray = [];

	for (let i = 0; i < arr.length; i += chunkSize) {
		const chunk = arr.slice(i, i + chunkSize);
		chunkedArray.push(chunk);
	}

	return chunkedArray;
};

function wait(seconds: number) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(true);
		}, seconds * 1000);
	});
}

async function parseSite(url: string) {
	const urlAndHtml = await getPageInfo(url, url);
	const chunkedUrlAndHtml = chunkArray(urlAndHtml, 5);
	const chunkedRet = [];
	for (const chunk of chunkedUrlAndHtml) {
		chunkedRet.push(
			await Promise.all(
				chunk.map(async (c: PageFetchData) => {
					const keywords = await getKeywordsUsingOpenAI(c.html);
					return (await {
						...c,
						keywords
					}) as PageFetchData;
				})
			)
		);

		// OpenAI API has a limit of 60,000 tokens of request per minute.
		await wait(20);
	}

	const ret = await chunkedRet.flat(1);
	return ret;
}

export const actions = {
	fetch: async ({ request }): Promise<FormResult> => {
		const data = await request.formData();
		const domain = (data.get('domain') || '') as string;

		const pageInfo = await parseSite(domain);
		return { pageInfo };
	},
	fetch_from_local: (): FormResult => {
		const pageInfo = getPageInfoFromLocal('./mock/result_get_page_info.json');
		return { pageInfo };
	},

	analyze: async ({ request }): Promise<FormResult> => {
		const data = await request.formData();
		const domain = (data.get('domain') || '') as string;

		const pageInfo = await parseSite(domain);
		const userData = await analyzeUserKeywords(pageInfo);
		const userDataWithRecommendations = recommendPages(userData, pageInfo);
		return { pageInfo, userData: userDataWithRecommendations };
	},

	analyze_from_local: async (): Promise<FormResult> => {
		const pageInfo = JSON.parse(fs.readFileSync('./mock/result_get_page_info.json', 'utf8'));
		const userData = await analyzeUserKeywords(pageInfo);
		const userDataWithRecommendations = recommendPages(userData, pageInfo);
		return { pageInfo, userData: userDataWithRecommendations };
	}
} satisfies Actions;
