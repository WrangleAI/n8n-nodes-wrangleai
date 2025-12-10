/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
interface BaseMessage {
	content: string;
	_getType(): string;
	additional_kwargs?: Record<string, unknown>;
}

interface ToolCall {
	name: string;
	args: Record<string, unknown>;
	id: string;
}

interface AIMessage extends BaseMessage {
	tool_calls?: ToolCall[];
}

interface ChatResult {
	generations: Array<{
		text: string;
		message: AIMessage;
	}>;
	llmOutput?: {
		tokenUsage?: unknown;
	};
}

export interface WrangleAiInput {
	modelName: string;
	apiKey: string;
	baseUrl: string;
	webSearch?: boolean;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	n?: number;
	stop?: string[];
}

class SimpleAIMessage implements AIMessage {
	content: string;
	tool_calls?: ToolCall[];
	additional_kwargs: Record<string, unknown>;

	constructor(content: string, toolCalls?: ToolCall[]) {
		this.content = content;
		this.tool_calls = toolCalls;
		this.additional_kwargs = {};
	}

	_getType(): string {
		return 'ai';
	}
}

function getFetch() {
	const g = new Function('return this')();
	return g.fetch;
}

function convertZodToJsonSchema(zodObj: any): any {
	if (!zodObj || !zodObj._def) return { type: 'string' };

	const def = zodObj._def;
	const typeName = def.typeName;

	if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
		return convertZodToJsonSchema(def.innerType);
	}

	if (typeName === 'ZodObject') {
		const properties: any = {};
		const required: string[] = [];
		
		const shape = typeof def.shape === 'function' ? def.shape() : def.shape;

		for (const key in shape) {
			const childSchema = convertZodToJsonSchema(shape[key]);
			properties[key] = childSchema;
			if (shape[key]._def.typeName !== 'ZodOptional' && shape[key]._def.typeName !== 'ZodNullable') {
				required.push(key);
			}
			if (shape[key].description) {
				properties[key].description = shape[key].description;
			}
		}

		return {
			type: 'object',
			properties,
			required,
			additionalProperties: false, 
		};
	}

	if (typeName === 'ZodArray') {
		return {
			type: 'array',
			items: convertZodToJsonSchema(def.type),
		};
	}

	if (typeName === 'ZodString') return { type: 'string' };
	if (typeName === 'ZodNumber') return { type: 'number' };
	if (typeName === 'ZodBoolean') return { type: 'boolean' };
	if (typeName === 'ZodEnum') return { type: 'string', enum: def.values };
    if (typeName === 'ZodNativeEnum') return { type: 'string', enum: Object.values(def.values) };

    if (def.description && def.innerType) {
        const inner = convertZodToJsonSchema(def.innerType);
        inner.description = def.description;
        return inner;
    }

	return { type: 'string' };
}

const WEB_SEARCH_TOOL_DEF = {
	type: 'function',
	function: {
		name: 'wrangle_web_search',
		description: 'Search the internet for current information, facts, news, or data.',
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query',
				},
			},
			required: ['query'],
		},
	},
};

interface OpenAIToolCall {
	id: string;
	type: string;
	function: {
		name: string;
		arguments: string;
	};
}

function formatToolToOpenAI(tool: any): any {
	if (tool.type === 'function' && tool.function) {
		return tool;
	}

	const name = tool.name;
	const description = tool.description;
	const schema = tool.schema || tool.parameters;
	let parameters: any = { type: 'object', properties: {} };

	if (tool.jsonSchema) {
		try {
			parameters = JSON.parse(JSON.stringify(tool.jsonSchema));
			delete parameters.$schema;
		} catch (e) {
			//ignore
		 }
	}
	else if (schema) {
		if (schema._def) {
			try {
				parameters = convertZodToJsonSchema(schema);
			} catch (e) { //ignore
				 }
		} else {
			parameters = schema;
		}
	}
	if (parameters && parameters.type !== 'object') {
		parameters = {
			type: 'object',
			properties: {
				input: parameters
			},
			required: ['input'],
			additionalProperties: false
		};
	}

	if (parameters.type === 'object' && !parameters.properties) {
		parameters.properties = {};
	}

	if (name && description) {
		return {
			type: 'function',
			function: {
				name: name,
				description: description,
				parameters: parameters,
			},
		};
	}

	return tool;
}



export class WrangleAiChatModel {
	modelName: string;
	apiKey: string;
	baseUrl: string;
	webSearch?: boolean;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	n?: number;
	stop?: string[];

	lc_serializable = true;
	lc_runnable = true;
	lc_namespace = ['langchain', 'chat_models', 'wrangleai'];

