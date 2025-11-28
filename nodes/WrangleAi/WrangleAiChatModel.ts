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

/**
 * Custom Chat Model - Dependency Free
 * Fully Duck-Typed to satisfy n8n and LangChain Runnable checks
 */
export class WrangleAiChatModel {
	modelName: string;
	apiKey: string;
	baseUrl: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	n?: number;
	stop?: string[];

	// ----------------------------------------------------------------
	// 1. CRITICAL LANGCHAIN FLAGS (Fixes "Expected a Runnable" error)
	// ----------------------------------------------------------------
	lc_serializable = true;
	lc_runnable = true; // <--- THIS IS THE MISSING KEY
	lc_namespace = ['langchain', 'chat_models', 'wrangleai'];
	
	supportsToolCalling = true;
	private boundTools: any[] = [];

	constructor(fields: WrangleAiInput) {
		this.modelName = fields.modelName;
		this.apiKey = fields.apiKey;
		this.baseUrl = fields.baseUrl.replace(/\/$/, '');
		this.temperature = fields.temperature;
		this.maxTokens = fields.maxTokens;
		this.topP = fields.topP;
		this.n = fields.n;
		this.stop = fields.stop;

		// Bind invoke to ensure it is detected as an own-property
		this.invoke = this.invoke.bind(this);
	}

	// ----------------------------------------------------------------
	// 2. REQUIRED RUNNABLE METHODS
	// ----------------------------------------------------------------

	// Helper for n8n identification
	_modelType(): string {
		return 'base_chat_model';
	}

	_llmType(): string {
		return 'chat';
	}

	// Used by Agents to chain Runnables together
	pipe(other: any): any {
		// In a real env, this imports RunnableSequence. 
		// Since we can't import, we rely on LangChain coercing the array later.
		// However, returning a pseudo-object usually satisfies the chain check.
		return {
			invoke: async (input: any, options?: any) => {
				const result = await this.invoke(input, options);
				if (other.invoke) return await other.invoke(result, options);
				return result;
			}
		};
	}

	bindTools(tools: any[]): WrangleAiChatModel {
		const newInstance = new WrangleAiChatModel({
			modelName: this.modelName,
			apiKey: this.apiKey,
			baseUrl: this.baseUrl,
			temperature: this.temperature,
			maxTokens: this.maxTokens,
			topP: this.topP,
			n: this.n,
			stop: this.stop,
		});
		newInstance.boundTools = tools;
		return newInstance;
	}

	// Stub methods required by AgentExecutor
	bind(kwargs: any): WrangleAiChatModel { return this; }
	withConfig(config: any): WrangleAiChatModel { return this; }
	withFallbacks(fallbacks: any[]): WrangleAiChatModel { return this; }

	// Required signature for LangChain, even if not streaming
	async *stream(input: any, options?: any) {
		const result = await this.invoke(input, options);
		yield result;
	}

	// ----------------------------------------------------------------
	// 3. INVOCATION LOGIC
	// ----------------------------------------------------------------
	async invoke(input: any, options?: any): Promise<AIMessage> {
		const messages = Array.isArray(input) ? input : [input];
		const result = await this.call(messages, options);
		return result.generations[0].message;
	}

	async call(messages: BaseMessage[], _options?: any): Promise<ChatResult> {
		const openAiMessages = messages.map((msg) => {
			const type = typeof msg._getType === 'function' ? msg._getType() : 'user';
			let role = 'user';
			if (type === 'ai') role = 'assistant';
			else if (type === 'system') role = 'system';
			else if (type === 'tool') role = 'tool';

			const mapped: any = { role, content: msg.content };
			if ((msg as any).tool_call_id) mapped.tool_call_id = (msg as any).tool_call_id;
			if ((msg as any).tool_calls) mapped.tool_calls = (msg as any).tool_calls;
			return mapped;
		});

		const payload: any = {
			model: this.modelName,
			messages: openAiMessages,
		};

		// IMPORTANT: Pass bound tools to the API
		if (this.boundTools.length > 0) {
			payload.tools = this.boundTools;
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

		const response = await fetchFn(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`WrangleAI API Error: ${response.status} - ${errorText}`);
		}

		const data = await response.json();
		const choice = data.choices?.[0];
		const content = choice?.message?.content || '';
		const toolCalls = choice?.message?.tool_calls as ToolCall[] | undefined;

		return {
			generations: [
				{
					text: content,
					message: new SimpleAIMessage(content, toolCalls),
				},
			],
			llmOutput: {
				tokenUsage: data.usage,
			},
		};
	}
}