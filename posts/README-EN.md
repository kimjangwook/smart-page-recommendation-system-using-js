# Developing a Smart Page Recommendation System in JavaScript

Developing a smart page recommendation system in JavaScript, leveraging user browsing history and AI-powered keyword analysis for personalized content suggestions.

## Introduction

Amidst the endless information on the internet, users often struggle to find content that is relevant to them. While search engine and social media algorithms play a big role in providing personalized information, personalizing the user's experience on the website itself is still a major challenge. In this situation, the ability of a website to automatically recommend relevant content based on the user's interests and preferences can revolutionize the user experience.

With this background, I decided to develop a page recommendation system using JavaScript. The goal of this system is simple. It is to analyze what pages the user has visited on the website, and based on that, determine the user's interests and recommend pages with similar topics that they have not yet visited.

In this blog series, I will share the development process of this project step by step, including the challenges I encountered along the way, solutions, and even real-world examples of coding to give you a real-world experience of web development using JavaScript. I hope this series will be of practical help to readers interested in web development, and I look forward to your feedback and advice.

## Step 1: The technical foundation of the project - choosing SvelteKit and building the project

Before starting this project, I considered many technology options and came to the conclusion that SvelteKit was the best choice. SvelteKit is a framework that fulfills the needs of modern web development: fast loading times, great performance, and efficient integration of server-side and client-side.

To create the project, we ran the following commands

```sh
npm create svelte@latest smart-page-recommendation-system-using-js
cd smart-page-recommendation-system-using-js
yarn install
yarn dev
```

> I used node v20.10.0 and selected the Skeleton project, using Typescript syntax option when creating the project.

## Step 2: Create a list of URLs - Crawl your website pages to collect the URLs of all pages on your site

