import * as discord from "discord.js";

export default interface IDataSource {
    init(): Promise<any>;
    exists(user: discord.User, server: discord.Guild): Promise<boolean>;
    update(user: discord.User, server: discord.Guild): Promise<any>;
    banned(user: discord.User): Promise<boolean>;
    ban(user: discord.User): Promise<any>;
    unban(user: discord.User): Promise<any>;
    balance(user: discord.User, server: discord.Guild): Promise<number>;
    incrBalance(user: discord.User, server: discord.Guild, amount: number): Promise<any>;
    moveMoney(source: discord.User, target: discord.User, server: discord.Guild, amount: number): void;
    totalMoney(server: discord.Guild): Promise<number>;
    getLastSignon(user: discord.User, server: discord.Guild): Promise<Date>;
    setLastSignon(user: discord.User, server: discord.Guild): Promise<any>;
    getLastInPrison(user: discord.User, server: discord.Guild): Promise<Date>;
    setLastInPrison(user: discord.User, server: discord.Guild): Promise<any>;
    getPlayers(server: discord.Guild): Promise<any[]>;
}
