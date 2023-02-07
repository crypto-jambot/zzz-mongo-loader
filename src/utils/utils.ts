import { IncomingHttpHeaders } from "http";
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
                "https://rabbit.dev/mongo",
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
                const { data } = err.response;
                reject({
                    message: data ?? err,
                    statusCode: data.code || 400,
                });
            });
    });
}
