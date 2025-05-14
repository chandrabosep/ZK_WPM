"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Clock, RefreshCw, Trophy } from "lucide-react";

/* ─────────────────────  WORD BANK  ───────────────────── */
const commonWords = [
	"the",
	"of",
	"and",
	"to",
	"in",
	"is",
	"you",
	"that",
	"it",
	"he",
	"was",
	"for",
	"on",
	"are",
	"as",
	"with",
	"his",
	"they",
	"I",
	"at",
	"be",
	"this",
	"have",
	"from",
	"or",
	"one",
	"had",
	"by",
	"not",
	"but",
	"all",
	"we",
	"when",
	"your",
	"can",
	"said",
	"there",
	"their",
	"how",
	"which",
	"she",
	"will",
	"about",
	"out",
	"many",
	"then",
	"them",
	"these",
	"some",
	"would",
	"make",
	"like",
	"time",
	"has",
	"look",
	"more",
	"write",
	"could",
	"people",
	"than",
	"first",
	"call",
	"now",
	"find",
	"long",
	"get",
	"come",
	"part",
	"code",
	"data",
	"file",
	"type",
	"user",
	"site",
	"link",
	"page",
	"text",
	"form",
	"input",
	"menu",
	"tool",
	"save",
	"work",
	"path",
	"plan",
	"copy",
	"game",
	"team",
	"help",
	"task",
	"open",
	"view",
	"keyboard",
	"software",
	"computer",
	"internet",
	"language",
	"password",
	"solution",
	"decision",
	"security",
	"download",
	"function",
	"progress",
	"research",
	"development",
	"experience",
	"performance",
	"application",
	"technology",
	"document",
];

const generateWordList = (n = 100) => {
	const arr = [...commonWords];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	const res: string[] = [];
	while (res.length < n)
		res.push(...arr.slice(0, Math.min(n - res.length, arr.length)));
	return res;
};

const calcWPM = (chars: number, ms: number) =>
	ms < 600 ? 0 : Math.round(chars / 5 / (ms / 60000));

