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
