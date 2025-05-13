"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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

// Large corpus of common words for typing test - using more natural vocabulary
const commonWords = [
	// Basic words (high frequency)
	"the",
	"of",
	"and",
	"a",
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
	"word",
	"but",
	"not",
	"what",
	"all",
	"were",
	"we",
	"when",
	"your",
	"can",
	"said",

	// Medium difficulty words
	"there",
	"use",
	"each",
	"which",
	"she",
	"how",
	"their",
	"will",
	"other",
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
	"number",
	"way",
	"could",
	"people",
	"than",
	"first",
	"water",
	"been",
	"call",
	"who",
	"oil",
	"now",
	"find",
	"long",
	"down",
	"day",
	"did",
	"get",
	"come",
	"made",
	"may",
	"part",
	"over",

	// Technology words
	"code",
	"data",
	"file",
	"type",
	"line",
	"byte",
	"view",
	"page",
	"user",
	"form",
	"text",
	"site",
	"link",
	"list",
	"open",
	"case",
	"font",
	"main",
	"save",
	"tool",
	"cell",
	"work",
	"path",
	"menu",
	"copy",
	"book",
	"risk",
	"task",
	"team",
	"help",
	"home",
	"blog",
	"plan",
	"need",
	"game",
	"care",

	// Longer/challenging words
	"keyboard",
	"software",
	"computer",
	"language",
	"internet",
	"document",
	"solution",
	"business",
	"password",
	"favorite",
	"question",
	"position",
	"progress",
	"security",
	"download",
	"personal",
	"decision",
	"research",
	"different",
	"learning",
	"practice",
	"category",
	"analysis",
	"strategy",
	"response",
	"database",
	"function",
	"network",
	"project",
	"control",
	"support",
	"digital",
	"creative",
	"standard",
	"performance",
	"experience",
	"technology",
	"development",
	"application",
];

// Generate a random word list of specified length
const generateWordList = (wordCount = 80) => {
	// Clone and shuffle the array using Fisher-Yates algorithm for better randomization
	const shuffled = [...commonWords];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	// Take needed number of words, or repeat if we need more words than available
	let result: string[] = [];
	while (result.length < wordCount) {
		const remaining = wordCount - result.length;
		const nextBatch = shuffled.slice(
			0,
			Math.min(remaining, shuffled.length)
		);
		result = [...result, ...nextBatch];
	}

	return result;
};

