import yaml from "yaml";
import { Counter, Score } from "./counter";
import fs from "fs";


async function main() {
	console.error("Started.");
	const config = yaml.parse(await fs.promises.readFile("config.yaml", "utf-8"));
	const counter = new Counter(config);
	const scores: Score[] = await counter.run();
	let csvString = `Rank,Name,Score\n`;
	for (let i = 0; i < scores.length; ++i) {
		const score = scores[i];
		csvString += `${i + 1},${score.name},${score.points}\n`;
	}
	try {
		await fs.promises.access("output");
	} catch (e) {
		await fs.promises.mkdir("output");
	}
	await fs.promises.writeFile("output/data.csv", csvString);
	console.error("Fnished.");
}
main();
