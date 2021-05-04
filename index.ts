import {
    AuthApi,
    AuthApiFactory,
    MetadataAnalysisApiFactory,
    MetadataAnalysisApi
} from 'metadataanalysis-client'

import {
    Token,
    Locator,
    AnalyzeRequest,
    AnalyzedTextResponse,
    KnowledgeGraphSearchResponse,
    SegmentTextRequest,
    SegmentTextResponse,
    TranslateCaptionsRequest,
    TranslateCaptionsResponse,
    TranslateTextRequest,
    TranslateTextResponse
} from 'metadataanalysis-client/model'

const fs = require('fs');
import {ReadStream} from 'fs';
import * as AWS from 'aws-sdk';

const appConfigFile: string = <string> process.env.APP_CONFIG_FILE;
const appConfig = JSON.parse(fs.readFileSync(appConfigFile).toString());

const client: string = appConfig['clientKey'];
const secret: string = appConfig['clientSecret'];

const projectServiceId: string = appConfig['projectServiceId'];
const baseUrl: string = appConfig['host'];

const aws_access_key_id: string = appConfig['aws_access_key_id'];
const aws_secret_access_key: string = appConfig['aws_secret_access_key'];
const aws_session_token: string = appConfig['aws_session_token'];

AWS.config.update({accessKeyId: aws_access_key_id, secretAccessKey: aws_secret_access_key});
AWS.config.region = appConfig['bucketRegion'];

const credentials = new AWS.Credentials(aws_access_key_id, aws_secret_access_key, aws_session_token);
const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
	signatureVersion: 'v4',
    s3ForcePathStyle: true,
	credentials: credentials
});

const inputJsonFile: {
    folder: string,
    name: string
} = {
    "folder": appConfig['localPath'],
    "name": appConfig['jsonInputFile']
};
const inputTtmlFile: {
    folder: string,
    name: string
} = {
    "folder": appConfig['localPath'],
    "name": appConfig['ttmlInputFile']
};
const s3Bucket: string = appConfig['bucketName'];
const dpttOutputFileName: string = appConfig['dpttOutputFile'];
const draftjsOutputFileName: string = appConfig['draftjsOutputFile'];
const ttmlOutputFileName: string = appConfig['ttmlOutputFile'];
const textOutputFileName: string = appConfig['textOutputFile'];

const createSegmentTextRequest = (s3InputSignedUrl_json: string, s3OutputSignedUrl_dptt: string, s3OutputSignedUrl_draftjs: string): SegmentTextRequest => {

    let jsonInputFile: Locator  = <Locator>{
        awsS3Bucket:   s3Bucket,
        awsS3Key:      inputJsonFile.name,
        httpEndpoint:  s3InputSignedUrl_json
    };

    let dpttFormat: Locator  = <Locator>{
        awsS3Bucket:   s3Bucket,
        awsS3Key:      dpttOutputFileName,
        httpEndpoint:  s3OutputSignedUrl_dptt
    };

    let draftjsFormat: Locator  = <Locator>{
        awsS3Bucket:   s3Bucket,
        awsS3Key:      draftjsOutputFileName,
        httpEndpoint:  s3OutputSignedUrl_draftjs
    };

    let outputLocation: SegmentTextResponse  = <SegmentTextResponse>{
        dpttFile: dpttFormat,
        draftjsFile: draftjsFormat
    };

    let segmentTextRequest: SegmentTextRequest = <SegmentTextRequest>{
        inputFile: jsonInputFile,
        outputLocation: outputLocation
    };

    return segmentTextRequest;
};

const createTranslateCaptionsRequest = (s3InputSignedUrl_ttml: string, s3OutputSignedUrl_ttml: string, s3OutputSignedUrl_text: string, target_language: string): TranslateCaptionsRequest => {

    let ttmlInputFile: Locator  = <Locator>{
        awsS3Bucket:   s3Bucket,
        awsS3Key:      inputTtmlFile.name,
        httpEndpoint:  s3InputSignedUrl_ttml
    };

    let ttmlFormat: Locator  = <Locator>{
        awsS3Bucket:   s3Bucket,
        awsS3Key:      ttmlOutputFileName,
        httpEndpoint:  s3OutputSignedUrl_ttml
    };

    let textFormat: Locator  = <Locator>{
        awsS3Bucket:   s3Bucket,
        awsS3Key:      textOutputFileName,
        httpEndpoint:  s3OutputSignedUrl_text
    };

    let outputLocation: TranslateCaptionsResponse  = <TranslateCaptionsResponse>{
        ttmlFile: ttmlFormat,
        textFile: textFormat
    };

    let translateCaptionsRequest: TranslateCaptionsRequest = <TranslateCaptionsRequest>{
        sourceSubtitle: ttmlInputFile,
        outputLocation: outputLocation,
        targetLanguage: target_language
    };

    return translateCaptionsRequest;
};

