"use strict";
import * as fs from "fs";
import client from "./client";
import commands from "./commands";
import db from "./database";
import options from "./options";
import * as logger from "winston";

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

client.on("message", (message) => {
    const { author, channel, guild } = message;
    (async () => {
        if (author.id === client.user.id ||
            message.content[0] !== options.prefix ||
            await db.banned(author)) {
            return;
        }
        await db.update(author, guild);
        const command = message.content
            .slice(1)
            .toLowerCase()
            .split(" ")
            .shift()!;
        const impl = commands.get(command);
        if (!impl) {
            return;
        }
        return impl(message);
    })().catch(async (err) => {
        logger.error(err);
        if (author.id !== options.adminId) {
            const admin = await client.fetchUser(options.adminId);
            admin.sendMessage("error: ```json\n" + JSON.stringify(err) + "```");
        }
        return channel.send(author + " sorry, i fucked up somewhere");
    });
});

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true,
    timestamp: true,
});
(logger as any).level = "silly";

db
    .init()
    .then(() => client.login("Bot " + token))
    .catch((err) => {
    logger.error(err);
    process.exit(1);
});