export default function TypingTest() {
	const [currentWordIndex, setCurrentWordIndex] = useState(0);
	const [inputValue, setInputValue] = useState("");
	const [words, setWords] = useState<string[]>([]);
	const [correctWords, setCorrectWords] = useState(0);
	const [incorrectWords, setIncorrectWords] = useState(0);
	const [totalKeystrokes, setTotalKeystrokes] = useState(0);
	const [correctKeystrokes, setCorrectKeystrokes] = useState(0);
	const [errorKeystrokes, setErrorKeystrokes] = useState(0);
	const [totalChars, setTotalChars] = useState(0);
	const startTimeRef = useRef<number | null>(null);
	const [isStarted, setIsStarted] = useState(false);
	const [isFinished, setIsFinished] = useState(false);
	const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timer
	const [wordsPerMinute, setWordsPerMinute] = useState(0);
	const [accuracy, setAccuracy] = useState(100);
	const [netWPM, setNetWPM] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const statsTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [completedWords, setCompletedWords] = useState<
		{ word: string; correct: boolean }[]
	>([]);
	const [currentLine, setCurrentLine] = useState(0);
	const wordsPerLine = 5;
	const linesVisible = 3;

	// Get the current visible words - memoized to avoid recalculation
	const visibleWords = useMemo(() => {
		const startIndex = currentLine * wordsPerLine;
		const endIndex = startIndex + wordsPerLine * linesVisible;
		return words.slice(startIndex, endIndex);
	}, [words, currentLine, wordsPerLine, linesVisible]);

	// Calculate WPM based on standard formula: (characters typed / 5) / time in minutes
	const calculateWPM = useCallback((chars: number, timeInMs: number) => {
		const minutes = timeInMs / 60000; // Convert ms to minutes
		if (minutes < 0.01) return 0; // Avoid division by very small numbers
		return Math.round(chars / 5 / minutes);
	}, []);

	// Clear timers efficiently
	const clearAllTimers = useCallback(() => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		if (statsTimerRef.current) {
			clearInterval(statsTimerRef.current);
			statsTimerRef.current = null;
		}
	}, []);

	// Start a new test
	const startTest = useCallback(() => {
		// Clear any existing timers
		clearAllTimers();

		// Generate a random word list
		const wordList = generateWordList(100);
		setWords(wordList);

		// Reset all state
		setCurrentWordIndex(0);
		setInputValue("");
		setCorrectWords(0);
		setIncorrectWords(0);
		setTotalChars(0);
		setTotalKeystrokes(0);
		setCorrectKeystrokes(0);
		setErrorKeystrokes(0);
		startTimeRef.current = null;
		setIsStarted(false);
		setIsFinished(false);
		setTimeLeft(60);
		setWordsPerMinute(0);
		setNetWPM(0);
		setAccuracy(100);
		setCompletedWords([]);
		setCurrentLine(0);

		// Focus the input field
		setTimeout(() => inputRef.current?.focus(), 100);
	}, [clearAllTimers]);

	// Cleanup on component unmount
	useEffect(() => {
		startTest();
		return clearAllTimers;
	}, [startTest, clearAllTimers]);

	// Update WPM and accuracy stats
	const updateStats = useCallback(() => {
		if (!startTimeRef.current || totalChars === 0) return;

		const elapsedTime = Date.now() - startTimeRef.current;
		const wpm = calculateWPM(totalChars, elapsedTime);
		setWordsPerMinute(wpm); // Remove minimum value enforcement

		// Update accuracy
		const totalStrokes = correctKeystrokes + errorKeystrokes;
		if (totalStrokes > 0) {
			const accuracyValue = Math.round(
				(correctKeystrokes / totalStrokes) * 100
			);
			setAccuracy(accuracyValue); // Remove minimum value enforcement

			// Calculate and update net WPM
			const netWpmValue = Math.round(wpm * (accuracyValue / 100));
			setNetWPM(netWpmValue); // Remove minimum value enforcement
		}
	}, [
		startTimeRef,
		totalChars,
		correctKeystrokes,
		errorKeystrokes,
		calculateWPM,
	]);

	// Setup timer when test starts
	useEffect(() => {
		// Only start the timer when the test begins
		if (isStarted && !isFinished) {
			// If timer is not running, start it
			if (!timerRef.current) {
				// Record the exact start time if not already set
				if (startTimeRef.current === null) {
					startTimeRef.current = Date.now();
				}

				// Start the countdown timer
				timerRef.current = setInterval(() => {
					if (startTimeRef.current) {
						const elapsedSeconds = Math.floor(
							(Date.now() - startTimeRef.current) / 1000
						);
						const remaining = Math.max(0, 60 - elapsedSeconds);

						if (remaining <= 0) {
							// Time's up - make sure we calculate final stats
							setTimeLeft(0);
							finishTest();
						} else {
							setTimeLeft(remaining);
						}
					}
				}, 100); // Update more frequently for smoother countdown

				// Start the stats update timer if not already running
				if (!statsTimerRef.current) {
					statsTimerRef.current = setInterval(updateStats, 200); // Update more frequently for more responsive stats
				}
			}
		}

		return () => {
			// Only clear timers when component unmounts or test finishes
			if (isFinished) {
				clearAllTimers();
			}
		};
	}, [isStarted, isFinished, updateStats, clearAllTimers]);

	// Finish test function (defined before it's used)
	const finishTest = useCallback(() => {
		// Calculate final stats before stopping timers
		if (startTimeRef.current) {
			const elapsedTime = Date.now() - startTimeRef.current;
			const finalWPM = calculateWPM(totalChars, elapsedTime);

			// Ensure we have meaningful stats even with limited typing
			setWordsPerMinute(finalWPM); // Remove minimum value enforcement

			const totalStrokes = correctKeystrokes + errorKeystrokes;
			if (totalStrokes > 0) {
				const accuracyValue = Math.round(
					(correctKeystrokes / totalStrokes) * 100
				);
				setAccuracy(accuracyValue); // Remove minimum value enforcement
				setNetWPM(Math.round(finalWPM * (accuracyValue / 100))); // Remove minimum value enforcement
			} else {
				// Default values if somehow no keystrokes were recorded
				setAccuracy(0);
				setNetWPM(0);
			}
		}

		// Stop all timers
		clearAllTimers();
		setIsFinished(true);
	}, [
		clearAllTimers,
		calculateWPM,
		totalChars,
		correctKeystrokes,
		errorKeystrokes,
	]);

	// Automatically advance to next line when needed
	useEffect(() => {
		const lineIndex = Math.floor(currentWordIndex / wordsPerLine);
		if (lineIndex > currentLine) {
			setCurrentLine(lineIndex);
		}
	}, [currentWordIndex, currentLine, wordsPerLine]);

	// Update stats when relevant values change
	useEffect(() => {
		if (isStarted && !isFinished) {
			updateStats();
		}
	}, [
		totalChars,
		correctKeystrokes,
		errorKeystrokes,
		isStarted,
		isFinished,
		updateStats,
	]);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value;

			// Start the test on first input
			if (!isStarted && newValue.length > 0) {
				setIsStarted(true);
				startTimeRef.current = Date.now(); // Ensure timing starts immediately on first input
			}

			// Track keystrokes and accuracy
			if (newValue.length !== inputValue.length) {
				setTotalKeystrokes((prev) => prev + 1);

				const currentWord = words[currentWordIndex] || "";
				const lastCharIndex = newValue.length - 1;

				if (lastCharIndex >= 0) {
					if (
						lastCharIndex < currentWord.length &&
						newValue[lastCharIndex] === currentWord[lastCharIndex]
					) {
						setCorrectKeystrokes((prev) => prev + 1);
					} else {
						setErrorKeystrokes((prev) => prev + 1);
					}
				}
			}

			setInputValue(newValue);
		},
		[inputValue, isStarted, words, currentWordIndex]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === " " || e.key === "Enter") {
				e.preventDefault();
				const val = inputValue.trim();
				if (!val) return;

				const currentWord = words[currentWordIndex];
				const isCorrect = val === currentWord;

				// Count all characters including space
				setTotalChars((prev) => prev + currentWord.length + 1);

				if (isCorrect) {
					setCorrectWords((prev) => prev + 1);
				} else {
					setIncorrectWords((prev) => prev + 1);
				}

				// Track completed words
				setCompletedWords((prev) => [
					...prev,
					{ word: currentWord, correct: isCorrect },
				]);
				setCurrentWordIndex((prev) => prev + 1);
				setInputValue("");

				// Check if we've reached the end
				if (currentWordIndex >= words.length - 1) {
					finishTest();
				}
			}
		},
		[inputValue, words, currentWordIndex, finishTest]
	);

	const handleFinish = () => {
		if (isStarted && !isFinished) finishTest();
	};

	// Check if current input matches the current word - memoized
	const isCurrentInputCorrect = useMemo(() => {
		const currentWord = words[currentWordIndex];
		if (!currentWord) return true;
		return currentWord.startsWith(inputValue);
	}, [words, currentWordIndex, inputValue]);

	// Render a word with highlighting for current character
	const renderWord = useCallback(
		(word: string, isActive: boolean) => {
			if (!isActive) return word;

			const typedPart = word.substring(0, inputValue.length);
			const remainingPart = word.substring(inputValue.length);
			const isCorrect = word.startsWith(inputValue);

			return (
				<span>
					<span
						className={
							isCorrect ? "text-green-600" : "text-red-600"
						}
					>
						{typedPart}
					</span>
					<span>{remainingPart}</span>
				</span>
			);
		},
		[inputValue]
	);

	// Calculate elapsed time in seconds
	const getElapsedTime = useCallback(() => {
		if (!startTimeRef.current) return 0;
		return Math.min(
			60,
			Math.floor((Date.now() - startTimeRef.current) / 1000)
		);
	}, []);

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Typing Speed Test</span>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Clock className="h-5 w-5" />
							<span className="font-mono">{timeLeft}s</span>
						</div>
						{isStarted && !isFinished && (
							<div className="text-xs px-2 py-1 bg-blue-100 rounded-full text-blue-800">
								{Math.round(wordsPerMinute)} WPM
							</div>
						)}
					</div>
				</CardTitle>
				<CardDescription>
					Type each word and press space to continue. Your WPM and
					accuracy are tracked in real-time.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!isFinished ? (
					<>
						<div className="flex justify-between text-sm mb-2">
							<div>
								<span className="font-semibold">WPM:</span>{" "}
								{isStarted
									? Math.round(wordsPerMinute) || 0
									: 0}
							</div>
							<div>
								<span className="font-semibold">Accuracy:</span>{" "}
								{isStarted ? accuracy || 0 : 0}%
							</div>
							<div>
								<span className="font-semibold">Net WPM:</span>{" "}
								{isStarted ? netWPM || 0 : 0}
							</div>
						</div>
						<div className="p-6 bg-muted rounded-md flex flex-col gap-2 min-h-[200px]">
							{visibleWords.length > 0 ? (
								<div className="flex flex-wrap gap-2 leading-loose">
									{visibleWords.map((word, idx) => {
										const globalIdx =
											currentLine * wordsPerLine + idx;
										const isCompleted =
											globalIdx < currentWordIndex;
										const isActive =
											globalIdx === currentWordIndex;
										const completedWord = isCompleted
											? completedWords[globalIdx]
											: null;

										return (
											<span
												key={`${globalIdx}-${word}`}
												className={`text-lg transition-all ${
													isCompleted
														? completedWord &&
														  completedWord.correct
															? "text-green-600"
															: "text-red-600"
														: isActive
														? "bg-primary/20 px-1 rounded"
														: "text-gray-800"
												}`}
											>
												{isActive
													? renderWord(word, true)
													: word}
											</span>
										);
									})}
								</div>
							) : (
								<div className="flex items-center justify-center h-full">
									<p className="text-muted-foreground">
										Loading words...
									</p>
								</div>
							)}
						</div>
						<input
							ref={inputRef}
							type="text"
							value={inputValue}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							disabled={isFinished}
							placeholder="Type here..."
							className={`w-full p-4 text-lg font-mono border rounded-md ${
								isCurrentInputCorrect
									? inputValue
										? "border-green-500 bg-green-50"
										: "border-gray-300"
									: "border-red-500 bg-red-50"
							}`}
							autoFocus
						/>
						<div className="flex justify-between text-sm text-muted-foreground">
							<div>
								Progress:{" "}
								{words.length > 0
									? Math.round(
											(currentWordIndex / words.length) *
												100
									  )
									: 0}
								%
							</div>
							<div>Correct: {correctWords}</div>
							<div>Incorrect: {incorrectWords}</div>
						</div>
					</>
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<ResultCard
								value={Math.round(wordsPerMinute)}
								label="Words Per Minute"
								icon={
									<Trophy className="h-5 w-5 text-amber-500" />
								}
							/>
							<ResultCard
								value={`${accuracy}%`}
								label="Accuracy"
								icon={<div className="text-lg">🎯</div>}
							/>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<ResultCard
								value={netWPM}
								label="Net WPM"
								icon={<div className="text-lg">⚡</div>}
							/>
							<ResultCard
								value={correctWords}
								label="Correct Words"
								icon={<div className="text-lg">✅</div>}
							/>
							<ResultCard
								value={incorrectWords}
								label="Incorrect Words"
								icon={<div className="text-lg">❌</div>}
							/>
						</div>
						<div className="mt-4 p-4 bg-blue-50 rounded-md">
							<p className="text-sm text-blue-600">
								<strong>Keystrokes:</strong> {correctKeystrokes}{" "}
								correct, {errorKeystrokes} errors
								<br />
								<strong>Characters Typed:</strong> {totalChars}
								<br />
								<strong>Time Elapsed:</strong>{" "}
								{getElapsedTime()} seconds
							</p>
						</div>
					</div>
				)}
			</CardContent>
			<CardFooter className="flex justify-between">
				<Button variant="outline" onClick={startTest}>
					<RefreshCw className="mr-2 h-4 w-4" />
					New Test
				</Button>
				{!isFinished && isStarted && (
					<Button onClick={handleFinish}>
						<Trophy className="mr-2 h-4 w-4" />
						Finish
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

// Memoized result card component to prevent unnecessary re-renders
import { memo } from "react";

const ResultCard = memo(
	({
		value,
		label,
		icon,
	}: {
		value: number | string;
		label: string;
		icon?: React.ReactNode;
	}) => {
		return (
			<div className="bg-muted p-4 rounded-md text-center">
				<div className="flex items-center justify-center gap-2 mb-1">
					{icon && <div>{icon}</div>}
					<div className="text-3xl font-bold">{value}</div>
				</div>
				<div className="text-sm text-muted-foreground">{label}</div>
			</div>
		);
	}
);

ResultCard.displayName = "ResultCard";
