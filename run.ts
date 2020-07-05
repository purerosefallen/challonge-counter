import yaml from "yaml";
import { Counter, Score } from "./counter";
import fs from "fs";


async function main() {
	console.error("Started.");
	const config = yaml.parse(await fs.promises.readFile("config.yaml", "utf-8"));
	const counter = new Counter(config);
	const scores: Score[] = await counter.run();
	console.log(JSON.stringify(scores, null, 2));
	console.error("Fnished.");
}
main();
