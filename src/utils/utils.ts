import { IncomingHttpHeaders, Agent } from "http";
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

export async function sleep(ms: number | undefined) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function sendFiles<T>(
    files: File[],
    bucketName: string,
    token: string
): Promise<AxiosResponse<T>[]> {
    return new Promise<AxiosResponse<T>[]>(async (resolve, reject) => {
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
            const response = await Promise.all(promises);
            resolve(response);
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
            const responseArray: AxiosResponse<T, any>[] = [];
            for (let i = 0; i < files.length; i += size) {
                const constant = i + size;
                responseArray.concat(
                    await sendFiles<T>(
                        files.slice(i, constant),
                        bucketName,
                        token
                    )
                );
                console.log(`Sent ${constant} files`);
            }
            resolve(responseArray.map((response) => response.data));
        } catch (err) {
            reject(err);
        }
    });
}
