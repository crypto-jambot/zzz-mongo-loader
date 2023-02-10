import "dotenv/config";
import express, { Request, Response } from "express";
import { main } from "./index";
import { InvalidArgumentError } from "./error/InvalidArgumentError";

const app = express();
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.post("/", async (req: Request, res: Response) => {
    try {
        const result = await main(req.body);
        res.status(200).send(result);
    } catch (err: any) {
        err instanceof InvalidArgumentError
            ? res.status(400).send(err.message)
            : res.status(500).send(err.message || err);
    }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`mongo-loader: listening on port ${PORT}`);
});
