import { Exam, ExamResult, EvaluatedScore, LayoutItem, Point, Subject } from './types';

export const OPTS_4 = ["A", "B", "C", "D"];
export const OPTS_5 = ["A", "B", "C", "D", "E"];

export const alphabet = [
  "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H",
  "I", "İ", "J", "K", "L", "M", "N", "O", "Ö", "P",
  "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z"
];
export const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
export const classes = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
export const sections = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export const DEFAULT_OMR = {
  anchorMargin: 5,
  paperW: 210,
  paperH: 297,

  header: { x: 10, y: 15, w: 190, h: 9 },
  infoBox: { x: 10, y: 27, w: 190, h: 118 },
  qBox: { x: 10, y: 147, w: 190 },

  info: {
    colW: 5.0,
    rowH: 3.65,
    labelY: 29,
    inputY: 32,
    startY: 38,
    fields: [
      { id: 'name', label: 'ADI SOYADI', cols: 20, items: alphabet, startX: 14 },
      { id: 'no', label: 'ÖĞR. NO', cols: 5, items: numbers, startX: 119 },
      { id: 'cls', label: 'SINIF', cols: 1, items: classes, startX: 151 },
      { id: 'sec', label: 'ŞUBE', cols: 1, items: sections, startX: 165 },
      { id: 'bk', label: 'TÜR', cols: 1, items: ["A", "B", "C", "D"], startX: 179 }
    ],
    lines: [116, 146, 160, 174, 188]
  },

  questions: {
    colW: 47.5,
    bubbleGap: 7.2,
    startXOffset: 9.5,
    rowHeightMod: 1.0
  }
};

export const initialExam: Exam = {
  id: 1,
  name: "LGS GENEL DENEME SINAVI - 1",
  institution: "EĞİTİM KURUMU",
  date: new Date().toLocaleDateString('tr-TR'),
  logo: null,
  studentList: [],
  layoutType: 'split',
  format: 'mebi',
  subjects: [
    { id: 1, name: "Türkçe", count: 20, section: 1 },
    { id: 2, name: "T.C. İnkılap", count: 10, section: 1 },
    { id: 3, name: "Din Kültürü", count: 10, section: 1 },
    { id: 4, name: "İngilizce", count: 10, section: 1 },
    { id: 5, name: "Matematik", count: 20, section: 2 },
    { id: 6, name: "Fen Bilimleri", count: 20, section: 2 }
  ],
  optionsCount: 4,
  penalty: 3,
  keys: { A: Array(90).fill(""), B: Array(90).fill(""), C: [], D: [] },
  results: []
};

export function getTotalQuestions(subjects: Subject[]): number {
  if (!subjects || !Array.isArray(subjects)) return 0;
  return subjects.reduce((sum, s) => sum + s.count, 0);
}

export function getQuestionsLayout(exam: Exam, omr = DEFAULT_OMR) {
  const items: LayoutItem[] = [];
  const isSplit = exam.layoutType === 'split';
  const topPadding = isSplit ? 8 : 2;

  const maxAllowedY = 283;
  const availableHeight = maxAllowedY - omr.qBox.y - topPadding;

  if (!exam || !exam.subjects || exam.subjects.length === 0) {
    return { items: [], rowH: 4.8, finalQBoxH: 10, isSplit, topPadding };
  }

  const cols: Subject[][] = [[], [], [], []];
  const colUnits = [0, 0, 0, 0];

  if (isSplit) {
    const sec1Subs = exam.subjects.filter(s => s.section !== 2);
    const sec2Subs = exam.subjects.filter(s => s.section === 2);

    sec1Subs.forEach(sub => {
      const targetCol = (colUnits[0] <= colUnits[1]) ? 0 : 1;
      cols[targetCol].push(sub);
      colUnits[targetCol] += sub.count + 3;
    });

    sec2Subs.forEach(sub => {
      const targetCol = (colUnits[2] <= colUnits[3]) ? 2 : 3;
      cols[targetCol].push(sub);
      colUnits[targetCol] += sub.count + 3;
    });
  } else {
    const largeSubs = exam.subjects.filter(s => s.count > 10);
    const smallSubs = exam.subjects.filter(s => s.count <= 10);

    largeSubs.forEach((sub, i) => {
      cols[i % 4].push(sub);
      colUnits[i % 4] += sub.count + 3;
    });

    smallSubs.forEach((sub, i) => {
      cols[i % 4].push(sub);
      colUnits[i % 4] += sub.count + 3;
    });
  }

  const maxColUnits = Math.max(...colUnits) || 1;
  const baseRowH = Math.min(5.6, availableHeight / maxColUnits);
  const rowH = baseRowH * (omr.questions.rowHeightMod || 1.0);

  const subStartQ: { [id: number]: number } = {};
  let currentGlobal = 0;
  exam.subjects.forEach(sub => {
    subStartQ[sub.id] = currentGlobal;
    currentGlobal += sub.count;
  });

  const colMaxY = [
    omr.qBox.y + topPadding,
    omr.qBox.y + topPadding,
    omr.qBox.y + topPadding,
    omr.qBox.y + topPadding
  ];

  cols.forEach((subArr, currentCIdx) => {
    let currentY = omr.qBox.y + topPadding;

    subArr.forEach(sub => {
      items.push({
        type: 'header',
        text: sub.name,
        cIdx: currentCIdx,
        y: currentY + (0.75 * rowH),
        h: 1.5 * rowH
      });
      currentY += 2 * rowH;

      let gQ = subStartQ[sub.id];
      for (let i = 0; i < sub.count; i++) {
        items.push({
          type: 'question',
          qIdx: gQ++,
          localIdx: i,
          cIdx: currentCIdx,
          y: currentY + (rowH / 2),
          h: rowH
        });
        currentY += rowH;
      }
      currentY += rowH;
    });
    colMaxY[currentCIdx] = currentY;
  });

  const finalQBoxH = Math.max(...colMaxY) - omr.qBox.y;
  return { items, rowH, finalQBoxH: Math.max(finalQBoxH, 10), isSplit, topPadding };
}

