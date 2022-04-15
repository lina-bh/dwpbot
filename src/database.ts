import * as sqlite from "sqlite";
import * as discord from "discord.js";
import options from "./options";
import * as sqlite3 from "sqlite3";

class SqliteDataSource {
    private db?: sqlite.Database;

    async init(database = options.database) {
        if (this.db) throw new Error("db.init() called twice");

        this.db = await sqlite.open({
            filename: database,
            driver: sqlite3.Database,
        });
        console.log(database + " opened");

        await this.db.exec(
            `CREATE TABLE 
            IF NOT EXISTS 
            users (
                id TEXT NOT NULL, 
                server TEXT NOT NULL, 
                balance INTEGER NOT NULL DEFAULT 0, 
                lastSignon INTEGER NOT NULL DEFAULT 0, 
                lastStretch INTEGER NOT NULL DEFAULT 0, 
                PRIMARY KEY (id, server)
            )`
        );
        await this.db.exec(
            "CREATE TABLE IF NOT EXISTS bans (" +
                "id TEXT PRIMARY KEY UNIQUE NOT NULL, " +
                "banned INTEGER NOT NULL DEFAULT 1" +
                ")"
        );

        console.log("tables created");
    }

    async exists(user: discord.User, guild?: discord.Guild): Promise<boolean> {
        let row;
        if (!guild) {
            row = await this.db!.get(
                "SELECT 1 " + "FROM users " + "WHERE id = ?",
                user.id
            );
        } else {
            row = await this.db!.get(
                "SELECT 1 " + "FROM users " + "WHERE id = ? AND server = ?",
                user.id,
                guild.id
            );
        }
        if (row !== undefined) {
            return true;
        }
        return false;
    }

    async update(user: discord.User, guild: discord.Guild) {
        await this.db!.run(
            "INSERT OR IGNORE INTO users (id, server) VALUES (?, ?)",
            user.id,
            guild.id
        );
        // console.log(`${user.username} record updated`);
    }

    async banned(user: discord.User) {
        const row = await this.db!.get(
            "SELECT banned = 1 " + "FROM bans " + "WHERE id = ?",
            user.id
        );
        if (row && row.banned === 1) {
            return true;
        }
        return false;
    }

    async ban(user: discord.User) {
        await this.db!.run(
            "INSERT OR REPLACE " + "INTO bans (id) " + "VALUES (?)",
            user.id
        );
    }

    async unban(user: discord.User) {
        await this.db!.run("DELETE FROM bans " + "WHERE id = ?", user.id);
    }

    async balance(user: discord.User, server: discord.Guild) {
        const row = await this.db!.get(
            "SELECT balance FROM users WHERE id = ? AND server = ?",
            user.id,
            server.id
        );
        if (row && row.balance) {
            return row.balance;
        }
        return 0;
    }

    async incrBalance(
        user: discord.User,
        server: discord.Guild,
        amount: number
    ) {
        await this.db!.run(
            "UPDATE users SET balance = balance + ? WHERE id = ? AND server = ?",
            amount,
            user.id,
            server.id
        );
        console.log(`${user.username}'s balance incremented by ${amount}`);
    }

    async moveMoney(
        source: discord.User,
        target: discord.User,
        server: discord.Guild,
        amount: number
    ) {
        throw new Error("unimplemented");
        // this.dbSync!.transaction(() => {
        //     this.dbSync!.prepare(
        //         "UPDATE users " +
        //             "SET balance = balance - :amount " +
        //             "WHERE id = :source AND server = :server" +
        //             ";" +
        //             "UPDATE users " +
        //             "SET balance = balance + :amount " +
        //             "WHERE id = :target AND server = :server"
        //     ).run({
        //         amount,
        //         server: server.id,
        //         source: source.id,
        //         target: target.id,
        //     });
        // });
        // console.log(
        //     `${amount} moved from ${source.username} to ${target.username}`
        // );
    }

    async totalMoney(server: discord.Guild) {
        const row = await this.db!.get(
            "SELECT SUM(balance) total FROM users WHERE server = ?",
            server.id
        );
        if (row && row.total) {
            return row.total;
        }
        return 0;
    }

    async getLastSignon(user: discord.User, server: discord.Guild) {
        const row = await this.db!.get(
            "SELECT lastSignon FROM users WHERE id = ? AND server = ?",
            user.id,
            server.id
        );
        if (row && row.lastSignon) {
            return new Date(row.lastSignon * 1000);
        }
        return new Date(0);
    }

    async setLastSignon(user: discord.User, server: discord.Guild) {
        await this.db!.run(
            "UPDATE users SET lastSignon = CAST(STRFTIME('%s', 'now') AS INTEGER) WHERE id = ? AND server = ?",
            user.id,
            server.id
        );
        console.log(`${user.username}'s signon time updated`);
    }

    async getLastInPrison(user: discord.User, server: discord.Guild) {
        const row = await this.db!.get(
            "SELECT lastStretch FROM users WHERE id = ? AND server = ?",
            user.id,
            server.id
        );
        if (row && row.lastStretch) {
            return new Date(row.lastStretch * 1000);
        }
        return new Date(0);
    }

    async setLastInPrison(user: discord.User, server: discord.Guild) {
        await this.db!.run(
            "UPDATE users SET lastStretch = CAST(STRFTIME('%s', 'now') AS INTEGER) WHERE id = ? AND server = ?",
            user.id,
            server.id
        );
        console.log(`${user.username}'s prison time updated`);
    }

    async getPlayers(server: discord.Guild) {
        return await this.db!.all(
            "SELECT id, balance FROM users WHERE server = ?",
            server.id
        );
    }
}

export default new SqliteDataSource();
