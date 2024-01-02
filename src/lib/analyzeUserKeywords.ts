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
