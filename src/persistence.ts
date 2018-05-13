import fs		from "fs";
import path     from "path";
import sqlite3  from "better-sqlite3";

export class DatabaseConnection {
    datadir : string;
    sql : sqlite3;

    constructor(datadir: string) {
        this.datadir = datadir;
        let dbpath = path.resolve(datadir, "sledge.db");

        this.sql = new sqlite3(dbpath);
        this.initDatabase();
    }

    initDatabase() {
		try {
            fs.mkdirSync(this.datadir);
		} catch (err) {
            if (err.code !== "EEXIST") {
                throw err;
            }
        }

		this.sql.exec(
			// The hacks table is a all the hacks and the info needed to judge them
			"CREATE TABLE IF NOT EXISTS hacks ("
				+"id INTEGER NOT NULL,"
				+"name TEXT NOT NULL,"
				+"description TEXT NOT NULL,"
				+"location INTEGER NOT NULL,"
				+"PRIMARY KEY(id)"
			+");");
		this.sql.exec(
			// The judges table is all the judges, what they need to authenticate,
			// and how to contact them.
			"CREATE TABLE IF NOT EXISTS judges ("
				+"id INTEGER NOT NULL,"
				+"name TEXT NOT NULL,"
				+"email TEXT NOT NULL,"
				+"PRIMARY KEY(id)"
			+");");
		this.sql.exec(
			// The tokens table associates secrets with judges, whereas judge 0 is an
			// admin with full privileges
			"CREATE TABLE IF NOT EXISTS tokens ("
				+"id INTEGER NOT NULL,"
				+"secret TEXT NOT NULL,"
				+"judge_id INTEGER NOT NULL,"
				+"FOREIGN KEY(judge_id) REFERENCES judges(id),"
				+"PRIMARY KEY(id)"
			+");");
        this.sql.exec(
            // The judge_hacks table records all hacks assigned to a judge
            "CREATE TABLE IF NOT EXISTS judge_hacks ("
                +"id INTEGER NOT NULL,"
                +"judge_id INTEGER NOT NULL,"
                +"hack_id INTEGER NOT NULL,"
                +"priority INTEGER NOT NULL,"
                +"FOREIGN KEY(judge_id) REFERENCES judges(id),"
                +"FOREIGN KEY(hack_id) REFERENCES hacks(id),"
                +"PRIMARY KEY(id)"
            +");");
        this.sql.exec(
            // The superlatives table is all the superlatives
            "CREATE TABLE IF NOT EXISTS superlatives ("
                +"id INTEGER NOT NULL,"
                +"name TEXT NOT NULL,"
                +"PRIMARY KEY(id)"
            +");");
        this.sql.exec(
            // The superlative_placements is the first and second choice of
            // each judge for each superlative
            "CREATE TABLE IF NOT EXISTS superlative_placements ("
                +"id INTEGER NOT NULL,"
                +"judge_id INTEGER NOT NULL,"
                +"superlative_id INTEGER NOT NULL,"
                +"first_choice INTEGER,"
                +"second_choice INTEGER,"
                +"FOREIGN KEY(judge_id) REFERENCES judges(id),"
                +"FOREIGN KEY(first_choice) REFERENCES hacks(id),"
                +"FOREIGN KEY(second_choice) REFERENCES hacks(id),"
                +"PRIMARY KEY(id)"
            +");");
        this.sql.exec(
            // The ratings table is the score given by each judge on a 0-20 scale
            "CREATE TABLE IF NOT EXISTS ratings ("
                +"id INTEGER NOT NULL,"
                +"judge_id INTEGER NOT NULL,"
                +"hack_id INTEGER NOT NULL,"
                +"rating INTEGER NOT NULL,"
                +"FOREIGN KEY(judge_id) REFERENCES judges(id),"
                +"FOREIGN KEY(hack_id) REFERENCES hacks(id),"
                +"PRIMARY KEY(id)"
            +");");
    }

    addHack(hack : Hack) {
        let stmt = this.sql.prepare(
            "INSERT INTO hacks(name, description, location)"
            +"VALUES (?,?,?);");

        stmt.run([hack.name, hack.description]);
    }

    areHacksPopulated() : Boolean {
        let stmt = this.sql.prepare("SELECT * FROM hacks;");
        return !!stmt.get();
    }

    addSueprlativePlacement(placement : SuperlativePlacement) {
        let stmt = this.sql.prepare(
            "INSERT INTO superlative_placements"
                +"(id, judge_id, superlative_id, first_choice, second_choice)"
            +"VALUES ("
                +"(SELECT id FROM superlative_placements WHERE judge_id=? AND superlative_id = ?),"
            +"?, ?, ?, ?);");

        stmt.run([
            placement.judgeId, placement.superlativeId,
            placement.judgeId, placement.superlativeId,
            placement.firstChoiceId, placement.secondChoiceId ]);
    }

    addJudge(judge : Judge) {
        let stmt = this.sql.prepare(
            "INSERT INTO judges (name, email)"
            +"VALUES (?, ?);");

        stmt.run([judge.name, judge.email]);
    }
}

interface Hack {
    id?: number;
    name: string;
    description: string;
    location: number;
}

interface Judge {
    id?: number;
    name: string;
    email: string;
}

interface Token {
    id?: number;
    secret: string;
    judgeId: number;
}

interface JudgeHack {
    id?: number;
    judgeId: number;
    hackId: number;
    priority: number;
}

interface Superlative {
    id?: number;
    name: string;
}

interface SuperlativePlacement {
    id?: number;
    judgeId: number;
    superlativeId: number;
    firstChoiceId: number;
    secondChoiceId: number;
}

interface Rating {
    id?: number;
    judgeId: number;
    hackId: number;
    rating: number;
}
