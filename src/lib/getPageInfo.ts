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
