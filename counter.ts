import axios, { AxiosProxyConfig } from "axios";
import _ from "underscore";

export interface Config {
	apiKey: string;
	proxy: AxiosProxyConfig;
	tournaments: string[];
}

export interface Score {
	name: string;
	points: number;
}

interface MatchData {
	id: number,
	player1_id: number,
	player2_id: number,
	winner_id: number,
	loser_id: number
}

interface Match {
	match: MatchData;
}

interface PlayerData {
	id: number,
	display_name: string
}
interface Player {
	participant: PlayerData
}

export class Counter {
	config: Config;
	scores: Map<number, Score>;
	constructor(config: Config) {
		this.config = config;
		this.scores = new Map();
	}
	private setScore(winner: string, loser: string) {
		for (let p of [winner, loser]) {
			const id = parseInt(p.split(/[\+ \uff0b]/)[0]);
			if (isNaN(id)) {
				console.error(`Player QQ number not found: ${p}.`);
				continue;
			}
			if (!this.scores.has(id)) {
				this.scores.set(id, {
					name: p,
					points: 0
				});
			}
		}
		const wid = parseInt(winner.split(/[\+ \uff0b]/)[0]);
		if (isNaN(wid)) {
			return;
		}
		//console.error(`WIN: ${wid} ${winner}`);
		const wscore = this.scores.get(wid);
		++wscore.points;
	}
	private async readTournament(tournament: string) {
		//console.error(`Reading tournament ${tournament}.`);
		const [players, matches] = await Promise.all(["participants", "matches"].map(t => axios.get(` https://api.challonge.com/v1/tournaments/${tournament}/${t}.json`, {
			responseType: "json",
			proxy: this.config.proxy,
			params: {
				api_key: this.config.apiKey,
				state: t === "matches" ? "complete" : undefined
			}
		})));
		const playerNameMap = new Map<number, string>();
		const playerResult = players.data as Player[];
		for (let _player of playerResult) {
			const player = _player.participant;
			playerNameMap.set(player.id, player.display_name);
			//console.error(`Read player ${player.id} => ${player.display_name}`);
		}
		const matchResult = matches.data as Match[];
		for (let _match of matchResult) {
			const match = _match.match;
			if (match.winner_id && match.loser_id) {
				this.setScore(playerNameMap.get(match.winner_id), playerNameMap.get(match.loser_id));
			} else {
				console.error(`Result of match ${match.id} ${playerNameMap.get(match.player1_id)} vs ${playerNameMap.get(match.player2_id)} cannot be read.`);
			}
		}
	}
	async run(): Promise<Score[]> {

		for (let tournament of this.config.tournaments) {
			await this.readTournament(tournament);
		}
		const scores = Array.from(this.scores.values());
		scores.sort((a, b) => {
			return b.points - a.points;
		});
		
		return scores;
	}
}
