import * as discord from "discord.js";
import _ from "lodash";
import { addMinutes, distanceInWordsToNow } from "date-fns";

import db from "./database";
import options from "./options";
import { cantSignon, inPrison } from "./game";

const commands = new Map<
    string,
    (message: discord.Message) => Promise<unknown>
>();
export default commands;

commands.set("signon", async function signon(message) {
    const { author, guild, channel } = message;

    if (await cantSignon(author, guild)) {
        const lastSignon = await db.getLastSignon(author, guild);
        const when = distanceInWordsToNow(
            addMinutes(lastSignon, options.signonMinutes)
        );
        return channel.send(`${author} your next payment is in ${when}`);
    }

    const payment = _.random(options.lowerBennies, options.upperBennies);
    await db.incrBalance(author, guild, payment);
    await db.setLastSignon(author, guild);
    const balance = await db.balance(author, guild);
    console.error(`${author.tag} claimed £${payment}`);
    return channel.send(
        `${author} £${payment} bennies paid into your account. your balance is now £${balance}`
    );
});

commands.set("bet", async function bet(message) {
    const { author, channel, guild } = message;
    const args = message.content.slice(1).split(" ");

    const bet = parseInt(args[1], 10);
    if (bet <= 0 || Number.isNaN(bet)) {
        return channel.send(
            `${author} try putting coins in the machine next time mate`
        );
    }

    // throw new Error("not implemented yet");
    let balance = await db.balance(author, guild);
    if (bet > balance) {
        return channel.send(
            `${author} https://www.begambleaware.org: when the fun stops, stop`
        );
    }

    const won = Math.random() >= 0.5;
    if (won) {
        await db.incrBalance(author, guild, bet);
        console.error(`${author.tag} won £${bet}`);
        balance = await db.balance(author, guild);
        return channel.send(
            `${author} you won £${bet}! drinks on you (your balance is now £${balance})`
        );
    } else {
        const loss = _.random(1, bet);
        await db.incrBalance(author, guild, -loss);
        console.error(`${author.tag} lost £${loss}`);
        balance = await db.balance(author, guild);
        return channel.send(
            `${author} you lost £${loss}. don't let the mrs hear (your balance is now £${balance})`
        );
    }
});

async function balance(message: discord.Message) {
    const { author, channel, guild } = message;
    const mugs = Array.from(message.mentions.users.values());

    if (mugs.length < 1) {
        const balance = await db.balance(author, guild);
        return channel.send(`${author} your balance is £${balance}`);
    }

    return Promise.all(
        mugs.map(async (mug) => {
            const balance = await db.balance(mug, guild);
            return channel.send(`${author} ${mug}'s balance is £${balance}`);
        })
    );
}
commands.set("balance", balance).set("bal", balance);

commands.set("mug", async function mug(message: discord.Message) {
    const { author, channel, guild } = message;

    if (await inPrison(author, guild)) {
        const lastInPrison = await db.getLastInPrison(author, guild);
        const when = distanceInWordsToNow(
            addMinutes(lastInPrison, options.prisonMinutes)
        );
        return channel.send(`${author} you're still inside for ${when}`);
    }

    const victims = Array.from(message.mentions.users.values());
    if (victims.length < 1) {
        return channel.send(`${author} whom to mug?`);
    } else if (victims.length > 1) {
        return channel.send(`${author} you can only mug one at a time`);
    }
    const victim = victims[0];
    if (victim.id === author.id) {
        return channel.send(`${author} you can't mug yourself`);
    }

    const victimBal = await db.balance(victim, guild);
    if (victimBal === 0) {
        return channel.send(`${author} they have NOTHING`);
    }

    const success = Math.random() <= victimBal / (await db.totalMoney(guild));
    if (!success) {
        await db.setLastInPrison(author, guild);
        console.error(`${author.tag} was caught`);
        return channel.send(
            `${author} you're nicked! that's ${options.prisonMinutes} minutes inside for you`
        );
    }

    const takings = _.random(1, victimBal);
    await db.moveMoney(victim, author, guild, takings);
    console.error(`${author.tag} mugged £${takings} off ${victim.tag}`);
    return channel.send(
        `${author} you successfully nicked £${takings} off ${victim}`
    );
});

