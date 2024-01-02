import { OPENAI_API_KEY } from '$env/static/private';
import OpenAI from 'openai';

const getKeywordsUsingOpenAI = async (html: string): Promise<string[]> => {
	const openai = new OpenAI({
		apiKey: OPENAI_API_KEY
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
