import { readFileSync } from "fs";
import parseArgs from "minimist";

import { startClient } from "./client";
import { openDB } from "./database";

const args = parseArgs(process.argv.slice(2));

const token = (process.env.DWPBOT_TOKEN ?? readFileSync("./token", "ascii"))
    .replace("Bot", "")
    .trim();

(async () => {
    try {
        await openDB("./dwpbot.db");
        await startClient(token, !!args.debug);
        console.log("REady.");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
