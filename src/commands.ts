import * as discord from "discord.js";
import _ from "lodash";
import addMinutes from "date-fns/add_minutes";
import db from "./database";
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import options from "./options";
import * as logger from "winston";
import {cantSignon, inPrison, flip} from "./game";

const commands = new Map<string, (message: discord.Message) => Promise<any>>();
export default commands;

commands.set("signon", async function signon(message) {
    const { author: user, guild: server, channel } = message;

    if (await cantSignon(user, server)) {
        const lastSignon = await db.getLastSignon(user, server);
        const when = distanceInWordsToNow(
            addMinutes(lastSignon, options.signonMinutes),
        );
        return channel.send(`${user} your next payment is in ${when}`);
    }

    const payment = _.random(options.lowerBennies, options.upperBennies);
    await db.incrBalance(user, server, payment);
    await db.setLastSignon(user, server);
    const balance = await db.balance(user, server);
    logger.info(`${user.tag} claimed £${payment}`);
    return channel.send(
        `${user} £${payment} bennies paid into your account. ` +
        `your balance is now £${balance}`,
    );
});

commands.set("bet", async function bet(message) {
    const { author: user, channel, guild: server } = message;
    const args = message.content.slice(1).split(" ");

    const bet = parseInt(args[1], 10);
    if (bet <= 0 || Number.isNaN(bet)) {
        return channel.send(user +
            " try putting coins in the machine next time mate");
    }

    // throw new Error("not implemented yet");
    const balance = await db.balance(user, server);
    if (bet > balance) {
        return channel.send(
            `${user} https://www.begambleaware.org: when the fun stops, stop`,
        );
    }

    const won = flip();
    if (won) {
        await db.incrBalance(user, server, bet);
        logger.info(`${user.tag} won £${bet}`);
        return channel.send(
            `${user} you won £${bet}! drinks on you ` +
            `(your balance is now £${balance + bet})`,
        );
    } else {
        await db.incrBalance(user, server, -bet);
        logger.info(`${user.tag} lost £${bet}`);
        return channel.send(
            `${user} you lost £${bet}. don't let the mrs hear` +
            ` (your balance is now £${balance - bet})`,
        );
    }
});

async function balance(message) {
    const { author: user, channel, guild: server } = message;
    const mugs = message.mentions.users.array();

    if (mugs.length < 1) {
        const balance = await db.balance(user, server);
        return channel.send(`${user} your balance is £${balance}`);
    }

    const responses = [];
    for (const mug of mugs) {
        const balance = await db.balance(mug, server);
        responses.push(channel.send(`${user} ${mug}'s balance is £${balance}`));
    }
    return Promise.all(responses);
}
commands.set("balance", balance).set("bal", balance);

async function mug(message: discord.Message) {
    const { author: user, channel, guild: server } = message;

    if (await inPrison(user, server)) {
        const lastInPrison = await db.getLastInPrison(user, server);
        const when = distanceInWordsToNow(
            addMinutes(lastInPrison, options.prisonMinutes),
        );
        return channel.send(`${user} you're still inside for ${when}`);
    }

    const victims = message.mentions.users.array();
    if (victims.length < 1) {
        return channel.send(`${user} whom to mug?`);
    } else if (victims.length > 1) {
        return channel.send(`${user} you can only mug one at a time`);
    }
    const victim = victims[0];
    if (victim.id === user.id) {
        return channel.send(`${user} you can't mug yourself`);
    }

    const vBalance = await db.balance(victim, server);
    if (vBalance === 0) {
        return channel.send(`${user} they have NOTHING`);
    }

    const success = Math.random() >= vBalance / await db.totalMoney(server);
    if (!success) {
        await db.setLastInPrison(user, server);
        logger.info(`${user.tag} was caught`);
        return channel.send(
            `${user} you were caught by a bastard copper! ` +
            `that's ${options.prisonMinutes} minutes inside for you`,
        );
    }

    const takings = _.random(1, vBalance);
    await db.moveMoney(victim, user, server, takings);
    return channel.send(
        `${user} you successfully nicked £${takings} off ${victim}`,
    );
}
commands.set("mug", mug);
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

async function players(message: discord.Message) {
    const { author, channel, guild: server } = message;
    const players = (await db.getPlayers(server)).map((player) => {
        try {
            const user = server.members.get(player.id);
            player.name = user.nickname || user.user.username;
            return player;
        } catch (ex) {
            return null;
        }
    }).filter(Boolean).sort((a, b) => b.balance - a.balance);
    let buf = "```";
    for (const user of players) {
        buf += `${user.name}: £${user.balance}\n`;
    }
    buf += "```";
    return channel.send(buf);
}
commands.set("players", players);

async function raise(message: discord.Message) {
    if (message.author.id !== options.adminId) {
        return;
    }
    const exMessage = message.content.split(" ")[1];
    try {
        throw new Error(exMessage);
    } catch (ex) {
        throw ex;
    }
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

export function give(message) {
    const { channel, author, guild } = message;

    const mugs = message.mentions.users.array();
    if (mugs.length !== 1) {
        const what = (mugs.length > 1) ? "you can only give to one at a time" : "give to whom?";
        channel.send(`${author} ${what}`);
        return;
    }
    const recipient = mugs[0];
    if (!db.exists(recipient, guild)) {
        channel.send(`${author} nah they need to sign on first`);
        return;
    }

    const args = message.content.slice(1).split(" ");
    const gift = parseInt(args[1], 10);
    if (isNaN(gift) || gift <= 0) {
        channel.send(`${author} give something you heartless bastard`);
        return;
    }

    const balance = db.prepare("SELECT balance FROM users WHERE id = ? AND server = ?").pluck().get(author.id, guild.id);
    if (typeof balance === "undefined") {
        db.new(author, guild);
        channel.send(`${author} you have nothing to give`);
        return;
    }

    if (gift > balance) {
        channel.send(`${author} you don't have the money for that`);
        return;
    }

    db.transaction([
        "UPDATE users SET balance = balance + :gift WHERE id = :taker AND server = :server",
        "UPDATE users SET balance = balance - :gift WHERE id = :giver AND server = :server"
    ]).run({
        gift,
        taker: recipient.id,
        giver: author.id,
        server: guild.id
    });
    console.log(`${misc.ts()}: ${author.tag} gave £${gift} to ${recipient.tag}`);
    channel.send(`${author} you gave £${gift} to ${recipient}`);
}

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
