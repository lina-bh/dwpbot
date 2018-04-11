import differenceInMinutes from "date-fns/difference_in_minutes";
import * as discord from "discord.js";
import db from "./database";
import options from "./options";
import * as crypto from "crypto";

export async function cantSignon(
    user: discord.User,
    server: discord.Guild): Promise<boolean> {
    const lastSignon = await db.getLastSignon(user, server);
    const diff = differenceInMinutes(Date.now(), lastSignon);
    return diff < options.signonMinutes;
}

export async function inPrison(
    user: discord.User,
    server: discord.Guild): Promise<boolean> {
    const lastInPrison = await db.getLastInPrison(user, server);
    const diff = differenceInMinutes(Date.now(), lastInPrison);
    return diff < options.prisonMinutes;
}

export function flip() {
    return crypto.randomBytes(1).readUInt8(0) / 255 >= 0.5;
}
