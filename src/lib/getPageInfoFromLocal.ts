import fs from 'fs';

const getPageInfoFromLocal = (path: string): PageFetchData[] => {
	fs.readFileSync('./mock/result_get_page_info.json');

	return JSON.parse(fs.readFileSync(path, 'utf8'));
};

export default getPageInfoFromLocal;
