export interface Word {
    id: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
    example: string;
    examplePinyin: string;
    exampleMeaning: string;
    category: string;
    lessonId: string;
}
export interface QuizQuestion {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
}
export interface DialogueLine {
    speaker: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
}
export interface Lesson {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    level: 'A1' | 'A2';
    duration: number;
    icon: string;
    color: string;
    words: Word[];
    grammar: {
        title: string;
        pattern: string;
        explanation: string;
        example: string;
        meaning: string;
    }[];
    dialogue: DialogueLine[];
    quiz: QuizQuestion[];
}
export interface ScenarioChoice {
    text: string;
    pinyin: string;
    meaning: string;
    next: string;
    feedback: string;
    correct: boolean;
}
export interface ScenarioNode {
    id: string;
    speaker: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
    choices: ScenarioChoice[];
    end?: boolean;
}
export interface Scenario {
    id: string;
    title: string;
    description: string;
    icon: string;
    level: string;
    start: string;
    nodes: Record<string, ScenarioNode>;
}