export function calculateScore(
  studentAnswers: string[],
  key: string[],
  penalty: number,
  subjects: Subject[],
  format?: string
): EvaluatedScore {
  const total = { correct: 0, wrong: 0, empty: 0, net: 0, lgsScore: 0, percentile: 100.0 };
  const subjectScores: { [key: number]: { correct: number; wrong: number; empty: number; net: number } } = {};
  let qIndex = 0;

  let lgsTotal = 194.76;

  subjects.forEach(sub => {
    const subScore = { correct: 0, wrong: 0, empty: 0, net: 0 };
    for (let i = 0; i < sub.count; i++) {
      const ans = studentAnswers[qIndex];
      const k = key ? key[qIndex] : undefined;
      if (k === "*" || k === "X") {
        // İptal edilen soru (MEB/ÖSYM standardı: herkese doğru kabul edilir)
        subScore.correct++;
      } else if (!ans || ans === "") {
        subScore.empty++;
      } else if (ans === k) {
        subScore.correct++;
      } else {
        subScore.wrong++;
      }
      qIndex++;
    }
    const netVal = subScore.correct - (penalty > 0 ? (subScore.wrong / penalty) : 0);
    subScore.net = netVal;
    subjectScores[sub.id] = subScore;

    total.correct += subScore.correct;
    total.wrong += subScore.wrong;
    total.empty += subScore.empty;
    total.net += subScore.net;

    if (format === 'mebi') {
      const nameLower = sub.name.toLocaleLowerCase('tr-TR');

      if (nameLower.includes("türk")) lgsTotal += (netVal * 4.30);
      else if (nameLower.includes("mat")) lgsTotal += (netVal * 4.95);
      else if (nameLower.includes("fen")) lgsTotal += (netVal * 4.05);
      else if (nameLower.includes("ink") || nameLower.includes("sosyal") || nameLower.includes("tarih")) lgsTotal += (netVal * 1.68);
      else if (nameLower.includes("din") || nameLower.includes("ahlak")) lgsTotal += (netVal * 1.68);
      else if (nameLower.includes("ing") || nameLower.includes("yabancı") || nameLower.includes("dil")) lgsTotal += (netVal * 1.55);
      else lgsTotal += (netVal * 1.50);
    }
  });

  total.lgsScore = Math.max(100, Math.min(500, lgsTotal));

  if (format === 'mebi') {
    const distribution = [
      { s: 500, p: 0.01 }, { s: 490, p: 0.15 }, { s: 480, p: 0.50 },
      { s: 470, p: 1.00 }, { s: 460, p: 1.80 }, { s: 450, p: 3.00 },
      { s: 440, p: 4.50 }, { s: 430, p: 6.00 }, { s: 420, p: 7.50 },
      { s: 410, p: 9.00 }, { s: 400, p: 10.75 }, { s: 390, p: 12.75 },
      { s: 380, p: 15.00 }, { s: 370, p: 17.50 }, { s: 360, p: 20.00 },
      { s: 350, p: 23.00 }, { s: 300, p: 40.00 }, { s: 250, p: 65.00 },
      { s: 200, p: 85.00 }, { s: 100, p: 100.00 }
    ];

    if (total.lgsScore >= 500) {
      total.percentile = 0.01;
    } else {
      for (let i = 0; i < distribution.length - 1; i++) {
        if (total.lgsScore <= distribution[i].s && total.lgsScore > distribution[i + 1].s) {
          const sDiff = distribution[i].s - distribution[i + 1].s;
          const pDiff = distribution[i + 1].p - distribution[i].p;
          const scoreOffset = distribution[i].s - total.lgsScore;
          total.percentile = distribution[i].p + (scoreOffset / sDiff) * pDiff;
          break;
        }
      }
    }
  }

  return { total, subjectScores };
}

