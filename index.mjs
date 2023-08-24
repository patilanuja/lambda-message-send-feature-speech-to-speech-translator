'use strict';

import pg from 'pg';
const { Client } = pg;

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    schema: process.env.DB_SCHEMA,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect();

const sqsClient = new SQSClient({
    signatureVersion: 'v4',
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY
    }
});

export const handler = async (event, context) => {
    console.log('Event: ' + JSON.stringify(event));
    console.log('Context: ' + JSON.stringify(context));
    try {
        let request = JSON.parse(event.body);
        let languageFrom = await getLanguage(request.from);
        let languageTo = await getLanguage(request.to);
        let query = 'insert into lingualol.message (from_, to_, language_from, language_to, source, source_content_type, created, modified) values ($1, $2, $3, $4, $5, $6, $7, $7) returning id';
        let result = await client.query(query, [request.from, request.to, languageFrom, languageTo, request.source, request.contentType, new Date()]);
        console.log(result.rows);

        let data = await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.AWS_SQS_TRANSCRIBE,
            MessageBody: '' + result.rows[0].id
        }));
        console.log(data);

        return {
            statusCode: 200
        };
    } catch (error) {
        console.error(error)
        return {
            statusCode: 500
        };
    }
};

const getLanguage = async (uid) => {
    let result = await client.query('select language from lingualol.user where uid = $1', [uid]);
    return result.rows[0].language;
}
