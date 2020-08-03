"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const metadataanalysis_client_1 = require("metadataanalysis-client");
const fs = require('fs');
const appConfigFile = process.env.APP_CONFIG_FILE;
const appConfig = JSON.parse(fs.readFileSync(appConfigFile).toString());
const client = appConfig['clientKey'];
const secret = appConfig['clientSecret'];
const projectServiceId = appConfig['projectServiceId'];
const baseUrl = appConfig['host'];
const main = () => __awaiter(this, void 0, void 0, function* () {
    try {
        console.log("Starting Metadata Analysis process ...");
        // Get API access-token for the this client.
        const authApi = metadataanalysis_client_1.AuthApiFactory({}, baseUrl);
        const token = (yield authApi.getAccessToken(client, secret)).data;
        console.log(token);
        // Update MetadataAnalysis API with the generated access token
        const metadataAnalysisApi = metadataanalysis_client_1.MetadataAnalysisApiFactory({ apiKey: token.authorization }, baseUrl);
        // Analyze request.
        let request = {
            text: 'President Donald Trump tried to explain his agitating approach to life, politics and the rest of the world in a flash of impatience during a blustery news conference in France.   It\'s the way I negotiate. It\'s done me well over the years and it\'s doing even better for the country, I think,  he said.',
            extractors: ["entities", "topics"],
            extractorsScoreThreshold: 0.5,
            classifiers: ["IPTCNewsCodes", "IPTCMediaTopics"],
            classifierScoreThreshold: 0.5
        };
        console.log(JSON.stringify(request));
        const atResponse = (yield metadataAnalysisApi.analyze(projectServiceId, request)).data;
        console.log(JSON.stringify(atResponse, null, 4));
        // Knowledge graph search request.  Collect detected entities aligned to the Knowledge graph
        const ids = atResponse.entities
            .filter(e => e.mid)
            .map(e => e.mid);
        // Request additional info on entities aligned to the Knowledge Graph.
        const kgResponse = (yield metadataAnalysisApi.knowledgeGraphSearch(projectServiceId, ids)).data;
        console.log(JSON.stringify(kgResponse, null, 4));
        console.log("Metadata Analysis process has finished successfully");
    }
    catch (e) {
        console.log(e);
    }
});
main().catch();