	supportsToolCalling = true;
	private boundTools: any[] = [];

	constructor(fields: WrangleAiInput) {
		this.modelName = fields.modelName;
		this.apiKey = fields.apiKey;
		this.baseUrl = fields.baseUrl.replace(/\/$/, '');
		this.webSearch = fields.webSearch;
		this.temperature = fields.temperature;
		this.maxTokens = fields.maxTokens;
		this.topP = fields.topP;
		this.n = fields.n;
		this.stop = fields.stop;

		this.invoke = this.invoke.bind(this);
	}

	_modelType(): string {
		return 'base_chat_model';
	}

	_llmType(): string {
		return 'chat';
	}

	pipe(other: any): any {
		return {
			invoke: async (input: any, options?: any) => {
				const result = await this.invoke(input, options);
				if (other.invoke) return await other.invoke(result, options);
				return result;
			},
		};
	}

	bindTools(tools: any[]): WrangleAiChatModel {
		const newInstance = new WrangleAiChatModel({
			modelName: this.modelName,
			apiKey: this.apiKey,
			baseUrl: this.baseUrl,
			webSearch: this.webSearch,
			temperature: this.temperature,
			maxTokens: this.maxTokens,
			topP: this.topP,
			n: this.n,
			stop: this.stop,
		});
		newInstance.boundTools = tools.map(formatToolToOpenAI);
		return newInstance;
	}

	bind(kwargs: any): WrangleAiChatModel {
		return this;
	}
	withConfig(config: any): WrangleAiChatModel {
		return this;
	}
	withFallbacks(fallbacks: any[]): WrangleAiChatModel {
		return this;
	}
	async *stream(input: any, options?: any) {
		const result = await this.invoke(input, options);
		yield result;
	}

	async invoke(input: any, options?: any): Promise<AIMessage> {
		const messages = Array.isArray(input) ? input : [input];
		const result = await this.call(messages, options);
		return result.generations[0].message;
	}

	async call(messages: any, _options?: any): Promise<ChatResult> {
		let rawMessages: any[] = [];

		if (Array.isArray(messages)) {
			rawMessages = messages;
		} else {
			rawMessages = [messages];
		}

		const actualMessages: any[] = [];
		for (const msg of rawMessages) {
			if (msg.kwargs && Array.isArray(msg.kwargs.messages)) {
				actualMessages.push(...msg.kwargs.messages);
			} else if (msg.messages && Array.isArray(msg.messages)) {
				actualMessages.push(...msg.messages);
			} else {
				actualMessages.push(msg);
			}
		}

		const openAiMessages = actualMessages.map((msg) => {
			let role = 'user';

			if (msg.id && Array.isArray(msg.id)) {
				const type = msg.id[msg.id.length - 1];
				if (type === 'AIMessage') role = 'assistant';
				else if (type === 'SystemMessage') role = 'system';
				else if (type === 'ToolMessage') role = 'tool';
			} else if (msg.kwargs?.type) {
				const type = msg.kwargs.type;
				if (type === 'ai') role = 'assistant';
				else if (type === 'system') role = 'system';
				else if (type === 'tool') role = 'tool';
			} else if (typeof msg._getType === 'function') {
				const type = msg._getType();
				if (type === 'ai') role = 'assistant';
				else if (type === 'system') role = 'system';
				else if (type === 'tool') role = 'tool';
			}

			let content = '';
			if (msg.content) {
				content = msg.content;
			} else if (msg.kwargs && msg.kwargs.content) {
				content = msg.kwargs.content;
			} else if (msg.pageContent) {
				content = msg.pageContent;
			}

			if (Array.isArray(content)) {
				content = content
					.filter((c: any) => c.type === 'text')
					.map((c: any) => c.text)
					.join('');
			}

			const mapped: any = { role, content: content || '' };

			if (msg.kwargs?.tool_call_id) mapped.tool_call_id = msg.kwargs.tool_call_id;
			if (msg.kwargs?.tool_calls) mapped.tool_calls = msg.kwargs.tool_calls;

			const rawToolCalls = msg.kwargs?.tool_calls || msg.tool_calls;
            if (rawToolCalls && Array.isArray(rawToolCalls)) {
                mapped.tool_calls = rawToolCalls.map((tc: any) => {
                    let cleanArgs = tc.args;
                    if (typeof cleanArgs === 'object' && cleanArgs !== null) {
                        cleanArgs = { ...cleanArgs }; 
                        delete cleanArgs.id;
                    }

                    return {
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.name || tc.function?.name,
                            arguments: typeof cleanArgs === 'object' ? JSON.stringify(cleanArgs) : (cleanArgs || tc.function?.arguments || '{}')
                        }
                    };
                });
            }

			if (msg.tool_call_id && !mapped.tool_call_id) mapped.tool_call_id = msg.tool_call_id;
			if (msg.tool_calls && !mapped.tool_calls) mapped.tool_calls = msg.tool_calls;

			return mapped;
		});