/* ────────────────────  MAIN  ──────────────────── */
export default function TypingTest() {
	/* ——— state ——— */
	const [words, setWords] = useState<string[]>([]);
	const [currentIdx, setCurrentIdx] = useState(0);
	const [input, setInput] = useState("");

	const [correctWords, setCorrectWords] = useState(0);
	const [wrongWords, setWrongWords] = useState(0);

	const [wpm, setWpm] = useState(0);
	const [accuracy, setAccuracy] = useState(100);
	const [netWpm, setNetWpm] = useState(0);

	const [timeLeft, setTimeLeft] = useState(60);
	const [started, setStarted] = useState(false);
	const [finished, setFinished] = useState(false);

	const [completed, setCompleted] = useState<
		{ word: string; correct: boolean }[]
	>([]);

	/* ——— refs ——— */
	const startRef = useRef<number | null>(null);
	const endRef = useRef<number | null>(null); // NEW
	const keystrokesRef = useRef<string[]>([]); // NEW

	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const statsRef = useRef<NodeJS.Timeout | null>(null);

	const correctKeyRef = useRef(0);
	const errorKeyRef = useRef(0);

	/* ——— layout helpers ——— */
	const wordsPerLine = 5;
	const linesVisible = 3;
	const [currentLine, setCurrentLine] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const visibleWords = useMemo(() => {
		const start = currentLine * wordsPerLine;
		return words.slice(start, start + wordsPerLine * linesVisible);
	}, [words, currentLine]);

	/* ——— timer cleanup ——— */
	const clearTimers = useCallback(() => {
		if (timerRef.current) clearInterval(timerRef.current);
		if (statsRef.current) clearInterval(statsRef.current);
		timerRef.current = statsRef.current = null;
	}, []);

	/* ——— start / reset ——— */
	const startTest = useCallback(() => {
		clearTimers();
		setWords(generateWordList());
		setCurrentIdx(0);
		setInput("");

		setCorrectWords(0);
		setWrongWords(0);
		setWpm(0);
		setAccuracy(100);
		setNetWpm(0);

		correctKeyRef.current = 0;
		errorKeyRef.current = 0;
		keystrokesRef.current = []; // reset log
		startRef.current = null;
		endRef.current = null;

		setTimeLeft(60);
		setStarted(false);
		setFinished(false);
		setCompleted([]);
		setCurrentLine(0);

		setTimeout(() => inputRef.current?.focus(), 50);
	}, [clearTimers]);

	useEffect(() => {
		startTest();
		return clearTimers;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/* ——— live stats updater ——— */
	const updateStats = useCallback(() => {
		if (!startRef.current) return;
		const chars = correctKeyRef.current + errorKeyRef.current;
		const elapsed = Date.now() - startRef.current;
		const curWpm = calcWPM(chars, elapsed);
		setWpm(curWpm);

		if (chars > 0) {
			const acc = Math.round((correctKeyRef.current / chars) * 100);
			setAccuracy(acc);
			setNetWpm(Math.round((curWpm * acc) / 100));
		}
	}, []);

	/* ——— finish ——— */
	const finishTest = useCallback(() => {
		if (finished || !startRef.current) return;
		endRef.current = Date.now();
		updateStats();
		clearTimers();
		setFinished(true);

		/* —— console report —— */
		const chars = correctKeyRef.current + errorKeyRef.current;
		const finalWpm = calcWPM(
			chars,
			(endRef.current ?? Date.now()) - startRef.current
		);
		const acc = chars
			? Math.round((correctKeyRef.current / chars) * 100)
			: 0;

		console.log({
			startTime: new Date(startRef.current).toLocaleTimeString(),
			endTime: new Date(
				endRef.current ?? Date.now()
			).toLocaleTimeString(),
			targetSentence: words.join(" "),
			keystrokes: keystrokesRef.current,
			wpm: finalWpm,
			accuracy: acc,
			correctWords,
			wrongWords,
		});
	}, [finished, updateStats, clearTimers, words, correctWords, wrongWords]);

	/* ——— countdown & stats intervals ——— */
	useEffect(() => {
		if (started && !finished) {
			if (!timerRef.current) {
				timerRef.current = setInterval(() => {
					if (!startRef.current) return;
					const elapsed = Math.floor(
						(Date.now() - startRef.current) / 1000
					);
					const remain = Math.max(0, 60 - elapsed);
					setTimeLeft(remain);
					if (remain === 0) finishTest();
				}, 200);
			}
			if (!statsRef.current)
				statsRef.current = setInterval(updateStats, 200);
		}
		return () => {
			if (finished) clearTimers();
		};
	}, [started, finished, finishTest, updateStats, clearTimers]);

	/* ——— input handlers ——— */
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		if (!started && val) {
			setStarted(true);
			startRef.current = Date.now();
		}

		/* record keystroke (character insertion/deletion) */
		keystrokesRef.current.push(
			val.length > input.length ? val.slice(-1) : "Backspace"
		);

		/* stats */
		if (val.length !== input.length) {
			const idx = val.length - 1;
			const target = words[currentIdx] || "";
			if (idx >= 0) {
				if (idx < target.length && val[idx] === target[idx])
					correctKeyRef.current += 1;
				else errorKeyRef.current += 1;
			}
		}
		setInput(val);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		/* record special keys */
		keystrokesRef.current.push(e.key);

		if (e.key === " " || e.key === "Enter") {
			e.preventDefault();
			const typed = input.trim();
			if (!typed) return;

			const target = words[currentIdx];
			const correct = typed === target;
			correct
				? setCorrectWords((p) => p + 1)
				: setWrongWords((p) => p + 1);

			setCompleted((p) => [...p, { word: target, correct }]);
			setCurrentIdx((p) => p + 1);
			setInput("");

			if (currentIdx >= words.length - 1) finishTest();

			const lineIdx = Math.floor((currentIdx + 1) / wordsPerLine);
			if (lineIdx > currentLine) setCurrentLine(lineIdx);
		}
	};

	/* ——— helpers ——— */
	const isCurrentCorrect = useMemo(() => {
		const w = words[currentIdx] || "";
		return w.startsWith(input);
	}, [words, currentIdx, input]);

	const renderWord = (word: string, active: boolean) =>
		!active ? (
			word
		) : (
			<>
				<span
					className={
						isCurrentCorrect ? "text-green-600" : "text-red-600"
					}
				>
					{word.slice(0, input.length)}
				</span>
				{word.slice(input.length)}
			</>
		);

	/* ——— JSX ——— */
	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Typing Speed Test</span>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-1">
							<Clock className="h-5 w-5" />
							<span className="font-mono">{timeLeft}s</span>
						</div>
						{started && !finished && (
							<div className="text-xs px-2 py-1 bg-blue-100 rounded-full text-blue-800">
								{wpm} WPM
							</div>
						)}
					</div>
				</CardTitle>
				<CardDescription>
					Type each word and press&nbsp;space (or Enter). Stats update
					live.
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-4">
				{!finished ? (
					/* ——— active test ——— */
					<>
						{/* live stats */}
						<div className="flex justify-between text-sm mb-2">
							<div>
								<strong>WPM:</strong> {started ? wpm : 0}
							</div>
							<div>
								<strong>Accuracy:</strong>{" "}
								{started ? accuracy : 0}%
							</div>
							<div>
								<strong>Net WPM:</strong> {started ? netWpm : 0}
							</div>
						</div>

						{/* words */}
						<div className="p-6 bg-muted rounded-md flex flex-col gap-2 min-h-[200px]">
							{visibleWords.length ? (
								<div className="flex flex-wrap gap-2 leading-loose">
									{visibleWords.map((w, i) => {
										const global =
											currentLine * wordsPerLine + i;
										const done = global < currentIdx;
										const active = global === currentIdx;
										const comp = done
											? completed[global]
											: null;

										return (
											<span
												key={`${global}-${w}`}
												className={`text-lg transition-all ${
													done
														? comp?.correct
															? "text-green-600"
															: "text-red-600"
														: active
														? "bg-primary/20 px-1 rounded"
														: "text-gray-800"
												}`}
											>
												{active
													? renderWord(w, true)
													: w}
											</span>
										);
									})}
								</div>
							) : (
								<p className="text-muted-foreground">
									Loading words…
								</p>
							)}
						</div>

						{/* input */}
						<input
							ref={inputRef}
							type="text"
							value={input}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							className={`w-full p-4 text-lg font-mono border rounded-md ${
								isCurrentCorrect
									? input
										? "border-green-500 bg-green-50"
										: "border-gray-300"
									: "border-red-500 bg-red-50"
							}`}
							placeholder="Type here…"
							autoFocus
						/>

						<div className="flex justify-between text-sm text-muted-foreground">
							<div>
								Progress:{" "}
								{Math.round((currentIdx / words.length) * 100)}%
							</div>
							<div>Correct: {correctWords}</div>
							<div>Wrong: {wrongWords}</div>
						</div>
					</>
				) : (
					/* ——— results ——— */
					<div className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
							<ResultCard
								value={
									<>
										{correctKeyRef.current +
											errorKeyRef.current}
										<div className="mt-1 text-xs text-muted-foreground">
											<span className="text-green-600">
												✓ {correctKeyRef.current}
											</span>
											{" · "}
											<span className="text-red-600">
												✗ {errorKeyRef.current}
											</span>
										</div>
									</>
								}
								label="Keystrokes"
							/>

							<ResultCard value={wpm} label="Words / minute" />
							<ResultCard
								value={`${accuracy}%`}
								label="Accuracy"
							/>
							<ResultCard value={netWpm} label="Net WPM" />
							<ResultCard
								value={correctWords}
								label="Correct words"
							/>
							<ResultCard
								value={wrongWords}
								label="Wrong words"
							/>
						</div>
					</div>
				)}
			</CardContent>

			<CardFooter className="flex justify-between">
				<Button variant="outline" onClick={startTest}>
					<RefreshCw className="mr-2 h-4 w-4" /> New Test
				</Button>
				{started && !finished && (
					<Button onClick={finishTest}>
						<Trophy className="mr-2 h-4 w-4" /> Finish
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

/* simple stat tile */
const ResultCard = memo(
	({ value, label }: { value: React.ReactNode; label: string }) => (
		<div className="rounded-lg border bg-muted p-5 text-center">
			<div className="text-3xl font-semibold leading-none">{value}</div>
			<div className="mt-1 text-sm text-muted-foreground">{label}</div>
		</div>
	)
);
ResultCard.displayName = "ResultCard";
