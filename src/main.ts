"use strict";
import * as fs from "fs";
import * as discord from "discord.js";

import commands from "./commands";
import db from "./database";
import options from "./options";

let token;
if (options.tokenEnv in process.env) {
    token = process.env[options.tokenEnv];
} else {
    try {
        token = fs.readFileSync(options.tokenFile, "ascii");
    } catch (err) {
        throw new Error("no token");
    }
}
token = token.replace("Bot ", "").trim();

const client = new discord.Client({
    // intents: 3072,
    // commandPrefix: options.prefix,
    // nonCommandEditable: false,
    // owner: options.adminId,
    // unknownCommandResponse: false,
});
export default client;

client.on("ready", () => {
    console.log("Ready.");
});

client.on("error", (err) => {
    console.error(err);
    process.exit(1);
});

client.on("message", async (message) => {
    const { author, channel, guild } = message;
    try {
        if (
            author.id === client.user.id ||
            message.content[0] !== options.prefix ||
            (await db.banned(author))
        ) {
            return;
        }
        await db.update(author, guild);
        const command = message.content
            .slice(1)
            .toLowerCase()
            .split(" ")
            .shift();
        const impl = commands.get(command);
        if (!impl) {
            return;
        }
        return impl(message);
    } catch (err) {
        console.error(err);
        // if (author.id !== options.adminId) {
        //     const admin = await client.fetchUser(options.adminId);
        //     admin.sendMessage("error: ```json\n" + JSON.stringify(err) + "```");
        // }
        return channel.send(author + " sorry, i fucked up somewhere");
    }
});

(async () => {
    try {
        await db.init();
        await client.login("Bot " + token);
    } catch (ex) {
        console.error(ex instanceof Error ? ex.stack : ex);
        process.exit(1);
    }
})();
