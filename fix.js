const fs = require("fs");

function clean(arr) {
	const [ word ] = arr.join("").split("#");
	return word.length >= 3 ? word : null;
}

function calculate(file) {
	const rows = fs.readFileSync(`./output/board/${file}`, "utf8")
		.replace(/ /g, '')
		.split("\n")
		.filter(d => d);
	
	const grid = rows.map(r => r.split(""));
	const result = [];

	grid.forEach((r, y) => {
		r.forEach((c, x) => {
			// build across and down starting from x,y
			const across = clean(r.slice(x));
			const down = clean(grid.slice(y).map(gr => gr[x]));
			if (across && !result.find(d => d.answer.includes(across) && d.y === y)) result.push({
				x,
				y,
				answer: across,
				direction: "across"
			});
			if (down && !result.find(d => d.answer.includes(down) && d.x === x)) result.push({
				x,
				y,
				answer: down,
				direction: "down"
			})
		});
	});
	const output = JSON.stringify(result);
	fs.writeFileSync(`./output/fixed/${file.replace(".txt", ".json")}`, output);
}

const files = fs.readdirSync("./output/board").filter(d => d.includes(".txt"));

files.forEach(calculate);

