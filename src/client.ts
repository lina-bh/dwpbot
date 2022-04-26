import { Client, Intents, Message } from "discord.js";

import commands from "./commands";
import { isBanned, touchUserRecord } from "./database";

let client: Client;

async function handleMessage(message: Message) {
    const { author, guild, client } = message;
    try {
        if (
            author.id === client.user.id ||
            message.content[0] !== "." ||
            (await isBanned(author.id))
        ) {
            return;
        }
        await touchUserRecord(author.id, guild.id);
        const command = message.content
            .slice(1)
            .toLowerCase()
            .split(" ")
            .shift();
        const impl = commands.get(command);
        if (!impl) {
            return;
        }
        await impl(message);
    } catch (err) {
        console.error(err);
    }
}

export async function startClient(
    token: string,
    debug: boolean
): Promise<void> {
    if (client) {
        return;
    }
    client = new Client({
        intents: Intents.FLAGS.GUILD_MESSAGES | Intents.FLAGS.GUILDS,
        partials: ["MESSAGE", "USER", "CHANNEL", "GUILD_MEMBER"],
    });
    client.on("warn", console.error);
    client.on("error", console.error);
    if (debug) {
        client.on("debug", console.error);
    }
    client.on("messageCreate", handleMessage);
    await client.login("Bot " + token);
    return new Promise((resolve) => {
        client.once("ready", () => resolve());
    });
}
