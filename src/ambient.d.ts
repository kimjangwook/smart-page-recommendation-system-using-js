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