		const payload: any = {
			model: this.modelName,
			messages: openAiMessages,
		};

		const tools = [...this.boundTools];
		if (this.webSearch) {
			tools.push(WEB_SEARCH_TOOL_DEF);
		}

		if (tools.length > 0) {
			payload.tools = tools;
			payload.tool_choice = 'auto';
		}

		if (this.temperature !== undefined) payload.temperature = this.temperature;
		if (this.maxTokens !== undefined) payload.max_tokens = this.maxTokens;
		if (this.topP !== undefined) payload.top_p = this.topP;
		if (this.n !== undefined) payload.n = this.n;
		if (this.stop !== undefined && this.stop.length > 0) payload.stop = this.stop;

		const endpoint = this.baseUrl.endsWith('/chat/completions')
			? this.baseUrl
			: `${this.baseUrl}/chat/completions`;

		const fetchFn = getFetch();
		if (!fetchFn) throw new Error('Global fetch not available. Node 18+ required.');

		const makeRequest = async (requestPayload: any) => {
			const response = await fetchFn(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(requestPayload),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`WrangleAI API Error: ${response.status} - ${errorText}`);
			}
			return response.json();
		};

		let data = await makeRequest(payload);

		const firstChoice = data.choices?.[0];
		const firstToolCall = firstChoice?.message?.tool_calls?.[0];

		if (firstToolCall && firstToolCall.function.name === 'wrangle_web_search') {
			let query = 'current events';
			try {
				const args = JSON.parse(firstToolCall.function.arguments);
				query = args.query;
			} catch (e) { /* ignore */ }

			let searchResultText = "Search failed or returned no results.";
			try {
				const searchPayload = {
					model: this.modelName,
					messages: [{ role: 'user', content: query }],
					tools: [{ type: 'web_search', external_web_access: true }] 
				};

				const searchResp = await fetchFn(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.apiKey}`,
					},
					body: JSON.stringify(searchPayload),
				});

				if (searchResp.ok) {
					const searchData = await searchResp.json();
					if (searchData.output) {
						let txt = "";
						searchData.output.forEach((o: any) => {
							if(o.type === 'message' && o.content) {
								o.content.forEach((c: any) => { 
									if(c.type === 'output_text') txt += c.text + "\n"; 
								});
							}
						});
						if (txt) searchResultText = txt;
					} else if (searchData.choices) {
						searchResultText = searchData.choices[0].message.content;
					}
				}
			} catch (e) {
				//ignore
			}

			openAiMessages.push({
				role: 'assistant',
				content: null,
				tool_calls: [
					{
						id: firstToolCall.id,
						type: 'function',
						function: {
							name: 'wrangle_web_search',
							arguments: firstToolCall.function.arguments
						}
					}
				]
			});
			
			openAiMessages.push({
				role: 'tool',
				tool_call_id: firstToolCall.id,
				content: searchResultText
			});

			payload.messages = openAiMessages;
			data = await makeRequest(payload);
		}

		let responseContent = '';
		let toolCalls: ToolCall[] | undefined;

		if (data.output && Array.isArray(data.output)) {
			data.output.forEach((item: any) => {
				if (item.type === 'message' && item.content) {
					item.content.forEach((c: any) => {
						if (c.type === 'output_text') {
							responseContent += c.text || '';
						}
					});
				}
			});
		} else if (data.choices && data.choices.length > 0) {
			const choice = data.choices[0];
			responseContent = choice.message?.content || '';
			
			const rawToolCalls = choice.message?.tool_calls as OpenAIToolCall[] | undefined;
			if (rawToolCalls && rawToolCalls.length > 0) {
				toolCalls = rawToolCalls.map((tc) => {
					let args = {};
					try {
						args = JSON.parse(tc.function.arguments);
					} catch (e) {
						//ignore
					 }
					
					if (args && typeof args === 'object' && 'id' in args) {
						delete (args as any).id;
					}

					return {
						name: tc.function.name,
						args: args,
						id: tc.id,
					};
				});
			}
		}
		return {
			generations: [
				{
					text: responseContent,
					message: new SimpleAIMessage(responseContent, toolCalls),
				},
			],
			llmOutput: {
				tokenUsage: data.usage,
			},
		};
	}
}