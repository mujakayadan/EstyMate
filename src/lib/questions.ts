export type Question = {
  id: string;
  category: string;
  prompt: string;
  answer: number;
  unit: string;
};

export const QUESTION_BANK: Question[] = [
  {
    id: "q1",
    category: "Food",
    prompt: "About how many calories are in a classic McDonald's Big Mac?",
    answer: 590,
    unit: "kcal",
  },
  {
    id: "q2",
    category: "Games",
    prompt: "How many spaces are on a standard Monopoly board?",
    answer: 40,
    unit: "spaces",
  },
  {
    id: "q3",
    category: "Science",
    prompt: "About how many minutes does sunlight take to reach Earth?",
    answer: 8,
    unit: "minutes",
  },
  {
    id: "q4",
    category: "Geography",
    prompt: "About how many kilometers long is the Great Wall of China?",
    answer: 21196,
    unit: "km",
  },
  {
    id: "q5",
    category: "Music",
    prompt: "About how many keys are on a full-size piano?",
    answer: 88,
    unit: "keys",
  },
  {
    id: "q6",
    category: "Sports",
    prompt: "How many dimples are typically on a standard golf ball?",
    answer: 336,
    unit: "dimples",
  },
  {
    id: "q7",
    category: "History",
    prompt: "In what year did the Apollo 11 moon landing take place?",
    answer: 1969,
    unit: "",
  },
  {
    id: "q8",
    category: "Nature",
    prompt: "About how many bones are in an adult human body?",
    answer: 206,
    unit: "bones",
  },
  {
    id: "q9",
    category: "Tech",
    prompt: "About how many bits are in a kilobyte (traditional binary)?",
    answer: 8192,
    unit: "bits",
  },
  {
    id: "q10",
    category: "Food",
    prompt: "About how many milligrams of caffeine are in a typical espresso shot?",
    answer: 63,
    unit: "mg",
  },
  {
    id: "q11",
    category: "Space",
    prompt: "About how many Earth days does it take Mars to orbit the Sun?",
    answer: 687,
    unit: "days",
  },
  {
    id: "q12",
    category: "Geography",
    prompt: "About how many countries are in Africa?",
    answer: 54,
    unit: "countries",
  },
  {
    id: "q13",
    category: "Animals",
    prompt: "About how many heartbeats does a blue whale have per minute at rest?",
    answer: 10,
    unit: "bpm",
  },
  {
    id: "q14",
    category: "Math",
    prompt: "What is the approximate value of pi × 100, as an integer?",
    answer: 314,
    unit: "",
  },
  {
    id: "q15",
    category: "Movies",
    prompt: "About how many minutes long is the original Star Wars (1977) runtime?",
    answer: 121,
    unit: "minutes",
  },
  {
    id: "q16",
    category: "Food",
    prompt: "About how many kernels are on an average ear of corn?",
    answer: 800,
    unit: "kernels",
  },
  {
    id: "q17",
    category: "Travel",
    prompt: "About how many kilometers separate London and Paris by great-circle distance?",
    answer: 344,
    unit: "km",
  },
  {
    id: "q18",
    category: "Science",
    prompt: "About how many chemical elements are on the periodic table?",
    answer: 118,
    unit: "elements",
  },
  {
    id: "q19",
    category: "Sports",
    prompt: "How many players are on the field for one American football team at a time?",
    answer: 11,
    unit: "players",
  },
  {
    id: "q20",
    category: "Nature",
    prompt: "About how many teeth does an adult human typically have?",
    answer: 32,
    unit: "teeth",
  },
  {
    id: "q21",
    category: "Geography",
    prompt: "About how many islands make up the Philippines?",
    answer: 7641,
    unit: "islands",
  },
  {
    id: "q22",
    category: "Tech",
    prompt: "In what year was the first iPhone released?",
    answer: 2007,
    unit: "",
  },
  {
    id: "q23",
    category: "Food",
    prompt: "About how many milliliters are in a standard US cup?",
    answer: 240,
    unit: "ml",
  },
  {
    id: "q24",
    category: "History",
    prompt: "In what year did World War II end in Europe (VE Day year)?",
    answer: 1945,
    unit: "",
  },
  {
    id: "q25",
    category: "Animals",
    prompt: "About how many years can a giant tortoise live?",
    answer: 150,
    unit: "years",
  },
  {
    id: "q26",
    category: "Music",
    prompt: "How many strings does a standard violin have?",
    answer: 4,
    unit: "strings",
  },
  {
    id: "q27",
    category: "Space",
    prompt: "About how many kilometers is the average Earth–Moon distance?",
    answer: 384400,
    unit: "km",
  },
  {
    id: "q28",
    category: "Sports",
    prompt: "How many squares are on a standard chessboard?",
    answer: 64,
    unit: "squares",
  },
  {
    id: "q29",
    category: "Geography",
    prompt: "About how many meters tall is Mount Everest?",
    answer: 8849,
    unit: "m",
  },
  {
    id: "q30",
    category: "Science",
    prompt: "About how many degrees Celsius is absolute zero, as a negative integer?",
    answer: 273,
    unit: "°C below 0",
  },
];

export const ROUNDS_PER_MATCH = 8;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