const uploadJson = async () => {
    const read: ReadStream = fs.createReadStream(inputJsonFile.folder + inputJsonFile.name);
    const params: AWS.S3.PutObjectRequest = {
        Bucket: s3Bucket,
        Key: inputJsonFile.name,
        Body: read
    };
    await s3.upload(params).promise();
};

const uploadTtml = async () => {
    const read: ReadStream = fs.createReadStream(inputTtmlFile.folder + inputTtmlFile.name);
    const params: AWS.S3.PutObjectRequest = {
        Bucket: s3Bucket,
        Key: inputTtmlFile.name,
        Body: read
    };
    await s3.upload(params).promise();
};

const downloadResult_dptt = async () => {
    console.log('starting download dptt result process ...');
    const params: AWS.S3.GetObjectRequest = {
        Bucket: s3Bucket,
        Key: dpttOutputFileName
    };
    const result = await s3.getObject(params).promise();
    fs.writeFileSync(inputJsonFile.folder + dpttOutputFileName, result.Body);
};

const downloadResult_draftjs = async () => {
    console.log('starting download draftjs result process ...');
    const params: AWS.S3.GetObjectRequest = {
        Bucket: s3Bucket,
        Key: draftjsOutputFileName
    };
    const result = await s3.getObject(params).promise();
    fs.writeFileSync(inputJsonFile.folder + draftjsOutputFileName, result.Body);
};

const downloadResult_ttml = async () => {
    console.log('starting download ttml result process ...');
    const params: AWS.S3.GetObjectRequest = {
        Bucket: s3Bucket,
        Key: ttmlOutputFileName
    };
    const result = await s3.getObject(params).promise();
    fs.writeFileSync(inputTtmlFile.folder + ttmlOutputFileName, result.Body);
};

const downloadResult_text = async () => {
    console.log('starting download text result process ...');
    const params: AWS.S3.GetObjectRequest = {
        Bucket: s3Bucket,
        Key: textOutputFileName
    };
    const result = await s3.getObject(params).promise();
    fs.writeFileSync(inputTtmlFile.folder + textOutputFileName, result.Body);
};

const deleteSegmentArtifacts = async () => {
    console.log('Deleting segment text artifacts from S3 ...');
    const inputParams_json: AWS.S3.DeleteObjectRequest = {
        Bucket: s3Bucket,
        Key: inputJsonFile.name
    };
    const outputParams_dptt: AWS.S3.DeleteObjectRequest = {
        Bucket: s3Bucket,
        Key: dpttOutputFileName
    };
    const outputParams_draftjs: AWS.S3.DeleteObjectRequest = {
        Bucket: s3Bucket,
        Key: draftjsOutputFileName
    };

    await Promise.all([
        s3.deleteObject(inputParams_json).promise(),
        s3.deleteObject(outputParams_dptt).promise(),
        s3.deleteObject(outputParams_draftjs).promise()
    ]);
};

const deleteTranslateArtifacts = async () => {
    console.log('Deleting translate captions artifacts from S3 ...');
    const inputParams_ttml: AWS.S3.DeleteObjectRequest = {
        Bucket: s3Bucket,
        Key: inputTtmlFile.name
    };
    const outputParams_ttml: AWS.S3.DeleteObjectRequest = {
        Bucket: s3Bucket,
        Key: ttmlOutputFileName
    };
    const outputParams_text: AWS.S3.DeleteObjectRequest = {
        Bucket: s3Bucket,
        Key: textOutputFileName
    };

    await Promise.all([
        s3.deleteObject(inputParams_ttml).promise(),
        s3.deleteObject(outputParams_ttml).promise(),
        s3.deleteObject(outputParams_text).promise()
    ]);
};

const generateGetSignedUrl_json = () : string => {
    return s3.getSignedUrl('getObject', {
        "Bucket": s3Bucket,
        "Key": inputJsonFile.name
    });
};

