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

interface Tournament {
	id: number;
	name: string;
	participants: Player[];
	matches: Match[];
	tournament_type: string;
}

interface MatchData {
	id: number,
	state: string,
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
		const tournamentData = (await axios.get(` https://api.challonge.com/v1/tournaments/${tournament}.json`, {
			responseType: "json",
			proxy: this.config.proxy,
			params: {
				api_key: this.config.apiKey,
				include_participants: 1,
				include_matches: 1
			}
		})).data.tournament as Tournament;
		const playerNameMap = new Map<number, string>();
		const playerResult = tournamentData.participants;
		for (let _player of playerResult) {
			const player = _player.participant;
			playerNameMap.set(player.id, player.display_name);
			//console.error(`Read player ${player.id} => ${player.display_name}`);
		}
		const matchResult = tournamentData.matches;
		for (let _match of matchResult) {
			const match = _match.match;
			if (match.state !== "complete") {
				continue;
			}
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
