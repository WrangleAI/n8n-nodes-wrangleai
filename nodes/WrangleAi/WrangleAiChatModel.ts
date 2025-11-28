import { BaseChatModel, type BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models'; 
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

interface WrangleAiCallOptions extends BaseChatModelCallOptions {
    tools?: any[];
}

interface WrangleAiInput extends BaseChatModelParams {
    modelName: string;
    apiKey: string;
    baseUrl: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    n?: number;
    stop?: string[];
}

export class WrangleAiChatModel extends BaseChatModel<WrangleAiCallOptions> {
    modelName: string;
    apiKey: string;
    baseUrl: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    n?: number;
    stop?: string[];

    constructor(fields: WrangleAiInput) {
        super(fields);
        this.modelName = fields.modelName;
        this.apiKey = fields.apiKey;
        this.baseUrl = fields.baseUrl.replace(/\/$/, '');
        this.temperature = fields.temperature;
        this.maxTokens = fields.maxTokens;
        this.topP = fields.topP;
        this.n = fields.n;
        this.stop = fields.stop;
    }

    _llmType(): string {
        return 'wrangle_ai';
    }

    override bindTools(tools: any[]): any {
        return this;
    }

    async _generate(
        messages: BaseMessage[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        
        const openAiMessages = messages.map((message) => {
            let role = 'user';
            if (message._getType() === 'ai') role = 'assistant';
            if (message._getType() === 'system') role = 'system';
            
            return {
                role: role,
                content: message.content,
            };
        });

        const payload: any = {
            model: this.modelName,
            messages: openAiMessages,
        };

        if (this.temperature !== undefined) payload.temperature = this.temperature;
        if (this.maxTokens !== undefined) payload.max_tokens = this.maxTokens;
        if (this.topP !== undefined) payload.top_p = this.topP;
        if (this.n !== undefined) payload.n = this.n;
        if (this.stop !== undefined && this.stop.length > 0) payload.stop = this.stop;

        const endpoint = this.baseUrl.endsWith('/chat/completions') 
            ? this.baseUrl 
            : `${this.baseUrl}/chat/completions`;

        const fetchFn = (globalThis as any).fetch;
        if (!fetchFn) throw new Error('Global fetch is not available.');

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
            throw new Error(`WrangleAI API Error: ${response.status} ${errorText}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await response.json();
        const choice = data.choices?.[0];
        const content = choice?.message?.content || '';

        return {
            generations: [
                {
                    text: content,
                    message: new AIMessage(content),
                },
            ],
            llmOutput: {
                tokenUsage: data.usage,
            },
        };
    }
}