const generateGetSignedUrl_ttml = () : string => {
    return s3.getSignedUrl('getObject', {
        "Bucket": s3Bucket,
        "Key": inputTtmlFile.name
    });
};

const generatePutSignedUrl_draftjs = () : string => {
    return s3.getSignedUrl('putObject', {
        "Bucket": s3Bucket,
        "Key": draftjsOutputFileName,
        "ContentType": "application/json",
        "Expires": 60 * 60 * 1
    });
};

const generatePutSignedUrl_dptt = () : string => {
    return s3.getSignedUrl('putObject', {
        "Bucket": s3Bucket,
        "Key": dpttOutputFileName,
        "Expires": 60 * 60 * 1
    });
};

const generatePutSignedUrl_ttml = () : string => {
    return s3.getSignedUrl('putObject', {
        "Bucket": s3Bucket,
        "Key": ttmlOutputFileName,
        "Expires": 60 * 60 * 1
    });
};

const generatePutSignedUrl_text = () : string => {
    return s3.getSignedUrl('putObject', {
        "Bucket": s3Bucket,
        "Key": textOutputFileName,
        "Expires": 60 * 60 * 1
    });
};

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

        // Upload json file to S3.
        await uploadJson();
        console.log('json file uploaded to s3 successfully');

        // Generate signed URL for input and output.
        const s3InputSignedUrl_json: string = generateGetSignedUrl_json();
        console.log(`Input json file signed URL: ${s3InputSignedUrl_json}`);

        const s3OutputSignedUrl_dptt: string = generatePutSignedUrl_dptt();
        console.log(`Output dptt file signed URL: ${s3OutputSignedUrl_dptt}`);

        const s3OutputSignedUrl_draftjs: string = generatePutSignedUrl_draftjs();
        console.log(`Output draftjs file signed URL: ${s3OutputSignedUrl_draftjs}`);

        // Segmenting text
        const segmentTextRequest: SegmentTextRequest = createSegmentTextRequest(s3InputSignedUrl_json, s3OutputSignedUrl_dptt, s3OutputSignedUrl_draftjs);
        console.log(JSON.stringify(segmentTextRequest));

        const segmentTextResponse: SegmentTextResponse = (await metadataAnalysisApi.segmentText(projectServiceId, segmentTextRequest)).data;
        console.log(JSON.stringify(segmentTextResponse, null, 4));

        // Download result.
        await downloadResult_dptt();
        console.log('result dptt file downloaded successfully');

        await downloadResult_draftjs();
        console.log('result draftjs file downloaded successfully');

        // delete artifacts from s3
        await deleteSegmentArtifacts();
        console.log('Deleted all artifacts from S3');

        // Upload ttml file to S3.
        await uploadTtml();
        console.log('ttml file uploaded to s3 successfully');

        // Generate signed URL for input and output.
        const s3InputSignedUrl_ttml: string = generateGetSignedUrl_ttml();
        console.log(`Input ttml file signed URL: ${s3InputSignedUrl_ttml}`);

        const s3OutputSignedUrl_ttml: string = generatePutSignedUrl_ttml();
        console.log(`Output ttml file signed URL: ${s3OutputSignedUrl_ttml}`);

        const s3OutputSignedUrl_text: string = generatePutSignedUrl_text();
        console.log(`Output text file signed URL: ${s3OutputSignedUrl_text}`);

        // Translating captions
        const targetLanguage: string = "RU";
        const translateCaptionsRequest: TranslateCaptionsRequest = createTranslateCaptionsRequest(s3InputSignedUrl_ttml, s3OutputSignedUrl_ttml, s3OutputSignedUrl_text, targetLanguage);
        console.log(JSON.stringify(translateCaptionsRequest));

        const translateCaptionsResponse: TranslateCaptionsResponse = (await metadataAnalysisApi.translateCaptions(projectServiceId, translateCaptionsRequest)).data;
        console.log(JSON.stringify(translateCaptionsResponse, null, 4));

        // Download result.
        await downloadResult_ttml();
        console.log('result ttml file downloaded successfully');

        await downloadResult_text();
        console.log('result text file downloaded successfully');

        // delete artifacts from s3
        await deleteTranslateArtifacts();
        console.log('Deleted all artifacts from S3');

        console.log("Metadata Analysis process has finished successfully");

    } catch (e) {
        console.log(e);
    }
};

main().catch();
