import {
    AuthApi,
    AuthApiFactory,
    MetadataAnalysisApiFactory,
    MetadataAnalysisApi
} from 'metadataanalysis-client'

import {
    Token,
    AnalyzeRequest,
    AnalyzedTextResponse,
    KnowledgeGraphSearchResponse,
    TranslateTextRequest,
    TranslateTextResponse
} from 'metadataanalysis-client/model'

const fs = require('fs');

const appConfigFile: string = <string> process.env.APP_CONFIG_FILE;
const appConfig = JSON.parse(fs.readFileSync(appConfigFile).toString());

const client: string = appConfig['clientKey'];
const secret: string = appConfig['clientSecret'];

const projectServiceId: string = appConfig['projectServiceId'];
const baseUrl: string = appConfig['host'];

const main = async () => {
    try {
        console.log("Starting Metadata Analysis process ...");

        // Get API access-token for the this client.
        const authApi: AuthApi = <AuthApi>AuthApiFactory({}, baseUrl);
        const token: Token = (await authApi.getAccessToken(client, secret)).data;
        console.log(token);

        // Update MetadataAnalysis API with the generated access token
        const metadataAnalysisApi: MetadataAnalysisApi = <MetadataAnalysisApi>MetadataAnalysisApiFactory({apiKey: token.authorization}, baseUrl);

        // Analyze request.
        let request: AnalyzeRequest = <AnalyzeRequest>{
            text: 'President Donald Trump tried to explain his agitating approach to life, politics and the rest of the world in a flash of impatience during a blustery news conference in France.   It\'s the way I negotiate. It\'s done me well over the years and it\'s doing even better for the country, I think,  he said.',
            extractors: ["entities", "topics"],
            extractorsScoreThreshold: 0.5,
            classifiers: ["IPTCNewsCodes", "IPTCMediaTopics"],
            classifierScoreThreshold: 0.5
        };
        console.log(JSON.stringify(request));

        const atResponse: AnalyzedTextResponse = (await metadataAnalysisApi.analyze(projectServiceId, request)).data;
        console.log(JSON.stringify(atResponse, null, 4));

        // Knowledge graph search request.  Collect detected entities aligned to the Knowledge graph
        const ids: Array<string> = atResponse.entities
            .filter(e => e.mid)
            .map(e => <string>e.mid);

		// Request additional info on entities aligned to the Knowledge Graph.
        const kgResponse: KnowledgeGraphSearchResponse = (await metadataAnalysisApi.knowledgeGraphSearch(projectServiceId, ids)).data;
        console.log(JSON.stringify(kgResponse, null, 4));

        // Translate text.
        const translateTextRequest: TranslateTextRequest = <TranslateTextRequest>{
            text: "President Donald Trump tried to explain his agitating approach to life",
            targetLanguage: "RU"
        };
        const translateTextResponse: TranslateTextResponse = (await metadataAnalysisApi.translateText(projectServiceId, translateTextRequest)).data;
        console.log(JSON.stringify(translateTextResponse, null, 4));

        console.log("Metadata Analysis process has finished successfully");

    } catch (e) {
        console.log(e);
    }
};

main().catch();
