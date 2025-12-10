import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { WrangleAiChatModel } from './WrangleAiChatModel';

export class WrangleAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wrangle AI',
		name: 'wrangleAi',
		icon: 'file:wrangleAi.svg',
		group: ['transform'],
		version: 1,
		description: 'Optimized WrangelAI LLM routing',
		defaults: {
			name: 'Wrangle AI',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://wrangleai.com/docs/quick-start',
					},
				],
			},
		},
		usableAsTool: true,
		inputs: [],
		outputs: [
			{
				displayName: 'Model',
				maxConnections: 1,
				type: 'ai_languageModel',
			},
		],
		credentials: [
			{
				name: 'wrangleAiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				default: 'https://gateway.wrangleai.com/v1',
			},
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description: 'The model to use for generating responses',
				default: 'auto',
				options: [
					{
						name: 'Auto (Smart Routing)',
						value: 'auto',
						description: 'Automatically routes to the best model for the task',
					},
					{
						name: 'Codestral 2',
						value: 'codestral-2',
					},
					{
						name: 'Codestral 2501',
						value: 'codestral-2501',
					},
					{
						name: 'Gemini 2.5 Flash',
						value: 'gemini-2.5-flash',
					},
					{
						name: 'Gemini 2.5 Flash Lite',
						value: 'gemini-2.5-flash-lite',
					},
					{
						name: 'Gemini 2.5 Pro',
						value: 'gemini-2.5-pro',
					},
					{
						name: 'GPT-4',
						value: 'gpt-4',
					},
					{
						name: 'GPT-4.1 Mini',
						value: 'gpt-4.1-mini',
					},
					{
						name: 'GPT-4o',
						value: 'gpt-4o',
					},
					{
						name: 'GPT-4o Mini',
						value: 'gpt-4o-mini',
					},
					{
						name: 'GPT-5',
						value: 'gpt-5',
					},
					{
						name: 'GPT-5 Chat Latest',
						value: 'gpt-5-chat-latest',
					},
					{
						name: 'GPT-5 Mini',
						value: 'gpt-5-mini',
					},
					{
						name: 'GPT-5 Nano',
						value: 'gpt-5-nano',
					},
					{
						name: 'GPT-5.1',
						value: 'gpt-5.1',
					},
					{
						name: 'GPT-5.1 Chat Latest',
						value: 'gpt-5.1-chat-latest',
					},
					{
						name: 'Mistral Small 2503',
						value: 'mistral-small-2503',
					},
					{
						name: 'OpenAI GPT OSS 120b Maas',
						value: 'openai/gpt-oss-120b-maas',
					},
				],
			},
			{
				displayName: 'Web Search',
				name: 'webSearch',
				type: 'boolean',
				default: false,
				description: 'Whether to enable online search capabilities. (Only gemini and openai models support Web Search currently!).',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 1500,
						description: 'The maximum number of tokens to generate in the completion',
					},
					{
						displayName: 'N (Choices)',
						name: 'n',
						type: 'number',
						default: 1,
						description: 'How many chat completion choices to generate for each input message',
					},
					{
						displayName: 'Stop Sequences',
						name: 'stop',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of sequences where the API will stop generating further tokens',
						placeholder: 'e.g. \n, user:',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: {
							minValue: 0,
							maxValue: 2,
						},
						description: 'Sampling temperature to use',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						typeOptions: {
							minValue: 0,
							maxValue: 1,
						},
						description: 'Nucleus sampling probability',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('wrangleAiApi');

		const baseUrl = this.getNodeParameter('baseUrl', itemIndex) as string;
		const modelName = this.getNodeParameter('modelName', itemIndex) as string;
		const webSearch = this.getNodeParameter('webSearch', itemIndex, false) as boolean;
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

		let stopSequences: string[] | undefined;
		if (options.stop) {
			stopSequences = (options.stop as string).split(',').map((s) => s.trim());
		}

		const model = new WrangleAiChatModel({
			modelName: modelName,
			apiKey: credentials.apiKey as string,
			baseUrl: baseUrl,
			webSearch: webSearch,
			temperature: options.temperature as number,
			maxTokens: options.maxTokens as number,
			topP: options.topP as number,
			n: options.n as number,
			stop: stopSequences,
		});

		return {
			response: model,
		};
	}
}