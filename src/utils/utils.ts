import { IncomingHttpHeaders } from "http";
import axios, { Axios, AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { File } from "@google-cloud/storage";

function makeAxiosRequest<T>(
    url: string,
    method: Method | string,
    headers?: IncomingHttpHeaders,
    body?: any
): Promise<AxiosResponse<T>> {
    const defaultHeaders = {
        "Content-Type": "application/json",
    };
    const config: AxiosRequestConfig = {
        url,
        // httpAgent: new Agent({keepAlive: true}),
        method,
        headers: { ...defaultHeaders, ...headers },
        data: JSON.stringify(body),
    };

    return axios.request<T>(config);
}

export function scaleService<T>(
    name: string,
    namespace: string,
    replicas: number,
    token: string
): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
        try {
            const { data } = await makeAxiosRequest<T>(
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

export async function sendFiles<T>(
    files: File[],
    bucketName: string,
    token: string
): Promise<T[]> {
    return new Promise<T[]>(async (resolve, reject) => {
        try {
            const promises: Promise<AxiosResponse<T>>[] = files.map((file) => {
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
            resolve(
                (await Promise.all(promises)).map((response) => response.data)
            );
        } catch (err) {
            reject(err);
        }
    });
}

export function sendBatchedFiles<T>(
    files: File[],
    bucketName: string,
    token: string,
    size: number = 100
) {
    return new Promise<T[]>(async (resolve, reject) => {
        try {
            let responseArray: T[] = [];
            for (let i = 0; i < files.length; i += size) {
                const constant = i + size;
                const responses = await sendFiles<T>(
                    files.slice(i, constant),
                    bucketName,
                    token
                );
                responseArray = [...responseArray, ...responses];
                console.log(`Sent ${constant} files`);
            }
            resolve(responseArray);
        } catch (err) {
            reject(err);
        }
    });
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
