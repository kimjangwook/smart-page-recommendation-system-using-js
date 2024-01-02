# JavaScript로 구현하는 스마트 페이지 추천 시스템 개발기

## 서론

인터넷의 끝없는 정보 속에서 사용자들은 종종 자신에게 맞는 콘텐츠를 찾는 데 어려움을 겪습니다. 검색 엔진과 소셜 미디어 알고리즘이 개인화된 정보를 제공하는 데 큰 역할을 하고 있지만, 웹사이트 자체에서 사용자의 경험을 개인화하는 것은 여전히 중요한 과제입니다. 이러한 상황에서, 웹사이트가 사용자의 관심사와 선호에 기반하여 자동으로 관련 콘텐츠를 추천하는 기능은 사용자 경험을 혁신적으로 향상시킬 수 있습니다.

이러한 배경을 바탕으로, 저는 JavaScript를 사용하여 페이지 추천 시스템을 개발하기로 결정했습니다. 이 시스템의 목표는 간단합니다. 사용자가 웹사이트에서 어떤 페이지를 방문했는지를 분석하고, 이를 바탕으로 사용자의 관심사를 파악하여 아직 방문하지 않은 비슷한 주제의 페이지를 추천하는 것입니다.

이 블로그 시리즈에서는 이 프로젝트의 개발 과정을 단계별로 공유하고자 합니다. 개발 과정에서 마주치는 도전과제, 해결 방안, 그리고 코딩의 실제 예시까지 포함하여, JavaScript를 활용한 실제적인 웹 개발 경험을 제공하고자 합니다. 이 시리즈가 웹 개발에 관심 있는 독자들에게 실질적인 도움이 되길 바라며, 독자 여러분의 피드백과 조언도 기대합니다.

## 1단계: 프로젝트의 기술적 토대 - SvelteKit의 선택과 프로젝트 구축 과정

이 프로젝트를 시작하기에 앞서, 저는 많은 기술 옵션들을 고려했습니다. 그 중에서 SvelteKit이 가장 적합한 선택이라는 결론에 도달했습니다. SvelteKit은 현대적인 웹 개발의 필요성을 충족시키는 프레임워크로, 빠른 로딩 시간, 뛰어난 성능, 그리고 서버 사이드와 클라이언트 사이드의 효율적인 통합이 가능합니다.

프로젝트의 생성을 위해 다음과 같은 커맨드를 실행하였습니다.

```sh
npm create svelte@latest smart-page-recommendation-system-using-js
cd smart-page-recommendation-system-using-js
yarn install
yarn dev
```

> 저는 node v20.10.0을 사용하였으며, 프로젝트 생성 시에는 Skeleton project, using Typescript syntax 옵션을 선택하였습니다.

## 2단계: URL 리스트 생성 - 웹사이트 페이지를 크롤링하여 사이트의 모든 페이지 URL을 수집

웹사이트의 모든 페이지를 분석하기 위한 첫 걸음은, 사이트의 모든 페이지 URL을 수집하는 것입니다. 이를 위해, 먼저 몇 가지 필수 라이브러리를 설치해야 합니다. 이 프로젝트에서는 `puppeteer`와 `cheerio`를 사용할 것입니다. `puppeteer`는 백그라운드에서 Chrome 혹은 Chromium을 제어하는 API를 제공하는 라이브러리로 페이지에 엑세스 한 이후 동적으로 로딩되는 페이지 정보까지 취득하기 위해 사용됩니다. `cheerio`는 서버 사이드에서 jQuery와 유사한 방식으로 HTML을 분석하는 데 적합합니다.

```sh
yarn add puppeteer cheerio
```

두 라이브러리를 사용하여 각 페이지에 접근하고, HTML 내부에서 링크를 추출하는 TypeScript 코드를 작성했습니다.

### 프로젝트에 필요한 type의 설정

저는 TypeScript를 사용할 예정이기 때문에, type을 설정하는 것을 최우선적으로 진행하였습니다. `src/ambient.d.ts` 파일을 생성하여 다음의 코드를 작성하였습니다.

```ts
type PageFetchData = {
	url: string;
	html: string;
	keywords?: string[];
};

type UserInterests = {
	keyword: string;
	count: number;
	relatives?: string[];
};

type Recommendation = {
	page: string;
	score: number;
};

type UserData = {
	username: string;
	visited_pages: string[];
	interests: UserInterests[];
	recommendations?: Recommendation[];
};

type FormResult = {
	pageInfo: PageFetchData[];
	userData?: UserData[];
};
```

