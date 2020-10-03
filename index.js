const fs = require("fs");
const d3Array = require("d3-array");
const d3Format = require("d3-format");

const TEMPLATE = "7x7";
const WORD_LIST = "2010";
const EMPTY = ".";
const BLOCK = "#";
const MIN_LEN = 3;
const MAX_ITERATIONS = 1000000000;
const INTERVAL = 10000;

let iterations = 0;
let index = 0;
let words, boards, clues, freq;


const unique = (arr) => [...new Set(arr)];

const copyBoard = (board) => board.map(row => row.map(col => col));

function getLetterFrequency(arr) {
	const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const dict = {};
  alpha.split("").forEach((a) => (dict[a] = 0));

	let sum = 0;
  arr.forEach(val => {
    const letters = val.split("");
    letters.forEach((letter) => {
      if (alpha.includes(letter)) {
				sum += 1;
				dict[letter] += 1;
			}
    });
  });

  Object.keys(dict).forEach((letter) => {
    dict[letter] = dict[letter] / sum;
  });

  return dict;
}

function loadWords(file) {
	const txt = fs.readFileSync(file, "utf8");
  const s = txt.split("\n").map(d => d.toUpperCase()).filter(d => d);
	return s;
}

function getWords(arr) {
	const output = [];
	arr.forEach(w => {
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
					const endX = stopper > -1 ? stopper + x : cols.length - 1;
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
					const endY = stopper > -1 ? stopper + y : colVals.length - 1;
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

function solve() {
	while (iterations < MAX_ITERATIONS) {
    iterations += 1;
    if (iterations % INTERVAL === 0) console.log(d3Format.format(',')(iterations));
    if (index === -1) return "failed to generate a full board";
    if (index === clues.length) return boards.pop();

    const { len, letters } = clues[index];

		if (!words.closed[index]) words.closed[index] = {};
    const exp = letters
      .map(({ x, y }) => {
        const isEmpty = boards[index][y][x] === EMPTY;
        const isBlock = boards[index][y][x] === BLOCK;
        return isEmpty || isBlock ? `\\w` : boards[index][y][x];
      })
      .join("");

    const re = new RegExp(exp);
		
		// TODO speed up
    const matches = words.open[len].filter((word) => 
			word.match(re) &&
			!words.closed[index][word]
		);

    if (matches.length) {
      const newBoard = copyBoard(boards[index]);
      boards.push(newBoard);
      // TODO optimize choice by letter frequency
      const choice = matches[0];
      const openIndex = words.open[len].indexOf(choice);
      words.open[len][openIndex] = '';

      const chars = choice.split("");
      letters.forEach((d, i) => (newBoard[d.y][d.x] = chars[i]));
      words.closed[index][choice] = openIndex + 1;
      index += 1;
    } else {
      boards.pop();

      if (index > 0) {
				Object.keys(words.closed[index - 1]).forEach((w) => {
					// grab the stored position and re-insert
					const pos = words.closed[index - 1][w] - 1;
					words.open[w.length][pos] = w;
				});
				words.closed[index] = {};
      }

      index -= 1;
    }
  }
}

function init() {
  const rawWords = loadWords(`./words/${WORD_LIST}.txt`);

  freq = getLetterFrequency(rawWords);

  const open = getWords(rawWords);

  // sort by letter freq
	open.forEach(arr => {
    arr.sort((a, b) => {
    	const aScore = d3Array.sum(a.split("").map(d => freq[d]));
    	const bScore = d3Array.sum(b.split("").map((d) => freq[d]));
    	return d3Array.descending(aScore, bScore);
    });
  });

  const closed = [{}];
  words = { open, closed };

  const board = getBoard(`./templates/${TEMPLATE}.txt`);
  boards = [board];

  clues = getClues(board);

  clues.sort((a, b) => d3Array.descending(a.len, b.len));

  console.log("clues:", clues.length);

  console.log("empty board...");
  renderBoard(board);
  console.time("solve loop");
  const result = solve();
	console.log("iterations:", d3Format.format(",")(iterations));
  if (typeof result === "object") {
    console.log("filled board...");
    renderBoard(result);
  } else console.log(result);
  console.timeEnd("solve loop");
}

init();


