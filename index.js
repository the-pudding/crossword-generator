const fs = require("fs");
const d3Array = require("d3-array");

const TEMPLATE = '9x9';
const WORD_LIST = '2010';
const EMPTY = ".";
const BLOCK = "#";
const MIN_LEN = 3;

let iterations = 0;

let words, boards, clues;

const unique = (arr) => [...new Set(arr)];

const copyBoard = (board) => board.map(row => row.map(col => col));

function getWords(file) {
	const txt = fs.readFileSync(file, "utf8");
	const s = txt.split("\n");
	const output = [];
	s.forEach(w => {
		if (!output[w.length]) output[w.length] = [];
		output[w.length].push(w);
	});
	return output;
}

function getBoard(file) {
	const t = fs.readFileSync(file, "utf8");
  const rows = t.split("\n");
	const withCols = rows.map(row => row.split(""));
	return withCols;
}

function getClues(rows) {
	const output = [];
	let id = 0;
  rows.forEach((cols, y) => {
		cols.forEach((val, x) => {
			const leftVal = cols[x - 1];
			const upVal = rows[y - 1] ? rows[y - 1][x] : null;
			const isStart = val === EMPTY && (x === 0 || y === 0 || upVal === BLOCK || leftVal === BLOCK);
			if (isStart) {
				const right = x === 0 || leftVal === BLOCK;
				const down = y === 0 || upVal === BLOCK;
				const start = { x, y };
				
				if (right) {
					const subRow = cols.filter((d, i) => i > x);
					const stopper = subRow.indexOf(BLOCK);
					const endX = stopper > -1 ? stopper : cols.length - 1;
          const end = { x: endX, y };
					const len = endX - x + 1;
					const letters = d3Array.range(len).map((i) => ({
						x: x + i,
						y,
						str: `${x + i}${y}`
					}));
					if (len >= MIN_LEN) output.push({ id, start, end, len, letters });
					id += 1;
				}
				
				if (down) {
					const colVals = rows.map(r => r[x]);
          const subCol = colVals.filter((d, j) => j > y);
          const stopper = subCol.indexOf(BLOCK);
					const endY = stopper > -1 ? stopper : colVals.length - 1;
          const end = { x, y: endY };
					const len = end.y - y + 1;
					const letters = d3Array.range(len).map((i) => ({
						x,
            y: y + i,
						str: `${x}${y + i}`
          }));
         	if (len >= MIN_LEN) output.push({ id, start, end, len, letters });
					id += 1;
        }
			}
		});
	});
	return output;
}

function renderBoard(board) {
	const str = board.map(row => row.join(" ")).join("\n");
	console.log(`\n${str}\n`);
}

function solve(index, cb) {
	iterations += 1;
	if (iterations % 100000 === 0) console.log(iterations);
	if (index === -1) return cb('failed to generate a full board');
	if (index === clues.length) return cb(boards.pop());
	const { len, letters } = clues[index];

	if (!words.closed[index]) words.closed[index] = [];

  const exp = letters
    .map(({ x, y }) => {
      const isEmpty = boards[index][y][x] === EMPTY;
      const isBlock = boards[index][y][x] === BLOCK;
      return isEmpty || isBlock ? `\\w` : boards[index][y][x];
    })
    .join("");

  const re = new RegExp(exp);
  const matches = words.open[len].filter((word) => word.match(re));

  if (matches.length) {
		const newBoard = copyBoard(boards[index]);
		boards.push(newBoard);
		// TODO optimize choice by letter frequency
    const choice = matches[0];
		const openIndex = words.open[len].indexOf(choice);
		words.open[len].splice(openIndex, 1);

    const chars = choice.split("");
    letters.forEach((d, i) => (newBoard[d.y][d.x] = chars[i]));
		words.closed[index].push(choice);
		process.nextTick(() => solve(index + 1, cb));
  } else {
    boards.pop();

    if (index > 0) {
      words.closed[index].forEach((w) => words.open[w.length].push(w));
      words.closed[index] = [];
    }

    process.nextTick(() => solve(index - 1, cb));
  }
}

function init() {
	const open = getWords(`./words/${WORD_LIST}.txt`);
	const closed = [];
	words = { open, closed };

  const board = getBoard(`./templates/${TEMPLATE}.txt`);
	boards = [board];

	clues = getClues(board);
	clues.sort((a, b) => d3Array.descending(a.len, b.len));

	console.log('clues:', clues.length);
	
	renderBoard(board);
	
	console.time('solve');
	try {
		solve(0, (result) => {
			console.log({ iterations });
			if (typeof result === 'object') renderBoard(result);
			else console.log(result);
			console.timeEnd("solve");
		});
	} catch (err) {
		console.log(err);
	}
}

init();