### URL 추출 로직의 구현

먼저, `src/lib/getPageInfo.ts` 파일에 URL 리스트를 생성하는 함수를 구현했습니다. 이 함수는 주어진 URL에서 시작하여, 동일한 도메인 내의 모든 링크를 재귀적으로 찾아 배열에 저장합니다. 또한, 각 페이지에 접속한 이후, HTML의 텍스트를 함께 저장하도록 합니다.

저는 빠른 실행을 위해, 타임아웃을 6000ms로 설정하였습니다. 실제 실행하는 코드에서는 해당 부분을 적절히 설정하는 것을 권장합니다.

```ts
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

const isValidUrl = (firstUrl: string, url: string, result: PageFetchData[]): boolean => {
	const parsed = new URL(url);
	const isSameDomain = url.includes(firstUrl);
	const isNotVisited = !result.map((r) => r.url).includes(url);

	return !!parsed.hostname && !!parsed.protocol && isSameDomain && isNotVisited;
};

const getPageInfo = async (
	url: string,
	firstUrl: string,
	result: PageFetchData[] = [],
	maxUrls?: number
): Promise<PageFetchData[]> => {
	if (!isValidUrl(firstUrl, url, result)) {
		return result;
	} else if (maxUrls !== undefined && result.length >= maxUrls) {
		return result;
	}

	let browser;
	try {
		browser = await puppeteer.launch({ headless: 'new' });
		const page = await browser.newPage();
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
		);
		await page.goto(url, { timeout: 6000 });
		const html = await page.content();

		console.log(`SUCCESS fetch from ${url}`);
		const $ = cheerio.load(html);
		const parsedUrl = new URL(url);
		result.push({
			url: `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`,
			html: $('body').text()
		});

		const links = $('a')
			.map((_, aTag) => $(aTag).attr('href'))
			.get();
		for (const href of links) {
			if (href) {
				const createdUrl = new URL(href, url);
				const fullUrl = `${createdUrl.protocol}//${createdUrl.hostname}${createdUrl.pathname}`;
				await getPageInfo(fullUrl, firstUrl, result, maxUrls);
			}
		}
	} catch (error) {
		console.error(`ERROR from ${url}: ${error}`);
	} finally {
		if (browser) {
			await browser.close();
		}
	}

	return result;
};

export default getPageInfo;
```

이 코드는 첫 번째 매개변수로 받은 URL을 시작점으로 사용하고, `puppeteer`를 통해 해당 페이지의 HTML을 가져옵니다. 그런 다음 `cheerio`를 사용하여 페이지 내의 모든 링크(`a` 태그)를 찾고, 이를 결과 배열에 추가합니다. 중복 방지와 동일 도메인 확인을 위한 로직도 포함되어 있습니다.

### SvelteKit 서버 라우트의 구현

다음으로, `src/routes/+page.server.ts` 파일에 서버 라우트를 구현하여, 사용자가 입력한 도메인에 대해 URL 리스트와 HTML을 취득하여 반환하는 기능을 추가했습니다.

```ts
import type { Actions } from './$types';
import getPageInfo from '$lib/getPageInfo';

async function parseSite(url: string) {
	const urlAndHtml = await getPageInfo(url, url);
	return urlAndHtml;
}

export const actions = {
	fetch: async ({ request }): Promise<PageFetchData[]> => {
		const data = await request.formData();
		const domain = (data.get('domain') || '') as string;

		const pageInfo = await parseSite(domain);
		return { pageInfo };
	}
} satisfies Actions;
```

이 코드는 사용자로부터 입력받은 도메인을 기반으로 `getPageInfo` 함수를 호출하고, 결과로 받은 `PageFetchData` 리스트를 클라이언트 측에 반환합니다.

### 프론트엔드 구현

마지막으로, `src/routes/+page.svelte` 파일에 사용자 인터페이스를 구현했습니다. 이 UI는 사용자가 도메인을 입력하고, 해당 도메인에 대한 URL 리스트를 요청할 수 있는 간단한 폼을 제공합니다.

```svelte
<script lang="ts">
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let domain: string = '';
</script>

