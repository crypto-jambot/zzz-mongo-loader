import "dotenv/config";
import { getAccessToken, Token } from "@crypto-jambot/proxy-utils";
import { SecretUtil } from "@crypto-jambot/secret-manager-utils";
import { Request, Response } from "@google-cloud/functions-framework";
import {
    sendFiles,
    scaleService,
    sleep,
    sendBatchedFiles,
} from "./utils/utils";
import * as process from "process";
const { Storage } = require("@google-cloud/storage");

const storage = new Storage();

type Params = {
    bucketName: string;
    prefix: string;
};

type DatabaseResponse = {
    message: number;
};
// export async function load(req: Request, res: Response) {
//     if (req.method != "POST") {
//         res.status(400).send("Must be a POST request.");
//         return;
//     }
//     const { body } = <{ body: Params }>req;
//     if (!body || !body.bucketName) {
//         res.status(400).send("Invalid payload. Must provide a bucket name.");
//         return;
//     }
//     const [files] = await storage
//         .bucket(body.bucketName)
//         .getFiles({ prefix: body.prefix || "" });
//     if (files.length === 0) {
//         res.status(200).send(
//             `No Files to copy for ${body.bucketName}/${body.prefix}`
//         );
//     }
//
//     const secretUtil: SecretUtil = new SecretUtil();
//     const apiKey: string = await secretUtil.getSecretString("api-secret-key");
//     const { token } = await getAccessToken(apiKey);
//     const replicas = process.env.REPLICAS ? parseInt(process.env.REPLICAS) : 5;
//     // const scalingUpResponse = await scaleService(
//     //     "database-api",
//     //     "mongodb",
//     //     replicas,
//     //     token
//     // );
//     const responses: any[] = await sendFiles(files.slice(0, 2), body.bucketName, token);
//     // const scalingDownResponse = await scaleService(
//     //     "database-api",
//     //     "mongodb",
//     //     1,
//     //     token
//     // );
//     res.status(200).send("Successful Migration of data.");
// }

(async function main() {
    const [files] = await storage
        .bucket("resolved-paths")
        .getFiles({ prefix: "" });
    if (files.length === 0) {
        return;
    }
    const secretUtil: SecretUtil = new SecretUtil();
    const apiKey: string = await secretUtil.getSecretString("api-secret-key");
    const { token } = await getAccessToken(apiKey);
    const replicas = process.env.REPLICAS ? parseInt(process.env.REPLICAS) : 5;
    console.log("Scaling up...");
    const scalingUpResponse = await scaleService(
        "database-api",
        "mongodb",
        replicas,
        token
    );
    console.log("Waiting 10 Seconds...");
    await sleep(10000);
    const start = Date.now();
    console.log("Sending Files now...");
    try {
        const inserted = (
            await sendBatchedFiles<DatabaseResponse>(
                files,
                "resolved-paths",
                token
            )
        ).reduce((previousValue, currentValue, currentIndex, array) => {
            return previousValue + currentValue.message;
        }, 0);
        console.log(`Inserted ${inserted} rows`);
    } catch (err) {
        console.log(err);
    }
    const end = Date.now();
    console.log("Scaling down...");
    const scalingDownResponse = await scaleService(
        "database-api",
        "mongodb",
        1,
        token
    );
    console.log("Ye boi I am done.");
    console.log("Total time (ms) taken: " + (end - start));
})();