export function exportToCSV(exam: Exam, specificResults: ExamResult[] | null = null) {
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "Ogrenci No;Ad Soyad;Sinif;Sube;Kitapcik;";
  exam.subjects.forEach(sub => { csvContent += `${sub.name} D;${sub.name} Y;${sub.name} N;`; });
  csvContent += "TOPLAM D;TOPLAM Y;TOPLAM B;TOPLAM NET;";
  if (exam.format === 'mebi') csvContent += "LGS PUANI;YÜZDELİK DİLİM;";
  csvContent += "\n";

  const resultsToExport = specificResults || exam.results;

  resultsToExport.forEach(res => {
    const key = exam.keys[res.booklet] || exam.keys["A"];
    const score = calculateScore(res.answers, key, exam.penalty, exam.subjects, exam.format);

    let row = `${res.no};${res.name};${res.classStr || ""};${res.sectionStr || ""};${res.booklet};`;
    exam.subjects.forEach(sub => {
      const ss = score.subjectScores[sub.id];
      row += `${ss.correct};${ss.wrong};${ss.net.toFixed(2).replace('.', ',')};`;
    });
    row += `${score.total.correct};${score.total.wrong};${score.total.empty};${score.total.net.toFixed(2).replace('.', ',')};`;
    if (exam.format === 'mebi') {
      row += `${score.total.lgsScore.toFixed(2).replace('.', ',')};`;
      row += `%${score.total.percentile.toFixed(2).replace('.', ',')};`;
    }
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${exam.name}_Sonuclar.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getHomography(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const x = src[i].x, y = src[i].y;
    const u = dst[i].x, v = dst[i].y;
    A.push([-x, -y, -1, 0, 0, 0, x * u, y * u, -u]);
    A.push([0, 0, 0, -x, -y, -1, x * v, y * v, -v]);
  }
  for (let i = 0; i < 8; i++) {
    let maxRow = i;
    for (let j = i + 1; j < 8; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) maxRow = j;
    }
    const temp = A[i]; A[i] = A[maxRow]; A[maxRow] = temp;
    for (let j = i + 1; j < 8; j++) {
      const c = A[j][i] / A[i][i];
      for (let k = i; k < 9; k++) A[j][k] -= A[i][k] * c;
    }
  }
  const h: number[] = new Array(8);
  for (let i = 7; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < 8; j++) sum += A[i][j] * h[j];
    h[i] = (A[i][8] - sum) / A[i][i];
  }
  return h;
}

export function applyHomography(x: number, y: number, h: number[]): Point {
  const den = h[6] * x + h[7] * y + 1;
  return {
    x: (h[0] * x + h[1] * y + h[2]) / den,
    y: (h[3] * x + h[4] * y + h[5]) / den
  };
}

export function formatClassSec(cStr?: string, sStr?: string): { cls: string; sec: string } {
  let cls = (cStr || "").toString().replace(/^"|"$/g, '').trim().toUpperCase();
  let sec = (sStr || "").toString().replace(/^"|"$/g, '').trim().toUpperCase();

  const match = cls.match(/^(\d+)[^A-Z0-9]*([A-ZÇĞİÖŞÜ])$/i);
  if (match && !sec) {
    cls = match[1];
    sec = match[2].toUpperCase();
  }
  return { cls, sec };
}

export function handleDownloadTemplate() {
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "NUMARASI;ADI;SOYADI;SINIFI;SUBESI\n";
  csvContent += "1453;ELİF;SEÇME;8;C\n";

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "Ogrenci_Sablonu.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
