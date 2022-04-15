"use strict";
import * as discord from "discord.js";
// import options from "./options.json";

const client = new discord.Client({
    // commandPrefix: options.prefix,
    // nonCommandEditable: false,
    // owner: options.adminId,
    // unknownCommandResponse: false,
});
export default client;

client.on("ready", () => {
    console.log("Ready.");
});

client.on("error", (err) => {
    console.error(err);
    process.exit(1);
});
