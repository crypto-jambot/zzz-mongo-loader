import { IncomingHttpHeaders } from "http";
import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";
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
        method,
        headers: { ...defaultHeaders, ...headers },
        data: JSON.stringify(body),
    };
    return axios.request<T>(config);
}

async function sendFiles<T>(
    files: File[],
    bucketName: string,
    token: string
): Promise<T[]> {
    return new Promise<T[]>(async (resolve, reject) => {
        try {
            const promises: Promise<AxiosResponse<T>>[] = files.map((file) => {
                return makeAxiosRequest(
                    process.env.MONGO_PUBLISH_ENDPOINT as string,
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
    size: number
): Promise<T[]> {
    return new Promise<T[]>(async (resolve, reject) => {
        try {
            let responseArray: T[] = [];
            for (let i = 0; i < files.length; i += size) {
                const constant =
                    i + size > files.length ? files.length : i + size;
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
