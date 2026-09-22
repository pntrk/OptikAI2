export interface Subject {
  id: number;
  name: string;
  count: number;
  section: number;
}

export interface Student {
  no: string;
  name: string;
  classStr: string;
  sectionStr: string;
  booklet?: string;
}

export interface ExamResult {
  id: number | string;
  name: string;
  no: string;
  classStr: string;
  sectionStr: string;
  booklet: string;
  answers: string[];
  scores?: EvaluatedScore;
}

export interface ExamKeys {
  [booklet: string]: string[];
}

export interface Exam {
  id: number;
  name: string;
  institution: string;
  date: string;
  logo: string | null;
  studentList: Student[];
  layoutType: 'split' | 'standard';
  format?: string;
  subjects: Subject[];
  optionsCount: number;
  penalty: number;
  keys: ExamKeys;
  results: ExamResult[];
}

export interface SubjectScore {
  correct: number;
  wrong: number;
  empty: number;
  net: number;
}

export interface EvaluatedScore {
  total: {
    correct: number;
    wrong: number;
    empty: number;
    net: number;
    lgsScore: number;
    percentile: number;
    tytScore?: number;
    aytScore?: number;
    examType?: 'lgs' | 'tyt' | 'ayt' | 'standard';
  };
  subjectScores: {
    [subjectId: number]: SubjectScore;
  };
}

export interface LayoutItem {
  type: 'header' | 'question';
  text?: string;
  cIdx: number;
  y: number;
  h: number;
  qIdx?: number;
  localIdx?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Anchors {
  tl: Point;
  tr: Point;
  bl: Point;
  br: Point;
}

export interface LaserMark {
  x: number;
  y: number;
  type: 'info' | 'question';
}

export interface DialogState {
  type: 'alert' | 'confirm';
  msg: string;
  onConfirm?: () => void;
}

declare global {
  interface Window {
    QRious?: any;
    jsQR?: any;
    pdfjsLib?: any;
  }
}
