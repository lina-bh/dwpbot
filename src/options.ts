import * as fs from "fs";

const options = JSON.parse(fs.readFileSync("./options.json", "utf-8"));
Object.freeze(options);

export default options;
