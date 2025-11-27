import { 
    INodeType, 
    INodeTypeDescription, 
    ISupplyDataFunctions, 
    SupplyData, 
    IDataObject
} from 'n8n-workflow';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { ChatOpenAI } from '@langchain/openai';

export class WrangleAi implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Wrangle AI',
        documentationUrl: "https://wrangleai.com/docs/quick-start",
        name: 'wrangleAi', 
        icon: 'file:wrangleAi.svg',
        group: ['transform'],
        version: 1,
        description: 'WrangleAIs model routing gateway',
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
                displayName: 'Model Name',
                name: 'modelName',
                type: 'string',
                default: 'auto',
                description: "The model ID to send to the router, Use 'auto' for most optimal result",
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
						description: 'Comma-separated list of sequences where the API will stop generating further tokens',
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

        const model = new ChatOpenAI({
            modelName: modelName,
            apiKey: credentials.apiKey as string,
            configuration: {
                baseURL: baseUrl,
            },
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