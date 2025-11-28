import { 
    INodeType, 
    INodeTypeDescription, 
    ISupplyDataFunctions, 
    SupplyData, 
    IDataObject
} from 'n8n-workflow';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { WrangleAiChatModel } from './WrangleAiChatModel';

export class WrangleAi implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Wrangle AI',
        documentationUrl: "https://wrangleai.com/docs/quick-start",
        name: 'wrangleAi', 
        icon: 'file:wrangleAi.svg',
        group: ['transform'],
        version: 1,
        description: "WrangleAI's model routing gateway",
        defaults: {
            name: 'Wrangle AI',
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
        properties: [
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://gateway.wrangleai.com/v1',
                description: 'The base URL of the WrangleAI API',
            },
            {
                displayName: 'Model',
                name: 'modelName',
                type: 'options',
                default: 'auto',
                description: "The model ID to send to the router, Use 'auto' for most optimal result",
                placeholder: 'e.g. gpt-4o-mini',
                options: [
					{
						name: 'Auto (Smart Routing)',
						value: 'auto',
						description: 'Automatically routes to the best model for the task',
					},
					// --- GPT 5 Series ---
					{
						name: 'GPT-5',
						value: 'gpt-5',
					},
					{
						name: 'GPT-5 Chat Latest',
						value: 'gpt-5-chat-latest',
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
						name: 'GPT-5 Mini',
						value: 'gpt-5-mini',
					},
					{
						name: 'GPT-5 Nano',
						value: 'gpt-5-nano',
					},
					// --- GPT 4 Series ---
					{
						name: 'GPT-4',
						value: 'gpt-4',
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
						name: 'GPT-4.1 Mini',
						value: 'gpt-4.1-mini',
					},
					// --- Gemini Series ---
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
					// --- Mistral / Codestral ---
					{
						name: 'Codestral 2',
						value: 'codestral-2',
					},
					{
						name: 'Codestral 2501',
						value: 'codestral-2501',
					},
					{
						name: 'Mistral Small 2503',
						value: 'mistral-small-2503',
					},
					// --- Open Source / Other ---
					{
						name: 'OpenAI GPT OSS 120b Maas',
						value: 'openai/gpt-oss-120b-maas',
					},
				],
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
                        placeholder: 'e.g. 500',
					},
					{
						displayName: 'N (Choices)',
						name: 'n',
						type: 'number',
						default: 1,
						description: 'How many chat completion choices to generate for each input message',
                        placeholder: 'e.g. 1',
					},
					{
						displayName: 'Stop Sequences',
						name: 'stop',
						type: 'string',
						default: '',
						description: 'Comma-separated list of sequences where the API will stop generating further tokens',
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
                        placeholder: 'e.g. 0.7',
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
                        placeholder: 'e.g. 0.7',
					},
                ],
            },
        ],
        credentials: [
            {
                name: 'wrangleAiApi', 
                required: true,
            },
        ],
    };

    async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
        const credentials = await this.getCredentials('wrangleAiApi');
        const baseUrl = this.getNodeParameter('baseUrl', itemIndex) as string;
        const modelName = this.getNodeParameter('modelName', itemIndex) as string;

        const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
        let stopSequences: string[] | undefined;
        if (options.stop) {
            stopSequences = (options.stop as string).split(',').map((s) => s.trim());
        }

        const model = new WrangleAiChatModel({
            modelName: modelName,
            apiKey: credentials.apiKey as string,
            baseUrl: baseUrl,
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