The first step to analyzing all the pages of a website is to collect the URLs of all the pages on the site. To do this, we first need to install some required libraries. In this project, we will use `puppeteer` and `cheerio`. `puppeteer` is a library that provides an API to control Chrome or Chromium in the background and is used to get information about pages that are dynamically loaded after a page is accessed. Cheerio` is perfect for analyzing HTML in a similar way to jQuery on the server side.

```sh
yarn add puppeteer cheerio
```

I used both libraries to access each page, and wrote TypeScript code to extract the links from inside the HTML.

### Set the type required for your project

Since I'll be using TypeScript, setting the type was my first priority. I created a file called `src/ambient.d.ts` and wrote the following code.

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

### Implementing the URL extraction logic

First, I implemented a function in the `src/lib/getPageInfo.ts` file that generates a list of URLs. Starting from a given URL, the function recursively finds all links within the same domain and stores them in an array. It also stores the text of the HTML after each page is accessed.

I set the timeout to 6000ms for a fast execution, but you may want to set it appropriately in your own code.

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

The code uses the URL received as the first parameter as a starting point, and uses `puppeteer` to fetch the HTML of that page. It then uses `cheerio` to find all the links (`a` tags) within the page, and adds them to the resulting array. Logic is also included for duplicate prevention and same domain checking.

### Implementation of the SvelteKit server route

Next, we implemented server routes in the `src/routes/+page.server.ts` file, adding the ability to get and return a list of URLs and HTML for the domain entered by the user.

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

This code calls the `getPageInfo` function based on the domain input from the user, and returns the resulting `PageFetchData` list to the client side.

### Frontend implementation

Finally, we implemented a user interface in the `src/routes/+page.svelte` file, which provides a simple form for the user to enter a domain and request a list of URLs for that domain.

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

When the user submits the form, a list of URLs for the entered domain is displayed on the screen. This list of URLs is later used to extract and analyze data from the pages.

This is an important step to collect the URLs of all the pages on your website. The collected URLs will be used in the next step, extracting and analyzing the page data.

## Step 3: Send each page's information to the GPT API to collect keywords for each page

The HTML data collected from each page of your website contains a wealth of information. Effectively analyzing and organizing this information to extract the keywords of a page is an important step in providing personalized recommendations to users. To do this, we implemented logic to extract the keywords of each page using OpenAI's Generative Pre-trained Transformer (GPT) API.

> I used OpenAI's API for ease of use, but you can also use a library like `ollama-node` to accomplish the same thing for free.

### Install required libraries

We need to install the `openai` library, which is required to communicate with the GPT API.

```sh
yarn add openai
```

### Implementing the keyword extraction logic using the GPT API

As a first step, we created the file `src/lib/getKeywordsUsingOpenAI.ts`, which implements a function that sends HTML text to the GPT API and extracts an array of keywords based on its content.

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

This function takes HTML text as input, analyzes the page for keywords via the GPT API, and returns the results as an array.

### Apply the keyword extraction logic from the server routes

Next, we pass each page's HTML data collected via the `getPageInfo` function in the `src/routes/+page.server.ts` file to the `getKeywordsUsingOpenAI` function to extract each page's keywords.

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

This code fetches the HTML data for each page, extracts the keywords using the GPT API, and adds them to the `PageFetchData` object.

> The `gpt-3.5-turbo-1106` model of the OpenAI API has a limit of 60,000 tokens per minute, so we added `wait` logic to avoid hitting the limit.

### Displaying keywords on the frontend

Finally, modify the `src/routes/+page.svelte` file to display a list of keywords for each page to the user.

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

This user interface shows the user a list of each URL and its corresponding keywords in a table. This gives the user a quick overview of what each page is about.

### Conclusion

In three steps, we implemented the ability to extract important keywords from each page of a website. These extracted keywords can then be matched with the user's interests and used for personalized page recommendations. This method, utilizing the GPT API, goes a long way in reducing the complexity of page content and presenting the most relevant content to users.

## Step 4: Analyze user visit history and identify interests

Based on the results of step 3, we now enter step 4, which is to analyze the user's browsing history to derive interests for personalized page recommendations. To determine the interests of each user, we plan to use a simple algorithm. We'll list the keywords of the pages the user accessed, see which keyword appeared the most, and set the user's interests to the keyword that appeared the most. If there are multiple keywords with the same number of occurrences, we will set the first occurrence as the interest.

To start, we created the following mock data for our analysis.

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

### Extract user's keyword frequency

In the file `/src/lib/analyzeUserKeywords.ts`, we'll write code to extract how many times each user accessed which keywords and what related pages exist for each keyword based on the mock data and page data.

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

### Applying user keyword analysis logic in the server route

Based on the data collected from each page of your website, we've implemented a process on the server side that analyzes a user's browsing history to determine their personal interests. This process analyzes the keywords on each of the user's landing pages, and considers the most frequently occurring keywords to be the user's main interests.

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

This code collects page information for the domain submitted by the user, and analyzes the user's interests based on that information.

### Displaying user keyword analysis on the frontend

The front-end implementation of displaying the analysis results to the user provides a visual representation of the keywords and their frequency on the pages visited by each user. Users' visited pages, related keywords, and the results of interest analysis based on them are displayed in a table.

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

This interface displays the analyzed page information and interests of each user based on the domain entered by the user, providing the basis for personalized page recommendations for each user.

### Conclusion

In four steps, we have implemented an algorithm that analyzes users' browsing history and derives each user's interests based on it. This data plays an important role in recommending customized content to users. In the next step, we will design and implement an algorithm to select pages to recommend to the actual user based on these interests.

## Step 5: Design and implement a recommendation algorithm

After identifying user-specific interests in step 4, we will now use this information to design and implement a personalized page recommendation algorithm. The goal of this step is to effectively identify and recommend pages that are most relevant to the user's interests.

### Design the recommendation algorithm

1. **Scoring Criteria**: The score for each page is based on the match between the page's keywords and the user's interests. If the page's keywords match the user's interests, the score is proportional to the number of user visits for those keywords.
2. Page Recommendation Criteria: Pages with a higher assigned score are prioritized for recommendation. Excludes pages that have already been visited, and recommends pages that the user has not yet visited.

### Algorithm implementation

Implement the recommendation algorithm in the `src/lib/recommendPages.ts` file. This function recommends the most appropriate pages based on the user's interests and page data.

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

### Apply the recommendation algorithm in the server route

Apply the recommendation algorithm in the `src/routes/+page.server.ts` file to generate customized page recommendations for each user.

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

### Show recommendation results on the frontend

Finally, modify the `src/routes/+page.svelte` file to display personalized page recommendation results for each user.

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

This interface displays a list of recommended pages for each user, and helps them discover new content that might interest them.

### Conclusion

In five steps, we have successfully designed and implemented a personalized page recommendation algorithm based on each user's interests. The algorithm analyzes the user's previous visits and interests, and contributes to enhancing the user experience by providing personalized recommendations.

Through our journey through the five steps, we have taken a detailed look at the process of developing the system, which used a very simple algorithm, but we believe that we have been able to provide insights to develop a more sophisticated system through refinement.

What follows is not specifically within the scope of this blog post, but will describe the process of further refining the system.

## Step 6: Integrate and test the system

After completing the development and implementation of the recommendation algorithm, it's time to integrate it with the overall system and test its performance in a real-world environment. The goal of this step is to ensure the stability of the system and optimize the user experience.

### System integration

1. **Integrate frontend and backend**: Integrate the developed features into the frontend and backend of the website. This process checks for consistency in API integration, data flow, and user interface.
2. **Conduct integration tests**: Perform integration tests to verify that all components of the system are working smoothly.

### Performance and usability testing

1. **Performance testing**: Conduct performance testing to evaluate the response time, processing power, and stability of the system.
2. **Usability testing**: Conduct usability testing with real users to evaluate the intuitiveness and ease of use of the user interface.

## Step 7: Collect user feedback and improve the system

After deploying the system to the real world, we collect feedback from users and use it to continuously improve the system. Users' opinions and experiences are an important resource for improving the system.

### Collect user feedback

1. **Establish a feedback channel**: Establish a feedback channel that makes it easy for users to provide feedback. For example, online surveys, user forums, and direct feedback collection.
2. Insights from data analysis: Analyze user behavior data to understand user preferences and behavior patterns.

### Continuous Improvement

1. **Reflect user needs**: Improve user interface, functionality, and overall user experience based on collected feedback.
2. **Technical optimization**: Continuously perform technical optimizations to improve the performance, stability, and scalability of the system.

### Conclusion

Throughout this phase, the system is integrated, tested, and continuously evolves based on user input. The process adopts a user-centered approach, focusing on increasing user satisfaction and maximizing the effectiveness of the system.

## Step 8: Finalization and continuous evolution of the system

Our smart page recommendation system is now complete and is performing in the real world. We continue to make improvements based on user feedback and strive to provide an optimized experience for our users. The system goes beyond simply recommending pages to provide users with valuable content and contributes to the overall user satisfaction of the website.

## Conclusion: A Journey to Innovative User Experience

Our journey, "Developing a Smart Page Recommendation System", comes to a close. Throughout this series, we've explored how to go beyond simple website functionality and deliver a personalized experience to users.

### Key achievements

1. **Personalized Recommendations**: We explored how to provide personalized page recommendations by analyzing each user's browsing history and interests.
2. **Keyword extraction using GPT API**: By utilizing the latest AI technology to extract important keywords for each page, we improved the accuracy of our recommendation system.
3. **Discussion on how web developers can utilize AI**: Even without an in-depth understanding of AI, it is now possible to use various services to integrate AI into their services.

We hope that the experiences and knowledge shared through this series will inspire your projects, and we look forward to your challenges and innovations in this field.
