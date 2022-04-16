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
    intents:
        discord.Intents.FLAGS.GUILD_MESSAGES | discord.Intents.FLAGS.GUILDS,
    partials: ["MESSAGE", "USER", "CHANNEL", "GUILD_MEMBER"],
    // commandPrefix: options.prefix,
    // nonCommandEditable: false,
    // owner: options.adminId,
    // unknownCommandResponse: false,
});

client.on("ready", () => {
    console.error("Ready.");
});

client.on("error", (err) => {
    console.error(err);
    process.exit(1);
});

client.on("warn", console.error);
client.on("debug", console.error);

client.on("messageCreate", async (message) => {
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
        impl(message);
    } catch (err) {
        console.error(err);
        // if (author.id !== options.adminId) {
        //     const admin = await client.fetchUser(options.adminId);
        //     admin.sendMessage("error: ```json\n" + JSON.stringify(err) + "```");
        // }
        await channel.send(author + " sorry, i fucked up somewhere");
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
