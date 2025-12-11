import {
    IAuthenticateGeneric,
    ICredentialType,
	ICredentialTestRequest,
    INodeProperties,
    Icon
} from 'n8n-workflow';

export class WrangleAiApi implements ICredentialType {
    name = 'wrangleAiApi';
    displayName = 'WrangleAI API';
    documentationUrl = 'https://wrangleai.com/docs/quick-start';
    icon:Icon = 'file:../nodes/WrangleAi/wrangleAi.svg';

    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            placeholder: 'sk-wrangle-921...',
            description: "API key for WrangleAI's optimized AI models",
            hint:'🔑 <b>NO KEY?</b> <a href="https://wrangleai.com/dashboard/optimized-key/apis" target="_blank">CLICK HERE TO GET YOUR API KEY &rarr;</a>',
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