/*
export function whois(message) {
    const { channel, author } = message;
    const args = message.content.slice(1).split(" ");

    if (args.length < 2) {
        channel.send(`${author} who?`);
        return;
    }
    const id = args[1];

    if (client.users.has(id)) {
        channel.send(client.users.get(id)!.username);
    } else {
        client.fetchUser(id).then((user) => {
            channel.send(`${user.username}`);
        }).catch((err) => {
            channel.send(err);
        });
    }
};
*/

commands.set("players", async function players(message: discord.Message) {
    const { channel, guild: server } = message;
    const players = (await db.getPlayers(server))
        .map((player) => {
            try {
                const user = server.members.cache.get(player.id);
                player.name = user.nickname || user.user.username;
                return player;
            } catch (ex) {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => b.balance - a.balance);
    let buf = "```";
    for (const user of players) {
        buf += `${user.name}: £${user.balance}\n`;
    }
    buf += "```";
    return channel.send(buf);
});

async function raise(message: discord.Message) {
    if (message.author.id !== options.adminId) {
        return;
    }
    const exMessage = message.content.split(" ")[1];
    throw new Error(exMessage);
}
commands.set("throw", raise);

/*
export function ban(message) {
    const { author, channel } = message;
    const mugs = message.mentions.users.array();

    if (author.id !== options.adminId) {
        channel.send(`${author} fuck off`);
        return;
    }

    if (mugs.length < 1) {
        channel.send(`${author} i require targets sir`);
        return;
    }

    for (const mug of mugs) {
        db.ban(mug);
        channel.send(`${mug} you are fucking BANNED`);
    }
};

export function _throw(message) {
    const { channel } = message;
    if (message.author.id !== options.adminId) {
        channel.send(message.author + " fuck off");
        return;
    }
    const args = message.content.slice(1).split(" ");
    if (args.length < 2) {
        throw new Error("thrown by admin");
    } else {
        throw new Error(args.slice(1).join(" "));
    }
};

export function invite(message) {
    message.channel.send(`https://discordapp.com/api/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=${options.perms}`);
};

export function fuck(message) {
    message.channel.send(`${message.author} u tryna fuck huh?`);
};

export function unban(message) {
    const { author, channel } = message;
    const mugs = message.mentions.users.array();

    if (author.id !== options.adminId) {
        channel.send(`${author} fuck off`);
        return;
    }

    if (mugs.length < 1) {
        channel.send(`${author} i require targets sir`);
        return;
    }

    for (const mug of mugs.filter((mug) => db.banned(mug))) {
        db.unban(mug);
        channel.send(`${mug} you are fucking unBANNED`);
    }
};

export function bans(message) {
    const { channel, author } = message;
    const bans = db.prepare("SELECT tag FROM bans WHERE banned = 1").pluck().all();
    if (bans.length < 1) {
        channel.send(`${author} no bans... yet`);
        return;
    }
    channel.send("```" + bans.join("\n") + "```");
};
*/
commands.set("give", async function give(message: discord.Message) {
    const { channel, author, guild } = message;
    const menchies = Array.from(message.mentions.users.values());
    if (menchies.length < 1) {
        return channel.send(`${author} give to whom?`);
    } else if (menchies.length > 1) {
        return channel.send(`${author} only one at a time`);
    }
    const target = menchies[0];
    await db.update(target, guild);

    const match = message.cleanContent.match(/\b\d\b/);
    if (!match) {
        return channel.send(`${author} give something you heartless bastard`);
    }
    const gift = parseInt(match[0], 10);
    if (gift <= 0 || Number.isNaN(gift)) {
        return channel.send(`${author} give something you heartless bastard`);
    }
    if (gift > (await db.balance(author, guild))) {
        return channel.send(`${author} you don't have the money for that`);
    }
    await db.moveMoney(author, target, guild, gift);
    console.error(`${author.tag} gave £${gift} to £${target.tag}`);
    return channel.send(`${author} you gave £${gift} to ${target}`);
});

/*
export function help(message) {
    const { channel } = message;
    channel.send("```" + `
.signon: claim bene
.balance: show balance
.balance @user: show user's balance
.bal: show balance
.bal @user: show user's balance
.bet x: place a bet of £x
.mug @user: try and mug user's money
.players: show all players' balances in the server
.invite: show invite url` + "```");
} */
