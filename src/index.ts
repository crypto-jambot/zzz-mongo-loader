import "dotenv/config";
import { getAccessToken } from "@crypto-jambot/proxy-utils";
import { SecretUtil } from "@crypto-jambot/secret-manager-utils";
import { Storage } from "@google-cloud/storage";
import { scaleService, sendBatchedFiles, sleep } from "./utils";
import { InvalidArgumentError } from "./error/InvalidArgumentError";

const storage = new Storage();
type RequestBody = {
    bucketName: string;
    prefix: string;
};
type DatabaseResponse = {
    message: number;
};
export const main = async (requestBody: RequestBody) => {
    if (!requestBody.bucketName) {
        throw new InvalidArgumentError(
            "Invalid payload. Must provide a bucket name."
        );
    }
    const [files] = await storage
        .bucket(requestBody.bucketName)
        .getFiles({ prefix: requestBody.prefix || "" });
    if (files.length === 0) {
        return `No Files to copy for ${requestBody.bucketName}/${requestBody.prefix}`;
    }
    const secretUtil: SecretUtil = new SecretUtil();
    const apiKey: string = await secretUtil.getSecretString(
        process.env.API_SECRET_KEY as string
    );
    const { token } = await getAccessToken(apiKey);
    const start: number = Date.now();
    const scalingUpResponse = await scaleService(
        "database-api",
        "mongodb",
        2,
        token
    );
    console.log("Waiting 10 seconds");
    await sleep(10000);
    console.log("Sending Files now...");

    const response = await sendBatchedFiles<DatabaseResponse>(
        files,
        requestBody.bucketName,
        token,
        parseInt(process.env.BATCH_FILE_SIZE as string)
    );
    const inserted = response.reduce((previousValue, currentValue) => {
        return previousValue + currentValue.message;
    }, 0);
    const end: number = Date.now();
    return `Inserted ${inserted} rows.\nTotal time taken: ${
        (end - start) / 1000 / 60
    } minutes.`;
};
