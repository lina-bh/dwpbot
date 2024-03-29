import * as sqlite from "sqlite";
import * as sqlite3 from "sqlite3";

let db: sqlite.Database;

export async function openDB(filename: string): Promise<void> {
    if (db) {
        return;
    }
    db = await sqlite.open({ filename, driver: sqlite3.Database });
    await db.exec(
        `CREATE TABLE IF NOT EXISTS 
        users (
            id TEXT NOT NULL, 
            server TEXT NOT NULL, 
            balance INTEGER NOT NULL DEFAULT 0, 
            lastSignon INTEGER NOT NULL DEFAULT 0, 
            lastStretch INTEGER NOT NULL DEFAULT 0, 
            PRIMARY KEY (id, server)
        )`
    );
    await db.exec(
        `CREATE TABLE IF NOT EXISTS 
        bans (
            id TEXT PRIMARY KEY UNIQUE NOT NULL, 
            banned INTEGER NOT NULL DEFAULT 1
        )`
    );
    console.error(`sqlite database ${filename} opened`);
}

export async function touchUserRecord(userId: string, guildId: string) {
    await db.exec(
        "INSERT OR IGNORE INTO users (id, server) values (?, ?)",
        userId,
        guildId
    );
}

export async function isBanned(userId: string): Promise<boolean> {
    const res = await db.get("SELECT banned FROM bans WHERE id = ?", userId);
    return !!res?.banned;
}

export async function storeUserBan(userId: string, banned: boolean) {
    if (banned) {
        await db.exec("INSERT OR REPLACE INTO bans (id) VALUES (?)", userId);
    } else {
        await db.exec("DELETE FROM bans WHERE id = ?", userId);
    }
}

export async function loadBalance(
    userId: string,
    guildId: string
): Promise<number> {
    const res = await db.get(
        "SELECT balance FROM users WHERE id = ? AND server = ?",
        userId,
        guildId
    );
    return res?.balance ?? 0;
}

export async function addBalance(
    userId: string,
    guildId: string,
    amt: number
): Promise<void> {
    await db.run(
        "UPDATE users SET balance = balance + ? WHERE id = ? AND server = ?",
        amt,
        userId,
        guildId
    );
}

export async function loadGuildTotal(guildId: string) {
    const res = await db.get(
        "SELECT SUM(balance) total FROM users WHERE server = ?",
        guildId
    );
    return res?.total ?? 0;
}

export async function loadLastSignon(
    userId: string,
    guildId: string
): Promise<Date> {
    const res = await db.get(
        "SELECT lastSignon FROM users WHERE id = ? AND server = ?",
        userId,
        guildId
    );
    return new Date(res?.lastSignon ? res?.lastSignon * 1000 : 0);
}

export async function storeLastSignon(
    userId: string,
    guildId: string,
    d: Date
) {
    const ts = Math.floor(d.getTime() / 1000);
    await db.exec(
        "UPDATE users SET lastSignon = ? WHERE id = ? AND server = ?",
        ts,
        userId,
        guildId
    );
}

export async function loadLastPrison(
    userId: string,
    guildId: string
): Promise<Date> {
    const res = await db.get(
        "SELECT lastStretch FROM users WHERE id = ? AND server = ?",
        userId,
        guildId
    );
    return new Date(res?.lastStretch ? res?.lastStretch * 1000 : 0);
}

export async function storeLastPrison(
    userId: string,
    guildId: string,
    d: Date
) {
    const ts = Math.floor(d.getTime() / 1000);
    await db.exec(
        "UPDATE users SET lastStretch = ? WHERE id = ? AND server = ?",
        ts,
        userId,
        guildId
    );
}

export async function loadGuildPlayers(guildId: string) {
    const rows = await db.all(
        "SELECT id, balance FROM users WHERE server = ?",
        guildId
    );
    return rows.map((row) => ({
        id: row.id,
        balance: row.balance,
        name: undefined,
    }));
}
