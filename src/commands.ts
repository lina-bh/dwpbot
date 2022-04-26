import * as discord from "discord.js";
import { addMinutes, distanceInWordsToNow } from "date-fns";

import {
    loadBalance,
    loadGuildPlayers,
    loadLastPrison,
    loadLastSignon,
    touchUserRecord,
} from "./database";
import {
    cantSignon,
    commitMugging,
    inPrison,
    makeBet,
    payBennies,
    PRISON_PERIOD,
    sendGift,
    SIGNON_PERIOD,
} from "./game";

const commands = new Map<
    string,
    (
        message: discord.Message
    ) => Promise<discord.Message | discord.Message[] | undefined>
>();
export default commands;

commands.set("signon", async function signon(message) {
    const { author, guild, channel } = message;

    if (await cantSignon(author.id, guild.id)) {
        const lastSignon = await loadLastSignon(author.id, guild.id);
        const when = distanceInWordsToNow(
            addMinutes(lastSignon, SIGNON_PERIOD)
        );
        return channel.send(`${author} your next payment is in ${when}`);
    }

    const amt = await payBennies(author.id, guild.id);
    const bal = await loadBalance(author.id, guild.id);
    return channel.send(
        `${author} £${amt} bennies paid into your account. your balance is now £${bal}`
    );
});

commands.set("bet", async function bet(message) {
    const { author, channel, guild } = message;
    const args = message.content.slice(1).split(" ");

    const bet = Math.round(parseInt(args[1], 10));
    if (bet <= 0 || Number.isNaN(bet)) {
        return channel.send(
            `${author} try putting coins in the machine next time mate`
        );
    }

    const gains = await makeBet(author.id, guild.id, bet);
    const bal = await loadBalance(author.id, guild.id);
    if (gains > 0) {
        return channel.send(
            `${author} you won £${gains}! drinks on you (your balance is now £${bal})`
        );
    } else if (gains < 0) {
        return channel.send(
            `${author} you lost £${gains}. don't let the mrs hear (your balance is now £${bal})`
        );
    } else {
        return channel.send(
            `${author} https://www.begambleaware.org: when the fun stops, stop`
        );
    }
});

async function balance(message: discord.Message) {
    const { author, channel, guild } = message;
    const mugs = Array.from(message.mentions.users.values());

    if (mugs.length < 1) {
        const balance = await loadBalance(author.id, guild.id);
        return channel.send(`${author} your balance is £${balance}`);
    }

    return Promise.all(
        mugs.map(async (mug) => {
            const balance = await loadBalance(mug.id, guild.id);
            return channel.send(`${author} ${mug}'s balance is £${balance}`);
        })
    );
}
commands.set("balance", balance).set("bal", balance);

commands.set("mug", async function mug(message: discord.Message) {
    const { author, channel, guild } = message;

    if (await inPrison(author.id, guild.id)) {
        const lastInPrison = await loadLastPrison(author.id, guild.id);
        const when = distanceInWordsToNow(
            addMinutes(lastInPrison, PRISON_PERIOD)
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

    const result = await commitMugging(author.id, victim.id, guild.id);
    switch (result) {
        case 0:
            return channel.send(`${author} they have NOTHING`);
        case -1:
            return channel.send(
                `${author} you're nicked! that's ${PRISON_PERIOD} minutes inside for you`
            );
        default:
            return channel.send(
                `${author} you successfully nicked £${result} off ${victim}`
            );
    }
});

commands.set("give", async function give(message: discord.Message) {
    const { channel, author, guild } = message;
    const menchies = Array.from(message.mentions.users.values());
    if (menchies.length < 1) {
        return channel.send(`${author} give to whom?`);
    } else if (menchies.length > 1) {
        return channel.send(`${author} only one at a time`);
    }
    const target = menchies[0];
    await touchUserRecord(target.id, guild.id);

    const match = message.cleanContent.match(/\b\d\b/);
    if (!match) {
        return channel.send(`${author} give something you heartless bastard`);
    }

    const gift = Math.round(parseInt(match[0], 10));
    if (gift <= 0 || Number.isNaN(gift)) {
        return channel.send(`${author} give something you heartless bastard`);
    }

    if (!(await sendGift(author.id, target.id, guild.id, gift))) {
        return channel.send(`${author} you don't have the money for that`);
    }
    return channel.send(`${author} you gave £${gift} to ${target}`);
});

commands.set("players", async function players(message: discord.Message) {
    const { channel, guild: server } = message;
    const players = (await loadGuildPlayers(server.id))
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
