import {
    IAuthenticateGeneric,
    ICredentialType,
	ICredentialTestRequest,
    INodeProperties,
} from 'n8n-workflow';

export class WrangleAi implements ICredentialType {
    name = 'wrangleAiApi';
    displayName = 'WrangleAI API';
    documentationUrl = 'https://staging-landing.wrangleai.com/docs/quick-start';
    icon = 'file:WrangleAi.svg' as any;

    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            placeholder: 'sk-wrangle-921...',

            // Text displayed beneath the input field 
			// eslint-disable-next-line n8n-nodes-base/node-param-description-unneeded-backticks
            description: `API key for Wrangle AIs optimized Ai keys`,
            hint:'🔑 <b>NO KEY?</b> <a href="https://staging-landing.wrangleai.com/dashboard/optimized-key/apis" target="_blank">CLICK HERE TO GET YOUR API KEY &rarr;</a>',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'X-API-Key': '={{$credentials.apiKey}}',
            },
        },
    };
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://gateway.wrangleai.com',
			url: '/v1/keys/verify',
			method: 'GET',
		},
	};
}