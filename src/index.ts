import { Request, Response } from "@google-cloud/functions-framework";

export async function load(req: Request, res: Response) {
    if (req.method != "POST") {
        res.status(400).send("Must be a POST request.");
        return;
    }
    res.status(200).send("Hello World.");
}
