import { differenceInMinutes } from "date-fns";
import { random } from "lodash";

import {
    addBalance,
    loadBalance,
    storeLastPrison,
    storeLastSignon,
    loadGuildTotal,
    loadLastSignon,
    loadLastPrison,
} from "./database";

const LOWER_BENE = 10;
const UPPER_BENE = 100;
export const SIGNON_PERIOD = 30;
export const PRISON_PERIOD = 10;

export async function cantSignon(
    userId: string,
    guildId: string
): Promise<boolean> {
    const lastSignon = await loadLastSignon(userId, guildId);
    const diff = differenceInMinutes(Date.now(), lastSignon);
    return diff < SIGNON_PERIOD;
}

export async function inPrison(
    userId: string,
    guildId: string
): Promise<boolean> {
    const lastInPrison = await loadLastPrison(userId, guildId);
    const diff = differenceInMinutes(new Date(), lastInPrison);
    return diff < PRISON_PERIOD;
}

export async function payBennies(
    userId: string,
    guildId: string,
    lo = LOWER_BENE,
    hi = UPPER_BENE
): Promise<number> {
    const amt = random(lo, hi);
    await addBalance(userId, guildId, amt);
    await storeLastSignon(userId, guildId, new Date());
    return amt;
}

export async function makeBet(
    userId: string,
    guildId: string,
    bet: number
): Promise<number> {
    const bal = await loadBalance(userId, guildId);
    if (bet > bal) {
        return 0;
    }

    const won = Math.random() > 0.5;
    if (won) {
        await addBalance(userId, guildId, bet);
        return bet;
    }

    const loss = random(1, bet);
    await addBalance(userId, guildId, -loss);
    return loss;
}

export async function commitMugging(
    userId: string,
    victimId: string,
    guildId: string
): Promise<number> {
    const victimBal = await loadBalance(victimId, guildId);
    if (victimBal === 0) {
        return 0;
    }

    const success =
        Math.random() <= victimBal / (await loadGuildTotal(guildId));
    if (!success) {
        await storeLastPrison(userId, guildId, new Date());
        return -1;
    }

    const takings = random(1, victimBal);
    await addBalance(userId, guildId, takings);
    await addBalance(victimId, guildId, -takings);
}

export async function sendGift(
    userId: string,
    targetId: string,
    guildId: string,
    amt: number
): Promise<boolean> {
    const bal = await loadBalance(userId, guildId);
    if (amt > bal) {
        return false;
    }
    await addBalance(targetId, guildId, amt);
    await addBalance(userId, guildId, -amt);
    return true;
}
