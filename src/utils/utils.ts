import { IncomingHttpHeaders, Agent } from "http";
import axios, { AxiosRequestConfig, Method } from "axios";
import { File } from "@google-cloud/storage";

function makeAxiosRequest<T>(
    url: string,
    method: Method | string,
    headers?: IncomingHttpHeaders,
    body?: any
): Promise<T> {
    const defaultHeaders = {
        "Content-Type": "application/json",
    };
    const config: AxiosRequestConfig = {
        url,
        httpAgent: new Agent({ keepAlive: true }),
        method,
        headers: { ...defaultHeaders, ...headers },
        data: JSON.stringify(body),
    };
    return new Promise<T>(async (resolve, reject) => {
        try {
            const { data } = await axios.request<T>(config);
            resolve(data);
        } catch (err: any) {
            const { data } = err.response;
            reject({
                message: data ?? err,
                statusCode: data.code || 400,
            });
        }
    });
}

export function scaleService<T>(
    name: string,
    namespace: string,
    replicas: number,
    token: string
): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
        try {
            const scalingResponse = await makeAxiosRequest<T>(
                `https://rabbit.dev/kube/deployment/${name}/${namespace}`,
                "PUT",
                {
                    Authorization: `Bearer ${token}`,
                },
                {
                    spec: {
                        replicas: replicas,
                    },
                }
            );
            resolve(scalingResponse);
        } catch (err: any) {
            const { data } = err.response;
            reject({
                message: data ?? err,
                statusCode: data.code || 400,
            });
        }
    });
}

export function sendFiles<T>(
    files: File[],
    bucketName: string,
    token: string
): Promise<T[]> {
    return new Promise<T[]>(async (resolve, reject) => {
        const promises: Promise<T>[] = files.map((file) => {
            return makeAxiosRequest(
                "https://rabbit.dev/mongo/publish",
                "POST",
                {
                    Authorization: `Bearer ${token}`,
                },
                {
                    fileName: file.name,
                    bucket: bucketName,
                }
            );
        });
        Promise.all(promises)
            .then((responses) => resolve(responses))
            .catch((err: any) => {
                reject(err);
            });
    });
}

export async function sendFilesSync<T>(
    files: File[],
    bucketName: string,
    token: string
): Promise<T[]> {
    const responses = [];
    for (const file of files) {
        const response = await makeAxiosRequest<T>(
            "https://rabbit.dev/mongo/publish",
            "POST",
            {
                Authorization: `Bearer ${token}`,
            },
            {
                fileName: file.name,
                bucket: bucketName,
            }
        );
        responses.push(response);
    }
    return responses;
}

export async function sleep(ms: number | undefined) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// async function makeBatchRequest(
//     requests: RPCRequest[],
//     accessToken: string
// ): Promise<Response[]> {
//     const config = {
//         method: "post",
//         url: process.env.JAM_ETH_NODE_HTTPS,
//         headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//         },
//         maxBodyLength: Infinity,
//         data: JSON.stringify(requests),
//         httpsAgent: new https.Agent({ keepAlive: true }),
//     };
//     return (await axios(config)).data;
// }
//
// export async function makeChunkedRequest<T>(
//     files: File[],
//     bucketName: string,
//     token: string,
//     numChunks: number
// ): Promise<Promise<Response[]>> {
//     let chunkStart = 0;
//     let chunks: Promise<Response[]>[] = [];
//     const constantSize = Math.floor(files.length / numChunks);
//     for (let i = 1; i <= numChunks; i++) {
//         const previous = chunkStart;
//         if (i === numChunks) {
//             chunks = chunks.concat(
//                 await sendFiles(files, bucketName, token);
//             );
//             break;
//         }
//         chunkStart = constantSize + previous;
//         chunks = chunks.concat(
//             makeBatchRequest(requests.slice(previous, chunkStart), accessToken)
//         );
//     }
//     return (await Promise.all(chunks)).reduce((previousValue, currentValue) => {
//         return [...previousValue, ...currentValue];
//     });
// }