<main>
	<h1>Smart Page Recommendation System Using JS</h1>
	<form method="POST">
		<input type="text" bind:value={domain} name="domain" />
		<button type="submit" formaction="?/fetch">Fetch</button>
	</form>

	{#if form}
		{#if form.pageInfo}
			<h2>Page Info</h2>
			<table>
				<tr>
					<th>#</th>
					<th>URL</th>
					<th>HTML</th>
				</tr>

				{#each form.pageInfo as item, i}
					<tr>
						<td>{i + 1}</td>
						<td>{item.url}</td>
						<td>{item.html}</td>
					</tr>
				{/each}
			</table>
		{/if}
	{/if}
</main>
```

사용자가 폼을 제출하면, 입력된 도메인에 대한 URL 리스트가 화면에 표시됩니다. 이렇게 수집된 URL 리스트는 추후 페이지의 데이터를 추출하고 분석하는 데 사용됩니다.

이 단계는 웹사이트의 모든 페이지 URL을 수집하는 중요한 과정입니다. 수집된 URL은 다음 단계인 페이지 데이터의 추출 및 분석에 사용됩니다.

## 3단계: 각 페이지의 정보를 GPT API로 전송하여, 각 페이지의 키워드 수집

웹사이트의 각 페이지로부터 수집된 HTML 데이터는 방대한 정보를 포함하고 있습니다. 이 정보를 효과적으로 분석하고 정리하여, 페이지의 핵심 키워드를 추출하는 것은 사용자에게 맞춤형 추천을 제공하는 데 있어 중요한 단계입니다. 이를 위해 OpenAI의 GPT(Generative Pre-trained Transformer) API를 사용하여 각 페이지의 키워드를 추출하는 로직을 구현했습니다.

> 사용의 편의를 위해 OpenAI의 API를 사용하였습니다만, 무료로 같은 내용을 진행하기 위해서 `ollama-node` 등의 라이브러리를 사용하는 것도 좋을 것이라 생각합니다.

### 필요 라이브러리 설치

GPT API와 통신하기 위해 필요한 `openai` 라이브러리를 설치해야합니다.

```sh
yarn add openai
```

### GPT API를 사용한 키워드 추출 로직 구현

첫 번째 단계로, `src/lib/getKeywordsUsingOpenAI.ts` 파일을 작성했습니다. 이 파일에서는 GPT API에 HTML 텍스트를 전송하고, 해당 내용에 기반한 핵심 키워드를 배열 형태로 추출하는 함수를 구현했습니다.

```ts
import OpenAI from 'openai';

const getKeywordsUsingOpenAI = async (html: string): Promise<string[]> => {
	const openai = new OpenAI({
		apiKey: 'your-api-key'
	});
	const completion = await openai.chat.completions.create({
		messages: [
			// To use json_object response_format, you should input "designed to output JSON" in the first message.
			{ role: 'system', content: 'You are a helpful assistant designed to output JSON.' },
			{
				role: 'assistant',
				content: 'If you give me a HTML text, I will give you the five keywords to array of string.'
			},
			{ role: 'user', content: html }
		],
		model: 'gpt-3.5-turbo-1106',
		response_format: { type: 'json_object' }
	});

	return JSON.parse(completion.choices[0].message.content || '')?.keywords || [];
};

export default getKeywordsUsingOpenAI;
```

이 함수는 HTML 텍스트를 입력으로 받아, GPT API를 통해 페이지의 핵심 키워드를 분석하고, 결과를 배열로 반환합니다.

### 서버 라우트에서 키워드 추출 로직 적용

다음으로, `src/routes/+page.server.ts` 파일에서 `getPageInfo` 함수를 통해 수집된 각 페이지의 HTML 데이터를 `getKeywordsUsingOpenAI` 함수에 전달하여, 각 페이지의 키워드를 추출합니다.

```ts
import type { Actions } from './$types';
import getPageInfo from '$lib/getPageInfo';
import getKeywordsUsingOpenAI from '$lib/getKeywordsUsingOpenAI';

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
	fetch: async ({ request }): Promise<PageFetchData[]> => {
		const data = await request.formData();
		const domain = (data.get('domain') || '') as string;

		const pageInfo = await parseSite(domain);
		return { pageInfo };
	}
} satisfies Actions;
```

이 코드는 각 페이지의 HTML 데이터를 가져온 후, GPT API를 사용하여 키워드를 추출하고, 이를 `PageFetchData` 객체에 추가합니다.

> OpenAI API의 `gpt-3.5-turbo-1106` 모델은 1분에 60,000 토큰까지 처리할 수 있는 제한이 있으므로, 제한에 걸리지 않도록 `wait` 로직을 추가하였습니다.

### 프론트엔드에서 키워드 표시

마지막으로, `src/routes/+page.svelte` 파일을 수정하여 각 페이지에 대한 키워드 목록을 사용자에게 표시합니다.

```svelte
<script lang="ts">
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let domain: string = 'https://blog.jangwook.net';
</script>

<main>
	<h1>Smart Page Recommendation System Using JS</h1>
	<form method="POST">
		<input type="text" bind:value={domain} name="domain" />
		<button type="submit" formaction="?/fetch">Fetch</button>
	</form>

	{#if form}
		<table>
			<tr>
				<th>#</th>
				<th>URL</th>
				<th>Keywords</th>
			</tr>
			{#each form as item, i}
				<tr>
					<td>{i + 1}</td>
					<td>{item.url}</td>
					<td>{JSON.stringify(item.keywords)}</td>
				</tr>
			{/each}
		</table>
	{/if}
</main>
```

이 사용자 인터페이스는 사용자에게 각 URL과 그에 해당하는 키워드 목록을 테이블 형태로 표시합니다. 사용자는 이를 통해 각 페이지의 주요 내용을 간략하게 파악할 수 있습니다.

### 결론

3단계를 통해 웹사이트의 각 페이지에서 중요한 키워드를 추출하는 기능을 구현했습니다. 이렇게 추출된 키워드는 사용자의 관심사와 매칭하여 맞춤형 페이지 추천에 활용될 수 있습니다. GPT API를 활용한 이 방법은 페이지 내용의 복잡성을 줄이고, 사용자에게 가장 관련성 높은 콘텐츠를 제시하는 데 큰 도움이 됩니다.

## 4단계: 사용자 방문 이력 분석 및 관심사 파악

3단계의 성과를 바탕으로, 이제 우리는 사용자의 방문 이력을 분석하여 개인별 맞춤형 페이지 추천을 위한 관심사를 도출하는 4단계에 돌입합니다. 각 사용자의 관심사를 파악하기 위해, 단순한 알고리즘을 사용할 계획입니다. 유저가 액세스한 페이지의 키워드를 나열하고, 어떠한 키워드가 가장 많이 나타났는지를 확인 후, 가장 많이 나타난 키워드가 유저의 관심사라고 설정할 계획입니다. 만일 동일 숫자의 키워드가 여러개 존재한다면, 가장 먼저 나타나는 키워드를 관심사로 설정하도록 하겠습니다.

우선 분석을 위해 다음과 같은 Mock 데이터를 만들었습니다.

```json
[
	{
		"username": "User1",
		"visited_pages": [
			"https://blog.jangwook.net/2023/08/05/nihon-minka-en-open-air-museum/",
			"https://blog.jangwook.net/2023/08/08/omiya-bonsai-village/",
			"https://blog.jangwook.net/2023/08/09/tokyos-hidden-treasures/",
			"https://blog.jangwook.net/2023/08/05/nomizo-falls/",
			"https://blog.jangwook.net/2023/08/07/sarushima/"
		]
	},
	{
		"username": "User2",
		"visited_pages": ["https://blog.jangwook.net/2023/08/07/sarushima/"]
	},
	{
		"username": "User3",
		"visited_pages": ["https://blog.jangwook.net/2023/08/09/tokyos-hidden-treasures/"]
	},
	{
		"username": "User4",
		"visited_pages": [
			"https://blog.jangwook.net/2023/08/07/sarushima/",
			"https://blog.jangwook.net/2023/08/05/nomizo-falls/",
			"https://blog.jangwook.net/2023/08/08/omiya-bonsai-village/",
			"https://blog.jangwook.net/2023/08/05/nihon-minka-en-open-air-museum/",
			"https://blog.jangwook.net/2023/08/09/tokyos-hidden-treasures/",
			"https://blog.jangwook.net/2023/08/04/shiro-hige-cream-puff-factory-a-sweet-hidden-gem-in-tokyo/",
			"https://blog.jangwook.net/2023/08/04/gotoku-ji-temple-the-birthplace-of-the-maneki-neko/"
		]
	},
	{
		"username": "User5",
		"visited_pages": [
			"https://blog.jangwook.net/2023/08/04/gotoku-ji-temple-the-birthplace-of-the-maneki-neko/",
			"https://blog.jangwook.net/2023/08/05/nihon-minka-en-open-air-museum/",
			"https://blog.jangwook.net/2023/08/09/tokyos-hidden-treasures/",
			"https://blog.jangwook.net/2023/08/08/omiya-bonsai-village/"
		]
	},
	{
		"username": "User6",
		"visited_pages": ["https://blog.jangwook.net/2023/08/05/nomizo-falls/"]
	},
	{
		"username": "User7",
		"visited_pages": [
			"https://blog.jangwook.net/2023/08/04/gotoku-ji-temple-the-birthplace-of-the-maneki-neko/",
			"https://blog.jangwook.net/2023/08/04/shiro-hige-cream-puff-factory-a-sweet-hidden-gem-in-tokyo/",
			"https://blog.jangwook.net/2023/08/08/omiya-bonsai-village/",
			"https://blog.jangwook.net/2023/08/07/sarushima/",
			"https://blog.jangwook.net/2023/08/05/nomizo-falls/",
			"https://blog.jangwook.net/2023/08/09/tokyos-hidden-treasures/"
		]
	},
	{
		"username": "User8",
		"visited_pages": [
			"https://blog.jangwook.net/2023/08/04/gotoku-ji-temple-the-birthplace-of-the-maneki-neko/",
			"https://blog.jangwook.net/2023/08/08/omiya-bonsai-village/"
		]
	},
	{
		"username": "User9",
		"visited_pages": [
			"https://blog.jangwook.net/2023/08/09/tokyos-hidden-treasures/",
			"https://blog.jangwook.net/2023/08/05/nomizo-falls/",
			"https://blog.jangwook.net/2023/08/05/nihon-minka-en-open-air-museum/",
			"https://blog.jangwook.net/2023/08/07/sarushima/",
			"https://blog.jangwook.net/2023/08/08/omiya-bonsai-village/",
			"https://blog.jangwook.net/2023/08/04/shiro-hige-cream-puff-factory-a-sweet-hidden-gem-in-tokyo/",
			"https://blog.jangwook.net/2023/08/04/gotoku-ji-temple-the-birthplace-of-the-maneki-neko/"
		]
	},
	{
		"username": "User10",
		"visited_pages": [
			"https://blog.jangwook.net/2023/08/04/gotoku-ji-temple-the-birthplace-of-the-maneki-neko/",
			"https://blog.jangwook.net/2023/08/05/nomizo-falls/",
			"https://blog.jangwook.net/2023/08/07/sarushima/",
			"https://blog.jangwook.net/2023/08/04/shiro-hige-cream-puff-factory-a-sweet-hidden-gem-in-tokyo/",
			"https://blog.jangwook.net/2023/08/09/tokyos-hidden-treasures/",
			"https://blog.jangwook.net/2023/08/05/nihon-minka-en-open-air-museum/"
		]
	}
]
```

### 유저의 키워드 빈도 추출

`/src/lib/analyzeUserKeywords.ts` 파일에 Mock 데이터와 페이지 데이터를 기반으로 각 사용자가 어떤 키워드에 몇 번 액세스했는지, 키워드 별 관련 페이지에는 어떠한 페이지가 존재하는지를 추출하는 코드를 작성하겠습니다.

```ts
import fs from 'fs';

const interestExisted = (interests: UserInterests[], keyword: string) => {
	return interests.find((interest) => interest.keyword === keyword);
};

const analyzeUserKeywords = (pageData: PageFetchData[]): UserData[] => {
	// Mock Data
	const usersData = JSON.parse(fs.readFileSync('./mock/mock_user_data.json', 'utf-8'));

	// Keyword count while traveling on each user's visit page
	usersData.forEach((user: UserData) => {
		const interests: UserInterests[] = [];

		user.visited_pages.forEach((pageUrl) => {
			// Find page data based on the page URL
			const page = pageData.find((page) => page.url === pageUrl);

			if (page) {
				// Increased count while traveling on the keywords on the page
				page?.keywords?.forEach((keyword) => {
					if (!interestExisted(interests, keyword)) {
						interests.push({ keyword, count: 1, relatives: [page.url] });
					} else {
						interests.forEach((interest) => {
							if (interest.keyword === keyword) {
								interest.count++;
								if (!interest.relatives?.includes(page.url)) {
									interest.relatives?.push(page.url);
								}
							}
						});
					}
				});
			}
		});

		interests.sort((a, b) => b.count - a.count || (a.keyword > b.keyword ? 1 : -1));

		user.interests = interests;
	});

	return usersData;
};

export default analyzeUserKeywords;
```

### 서버 라우트에서 유저 키워드 분석 로직 적용

웹사이트의 각 페이지에서 수집된 데이터를 기반으로, 사용자의 방문 이력을 분석하여 개인별 관심사를 파악하는 과정을 서버 측에서 구현했습니다. 이 과정은 사용자의 각 방문 페이지의 키워드를 분석하여, 가장 자주 나타나는 키워드를 해당 사용자의 주요 관심사로 간주합니다.

```ts
// src/routes/+page.server.ts
// ...
import analyzeUserKeywords from '$lib/analyzeUserKeywords';

export const actions = {
	// ...
	analyze: async ({ request }): Promise<FormResult> => {
		const data = await request.formData();
		const domain = (data.get('domain') || '') as string;

		const pageInfo = await parseSite(domain);
		const userData = await analyzeUserKeywords(pageInfo);
		return { pageInfo, userData };
	}
} satisfies Actions;
```

이 코드는 사용자가 제출한 도메인에 대해 페이지 정보를 수집하고, 해당 정보를 기반으로 사용자의 관심사를 분석합니다.

### 프론트엔드에서 유저 키워드 분석 내용 표시

분석 결과를 사용자에게 보여주는 프론트엔드 구현은, 사용자별로 방문한 페이지의 키워드와 이들의 빈도수를 시각적으로 표현합니다. 사용자들의 방문 페이지와 관련 키워드, 그리고 이를 기반으로 한 관심사 분석 결과가 테이블 형태로 표시됩니다.

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	// ...
</script>

<main>
	<!-- ... -->
	<!-- User page information and analysis results display -->
	{#if form}
		<!-- ... -->
		{#if form.userData}
			<h2>User userData</h2>
			<!-- User interest and related page information is displayed as a table -->
			<table>
				<tr>
					<th>#</th>
					<th>Username</th>
					<th>Keyword</th>
					<th>Count</th>
					<th>Relatives</th>
					<th>Recommendation</th>
				</tr>
				{#each form.userData as item, i}
					{#each item.interests as interests, j}
						<tr>
							{#if j === 0}
								<td rowspan={item.interests.length}>{i + 1}</td>
								<td rowspan={item.interests.length}>{item.username}</td>
							{/if}
							<td>
								{interests.keyword}
							</td>
							<td>
								{interests.count}
							</td>
							<td>
								{#if interests.relatives}
									<ul>
										{#each interests.relatives as relative}
											<li>{relative}</li>
										{/each}
									</ul>
								{/if}
							</td>

							{#if j === 0}
								<td rowspan={item.interests.length}>
									<!-- recommendation -->
								</td>
							{/if}
						</tr>
					{/each}
				{/each}
			</table>
		{/if}
	{/if}
</main>
```

이 인터페이스는 사용자가 입력한 도메인에 따라 분석된 페이지 정보와 각 사용자의 관심사를 표시하여, 사용자별 맞춤형 페이지 추천을 위한 기초 데이터를 제공합니다.

### 결론

4단계를 통해 사용자들의 방문 이력을 분석하고, 이를 기반으로 각 사용자의 관심사를 도출하는 알고리즘을 구현하였습니다. 이 데이터는 사용자에게 맞춤형 콘텐츠를 추천하는 데 중요한 역할을 합니다. 다음 단계에서는 이 관심사를 기반으로 실제 사용자에게 추천할 페이지를 선정하는 알고리즘을 설계하고 구현할 예정입니다.

## 5단계: 추천 알고리즘 설계 및 구현

4단계에서 사용자별 관심사를 파악한 후, 이제 이 정보를 사용하여 개인화된 페이지 추천 알고리즘을 설계하고 구현합니다. 이 단계의 목표는 사용자의 관심사와 가장 관련성이 높은 페이지를 효과적으로 식별하고 추천하는 것입니다.

### 추천 알고리즘의 설계

1. **점수 책정 기준**: 각 페이지에 대한 점수는 페이지의 키워드와 사용자의 관심사 간의 일치도를 기반으로 합니다. 페이지의 키워드가 사용자의 관심사와 일치하면, 그 키워드의 사용자 방문 횟수에 비례하여 점수를 책정합니다.
2. **페이지 추천 기준**: 책정된 점수가 높은 페이지를 우선적으로 추천합니다. 이미 방문한 페이지는 제외하고, 사용자가 아직 방문하지 않은 페이지 중에서 추천합니다.

### 알고리즘 구현

`src/lib/recommendPages.ts` 파일에서 추천 알고리즘을 구현합니다. 이 함수는 사용자의 관심사와 페이지 데이터를 기반으로 가장 적합한 페이지를 추천합니다.

```ts
const recommendPages = (userData: UserData[], pageData: PageFetchData[]): UserData[] => {
	return userData.map((user) => {
		// Calculate the recommended page and score
		const recommendations = pageData
			.filter((page) => !user.visited_pages.includes(page.url)) // Excluding page already visited
			.map((page) => {
				const score = page.keywords
					?.filter((keyword) => user.interests.some((interest) => interest.keyword === keyword))
					.reduce(
						(acc, keyword) =>
							acc + (user.interests.find((interest) => interest.keyword === keyword)?.count || 0),
						0
					);
				return { page: page.url, score } as Recommendation;
			})
			.sort((a, b) => (b?.score || 0) - (a?.score || 0));

		user.recommendations = recommendations;

		return user;
	});
};

export default recommendPages;
```

### 서버 라우트에서 추천 알고리즘 적용

`src/routes/+page.server.ts` 파일에서 추천 알고리즘을 적용하여, 각 사용자별로 맞춤형 페이지 추천 결과를 생성합니다.

```ts
// src/routes/+page.server.ts
// ...
import recommendPages from '$lib/recommendPages';

export const actions = {
	// ...
	analyze: async ({ request }): Promise<FormResult> => {
		const data = await request.formData();
		const domain = (data.get('domain') || '') as string;

		const pageInfo = await parseSite(domain);
		const userData = await analyzeUserKeywords(pageInfo);
		const userDataWithRecommendations = recommendPages(userData, pageInfo);
		return { pageInfo, userData: userDataWithRecommendations };
	}
} satisfies Actions;
```

### 프론트엔드에서 추천 결과 표시

마지막으로, `src/routes/+page.svelte` 파일을 수정하여 각 사용자에 대한 맞춤형 페이지 추천 결과를 표시합니다.

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	// ...
</script>

<main>
	<!-- ... -->
	<!-- User page information and analysis results display -->
	{#if form}
		<!-- ... -->
		{#if form.userData}
			<h2>User userData</h2>
			<!-- User interest and related page information is displayed as a table -->
			<table>
				<tr>
					<th>#</th>
					<th>Username</th>
					<th>Keyword</th>
					<th>Count</th>
					<th>Relatives</th>
					<th>Recommendation</th>
				</tr>
				{#each form.userData as item, i}
					{#each item.interests as interests, j}
						<tr>
							{#if j === 0}
								<td rowspan={item.interests.length}>{i + 1}</td>
								<td rowspan={item.interests.length}>{item.username}</td>
							{/if}
							<td>
								{interests.keyword}
							</td>
							<td>
								{interests.count}
							</td>
							<td>
								{#if interests.relatives}
									<ul>
										{#each interests.relatives as relative}
											<li>{relative}</li>
										{/each}
									</ul>
								{/if}
							</td>

							{#if j === 0}
								<td rowspan={item.interests.length}>
									{#if item.recommendations}
										<ul>
											{#each item.recommendations as recommendation}
												<li>{recommendation.page} - {recommendation.score}</li>
											{/each}
										</ul>
									{/if}
								</td>
							{/if}
						</tr>
					{/each}
				{/each}
			</table>
		{/if}
	{/if}
</main>
```

이 인터페이스는 각 사용자에게 추천된 페이지 목록을 표시하며, 사용자가 관심을 가질 만한 새로운 콘텐츠를 발견하는 데 도움을 줍니다.

### 결론

5단계를 통해 각 사용자의 관심사를 기반으로 한 맞춤형 페이지 추천 알고리즘을 성공적으로 설계하고 구현했습니다. 이 알고리즘은 사용자의 기존 방문 이력과 관심사를 분석하여, 개인화된 추천을 제공함으로써 사용자 경험을 향상시키는 데 기여합니다.

5단계까지의 여정을 통해, 우리는 시스템을 개발하는 과정에 대하여 구체적으로 살펴보았습니다. 매우 단순한 알고리즘을 사용한 시스템의 개발이었지만, 개선을 통해 더욱 더 정교한 시스템을 개발할 수 있는 인사이트를 제공할 수 있었다고 생각합니다.

이후 작성될 내용은 이 블로그 포스트 내에서는 구체적으로 다루지는 않지만, 시스템을 더 정교화 해 나가는 과정에 대해 기술하도록 하겠습니다.

## 6단계: 시스템 통합 및 테스트

추천 알고리즘의 개발과 구현을 완료한 후, 이제 이를 전체 시스템과 통합하고, 실제 사용 환경에서의 성능을 테스트합니다. 이 단계의 목표는 시스템의 안정성을 확보하고, 사용자 경험을 최적화하는 것입니다.

### 시스템 통합

1. **프론트엔드와 백엔드 통합**: 개발된 기능을 웹사이트의 프론트엔드와 백엔드에 통합합니다. 이 과정에서는 API 연동, 데이터 흐름 및 사용자 인터페이스의 일관성을 확인합니다.
2. **통합 테스트 수행**: 시스템의 모든 구성 요소가 원활하게 작동하는지 검증하기 위해 통합 테스트를 수행합니다.

### 성능 및 사용성 테스트

1. **성능 테스트**: 시스템의 응답 시간, 처리 능력 및 안정성을 평가하기 위해 성능 테스트를 실시합니다.
2. **사용성 테스트**: 실제 사용자를 대상으로 한 사용성 테스트를 통해 사용자 인터페이스의 직관성과 사용 편의성을 평가합니다.

## 7단계: 사용자 피드백 수집 및 시스템 개선

시스템을 실제 환경에 배포한 후, 사용자로부터의 피드백을 수집하고 이를 바탕으로 시스템을 지속적으로 개선합니다. 사용자의 의견과 경험은 시스템을 개선하는 데 있어 중요한 자원입니다.

### 사용자 피드백 수집

1. **피드백 채널 마련**: 사용자가 의견을 쉽게 제시할 수 있는 피드백 채널을 마련합니다. 예를 들어, 온라인 설문조사, 사용자 포럼, 직접적인 피드백 수집 등이 있습니다.
2. **데이터 분석을 통한 통찰**: 사용자 행동 데이터를 분석하여 사용자의 선호와 행동 패턴을 파악합니다.

### 지속적인 개선

1. **사용자의 요구 반영**: 수집된 피드백을 바탕으로 사용자 인터페이스, 기능 및 전반적인 사용자 경험을 개선합니다.
2. **기술적 최적화**: 시스템의 성능, 안정성 및 확장성을 개선하기 위한 기술적 최적화를 지속적으로 수행합니다.

### 결론

이 단계를 통해, 시스템은 통합되고 테스트되며, 사용자의 의견을 반영하여 지속적으로 발전합니다. 이 과정은 사용자 중심의 접근 방식을 채택하여, 사용자 만족도를 높이고, 시스템의 효과성을 극대화하는 데 중점을 둡니다.

## 8단계: 시스템의 완성 및 지속적인 발전

이제 우리의 스마트 페이지 추천 시스템은 완성되었으며, 실제 사용 환경에서 그 성능을 발휘하고 있습니다. 사용자의 피드백을 통해 지속적인 개선을 이루며, 사용자에게 최적화된 경험을 제공하기 위한 노력은 계속됩니다. 이 시스템은 단순히 페이지를 추천하는 것을 넘어 사용자에게 가치 있는 콘텐츠를 제공하고, 웹사이트의 전반적인 사용자 만족도를 높이는 데 기여합니다.

## 결론: 혁신적인 사용자 경험을 위한 여정

우리의 여정, "스마트 페이지 추천 시스템 개발기"는 이제 마무리됩니다. 이 시리즈를 통해, 우리는 단순한 웹사이트 기능을 넘어서 사용자에게 맞춤형 경험을 제공하는 방법에 대해 탐구했습니다.

### 주요 성과

1. **사용자 맞춤형 추천**: 우리는 각 사용자의 방문 이력과 관심사를 분석하여, 개인화된 페이지 추천을 제공하는 방법을 탐구했습니다.
2. **GPT API를 활용한 키워드 추출**: 최신 AI 기술을 활용하여 각 페이지의 중요한 키워드를 추출함으로써, 추천 시스템의 정확도를 높였습니다.
3. **웹 개발자의 AI 활용 방법에 대한 고찰**: AI에 대한 심도있는 이해가 없이도, 각종 서비스를 활용해 AI를 자신의 서비스에 통합할 수 있는 방법을 사용할 수 있게 되었습니다.

이 시리즈를 통해 공유된 경험과 지식이 여러분의 프로젝트에 영감을 주기를 바라며, 이 분야에서의 여러분의 도전과 혁신을 기대합니다.
