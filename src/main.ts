import { readFileSync } from "fs";
import parseArgs from "minimist";

import { startClient } from "./client.js";

const args = parseArgs(process.argv.slice(2));

const token = (process.env.DWPBOT_TOKEN ?? readFileSync("./token", "ascii"))
    .replace("Bot", "")
    .trim();

(async () => {
    try {
        const client = await startClient(token, !!args.debug);
        console.error("REady.");
        console.error(
            `https://discordapp.com/api/oauth2/authorize?client_id=${
                client.user.id
            }&scope=bot&permissions=${3072}`
        );
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
