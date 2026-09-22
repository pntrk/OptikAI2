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
    qNumOffset: 0.8,
    qNumWidth: 6.6,
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
  const hasFourSections = exam && exam.subjects && exam.subjects.some(s => s.section === 3 || s.section === 4);
  const isSplit = exam.layoutType === 'split';
  const topPadding = (isSplit || hasFourSections) ? 8 : 2;

  const maxAllowedY = 283;
  const availableHeight = maxAllowedY - omr.qBox.y - topPadding;

  if (!exam || !exam.subjects || exam.subjects.length === 0) {
    return { items: [], rowH: 4.8, finalQBoxH: 10, isSplit, hasFourSections, topPadding };
  }

  const cols: Subject[][] = [[], [], [], []];
  const colUnits = [0, 0, 0, 0];

  if (hasFourSections) {
    // 4 Test Alanı (TYT / AYT veya 4 Ayrı Bölümlü Sınavlar)
    // Her bölüm doğrudan kendi sütununa (0, 1, 2, 3) yerleşir
    [1, 2, 3, 4].forEach((secNum, cIdx) => {
      const subsInSec = exam.subjects.filter(s => (s.section || 1) === secNum);
      subsInSec.forEach(sub => {
        cols[cIdx].push(sub);
        colUnits[cIdx] += sub.count + 2.5;
      });
    });
  } else if (isSplit) {
    let sec1Subs = exam.subjects.filter(s => s.section !== 2);
    let sec2Subs = exam.subjects.filter(s => s.section === 2);

    if (sec2Subs.length === 0 && sec1Subs.length >= 2) {
      const half = Math.ceil(sec1Subs.length / 2);
      sec2Subs = sec1Subs.slice(half);
      sec1Subs = sec1Subs.slice(0, half);
    }

    const assignOrdered = (subs: Subject[], colA: number, colB: number) => {
      const total = subs.reduce((acc, s) => acc + s.count + 3, 0);
      const halfTotal = total / 2;
      subs.forEach(sub => {
        if (cols[colA].length > 0 && (colUnits[colA] + (sub.count + 3) / 2 > halfTotal)) {
          cols[colB].push(sub);
          colUnits[colB] += sub.count + 3;
        } else {
          cols[colA].push(sub);
          colUnits[colA] += sub.count + 3;
        }
      });
    };

    assignOrdered(sec1Subs, 0, 1);
    assignOrdered(sec2Subs, 2, 3);
  } else {
    const total = exam.subjects.reduce((acc, s) => acc + s.count + 3, 0);
    const targetPerCol = Math.max(15, Math.ceil(total / 4));
    let curCol = 0;
    exam.subjects.forEach(sub => {
      if (curCol < 3 && cols[curCol].length > 0 && colUnits[curCol] + sub.count + 3 > targetPerCol + 3) {
        curCol++;
      }
      cols[curCol].push(sub);
      colUnits[curCol] += sub.count + 3;
    });
  }

  const maxColUnits = Math.max(...colUnits) || 1;
  const baseRowH = Math.max(3.4, Math.min(5.6, availableHeight / maxColUnits));
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
  return { items, rowH, finalQBoxH: Math.max(finalQBoxH, 10), isSplit, hasFourSections, topPadding };
}

// LGS 2026 Sınav Verilerine Göre Frekans & Yüzdelik Dilim Dağılım Tablosu (MEB Projeksiyonu)
export const LGS_2026_PERCENTILE_TABLE = [
  { score: 500.00, percentile: 0.01 },
  { score: 495.00, percentile: 0.08 },
  { score: 490.00, percentile: 0.22 },
  { score: 485.00, percentile: 0.55 },
  { score: 480.00, percentile: 0.98 },
  { score: 475.00, percentile: 1.55 },
  { score: 470.00, percentile: 2.25 },
  { score: 465.00, percentile: 3.10 },
  { score: 460.00, percentile: 4.10 },
  { score: 455.00, percentile: 5.20 },
  { score: 450.00, percentile: 6.45 },
  { score: 440.00, percentile: 9.20 },
  { score: 430.00, percentile: 12.30 },
  { score: 420.00, percentile: 15.90 },
  { score: 410.00, percentile: 19.80 },
  { score: 400.00, percentile: 24.10 },
  { score: 380.00, percentile: 33.60 },
  { score: 360.00, percentile: 43.90 },
  { score: 340.00, percentile: 54.60 },
  { score: 320.00, percentile: 65.20 },
  { score: 300.00, percentile: 74.80 },
  { score: 250.00, percentile: 88.60 },
  { score: 200.00, percentile: 96.60 },
  { score: 100.00, percentile: 99.99 }
];

export function isTytExam(exam: { format?: string; name?: string; subjects?: Subject[]; optionsCount?: number } | undefined | null): boolean {
  if (!exam) return false;
  if (exam.format === 'tyt') return true;
  const name = (exam.name || '').toLowerCase();
  if (name.includes('tyt') || name.includes('temel yeterlilik')) return true;
  if (exam.subjects && exam.subjects.some(s => s.name.toLowerCase().includes('temel mat'))) return true;
  const totalQ = exam.subjects ? exam.subjects.reduce((sum, s) => sum + s.count, 0) : 0;
  if (totalQ === 120 && exam.optionsCount === 5) return true;
  return false;
}

export function isAytExam(exam: { format?: string; name?: string; subjects?: Subject[]; optionsCount?: number } | undefined | null): boolean {
  if (!exam) return false;
  if (exam.format === 'ayt') return true;
  const name = (exam.name || '').toLowerCase();
  if (name.includes('ayt') || name.includes('alan yeterlilik')) return true;
  if (exam.subjects && exam.subjects.some(s => {
    const sn = s.name.toLowerCase();
    return sn.includes('edebiyat') || sn.includes('sosyal-2') || sn.includes('sosyal 2');
  })) return true;
  const totalQ = exam.subjects ? exam.subjects.reduce((sum, s) => sum + s.count, 0) : 0;
  if (totalQ === 160 && exam.optionsCount === 5) return true;
  return false;
}

export function isLgsExam(exam: { format?: string; name?: string; subjects?: Subject[]; optionsCount?: number } | undefined | null): boolean {
  if (!exam) return false;
  if (isTytExam(exam) || isAytExam(exam)) return false;
  const name = (exam.name || '').toLowerCase();
  if (name.includes('lgs')) return true;
  if (exam.subjects && exam.subjects.length === 6 && exam.subjects.some(s => s.name.toLowerCase().includes('inkılap'))) return true;
  const totalQ = exam.subjects ? exam.subjects.reduce((sum, s) => sum + s.count, 0) : 0;
  if (totalQ === 90 && exam.optionsCount === 4) return true;
  if (exam.format === 'mebi' && (name.includes('mebi') || name.includes('ortaokul') || name.includes('8.'))) return true;
  if (exam.subjects && exam.subjects.length >= 4) {
    const hasTurkce = exam.subjects.some(s => s.name.toLowerCase().includes('türk'));
    const hasMat = exam.subjects.some(s => s.name.toLowerCase().includes('mat'));
    const hasFen = exam.subjects.some(s => s.name.toLowerCase().includes('fen'));
    if (hasTurkce && (hasMat || hasFen) && exam.optionsCount === 4) return true;
  }
  return false;
}

export function calculateLgsPercentile(score: number): number {
  if (score >= 500) return 0.01;
  if (score <= 100) return 99.99;

  for (let i = 0; i < LGS_2026_PERCENTILE_TABLE.length - 1; i++) {
    const upper = LGS_2026_PERCENTILE_TABLE[i];
    const lower = LGS_2026_PERCENTILE_TABLE[i + 1];
    if (score <= upper.score && score >= lower.score) {
      const scoreSpan = upper.score - lower.score;
      const percentileSpan = lower.percentile - upper.percentile;
      const diff = upper.score - score;
      const p = upper.percentile + (diff / scoreSpan) * percentileSpan;
      return Math.max(0.01, Math.min(99.99, parseFloat(p.toFixed(2))));
    }
  }
  return 99.99;
}

export function calculateScore(
  studentAnswers: string[],
  key: string[],
  penalty: number,
  subjects: Subject[],
  format?: string,
  examName?: string
): EvaluatedScore {
  const total = { correct: 0, wrong: 0, empty: 0, net: 0, lgsScore: 0, percentile: 100.0, tytScore: 0, aytScore: 0, examType: 'standard' as 'lgs' | 'tyt' | 'ayt' | 'standard' };
  const subjectScores: { [key: number]: { correct: number; wrong: number; empty: number; net: number } } = {};
  let qIndex = 0;

  const mockExam = { format, name: examName, subjects };
  const isTyt = isTytExam(mockExam);
  const isAyt = isAytExam(mockExam);
  const isLgs = isLgsExam(mockExam);

  let lgsTotal = 194.76;
  let totalNetPointsContribution = 0;
  let allZeroNet = true;

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

    if (netVal > 0) {
      allZeroNet = false;
    }

    const nameLower = sub.name.toLocaleLowerCase('tr-TR');

    if (isTyt) {
      // TYT 2026 Standart Katsayı Projeksiyonu:
      // Taban: 100.00 Puan
      // Türkçe (40 Soru): 3.30 Puan/Net
      // Temel Matematik (40 Soru): 3.30 Puan/Net
      // Sosyal Bilimler (20 Soru): 3.40 Puan/Net
      // Fen Bilimleri (20 Soru): 3.40 Puan/Net
      let coeff = 3.30;
      if (nameLower.includes("türk")) coeff = 3.30;
      else if (nameLower.includes("mat")) coeff = 3.30;
      else if (nameLower.includes("sosyal") || nameLower.includes("tarih") || nameLower.includes("coğraf") || nameLower.includes("felsefe") || nameLower.includes("din")) coeff = 3.40;
      else if (nameLower.includes("fen") || nameLower.includes("fizik") || nameLower.includes("kimya") || nameLower.includes("biyoloji")) coeff = 3.40;
      totalNetPointsContribution += (netVal * coeff);
    } else if (isAyt) {
      // AYT Genel Puan Projeksiyonu: 100 Taban + (Netler * 2.50)
      totalNetPointsContribution += (netVal * 2.50);
    } else if (isLgs) {
      // LGS 2026 Resmi Katsayı Değerleri
      let coeff = 1.60;
      if (nameLower.includes("türk")) coeff = 4.326;
      else if (nameLower.includes("mat")) coeff = 5.048;
      else if (nameLower.includes("fen")) coeff = 4.116;
      else if (nameLower.includes("ink") || nameLower.includes("sosyal") || nameLower.includes("tarih")) coeff = 1.674;
      else if (nameLower.includes("din") || nameLower.includes("ahlak")) coeff = 1.652;
      else if (nameLower.includes("ing") || nameLower.includes("yabancı") || nameLower.includes("dil")) coeff = 1.568;
      else coeff = sub.count >= 20 ? 4.20 : 1.65;

      totalNetPointsContribution += (netVal * coeff);
    }
  });

  if (isTyt) {
    total.examType = 'tyt';
    if (total.net <= 0 && allZeroNet) {
      total.tytScore = 100.00;
    } else {
      const calc = 100.0 + totalNetPointsContribution;
      total.tytScore = Math.max(100.0, Math.min(500.0, Math.round(calc * 1000) / 1000));
    }
    total.lgsScore = total.tytScore;
    total.percentile = 0;
  } else if (isAyt) {
    total.examType = 'ayt';
    if (total.net <= 0 && allZeroNet) {
      total.aytScore = 100.00;
    } else {
      const calc = 100.0 + totalNetPointsContribution;
      total.aytScore = Math.max(100.0, Math.min(500.0, Math.round(calc * 1000) / 1000));
    }
    total.lgsScore = total.aytScore;
    total.percentile = 0;
  } else if (isLgs) {
    total.examType = 'lgs';
    if (total.net <= 0 && allZeroNet) {
      total.lgsScore = 100.00;
      total.percentile = 99.99;
    } else {
      const calculatedScore = lgsTotal + totalNetPointsContribution;
      total.lgsScore = Math.max(100.0, Math.min(500.0, Math.round(calculatedScore * 1000) / 1000));
      total.percentile = calculateLgsPercentile(total.lgsScore);
    }
  }

  return { total, subjectScores };
}

export function exportToCSV(exam: Exam, specificResults: ExamResult[] | null = null) {
  const isLgs = isLgsExam(exam);
  const isTyt = isTytExam(exam);
  const isAyt = isAytExam(exam);
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "Ogrenci No;Ad Soyad;Sinif;Sube;Kitapcik;";
  exam.subjects.forEach(sub => { csvContent += `${sub.name} D;${sub.name} Y;${sub.name} N;`; });
  csvContent += "TOPLAM D;TOPLAM Y;TOPLAM B;TOPLAM NET;";
  if (isTyt) csvContent += "TYT PUANI;";
  else if (isAyt) csvContent += "AYT PUANI;";
  else if (isLgs) csvContent += "LGS PUANI;DİLİM;";
  else csvContent += "PUAN;";
  csvContent += "\n";

  const resultsToExport = specificResults || exam.results;

  resultsToExport.forEach(res => {
    const key = exam.keys[res.booklet] || exam.keys["A"];
    const score = calculateScore(res.answers, key, exam.penalty, exam.subjects, exam.format, exam.name);

    let row = `${res.no};${res.name};${res.classStr || ""};${res.sectionStr || ""};${res.booklet};`;
    exam.subjects.forEach(sub => {
      const ss = score.subjectScores[sub.id];
      row += `${ss.correct};${ss.wrong};${ss.net.toFixed(2).replace('.', ',')};`;
    });
    row += `${score.total.correct};${score.total.wrong};${score.total.empty};${score.total.net.toFixed(2).replace('.', ',')};`;
    if (isTyt) {
      row += `${(score.total.tytScore || score.total.lgsScore).toFixed(2).replace('.', ',')};`;
    } else if (isAyt) {
      row += `${(score.total.aytScore || score.total.lgsScore).toFixed(2).replace('.', ',')};`;
    } else if (isLgs) {
      row += `${score.total.lgsScore.toFixed(2).replace('.', ',')};`;
      row += `%${score.total.percentile.toFixed(2).replace('.', ',')};`;
    } else {
      row += `${score.total.lgsScore.toFixed(2).replace('.', ',')};`;
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

  // If section is provided separately, clean up both
  if (sec) {
    const secMatch = sec.match(/([A-ZÇĞİÖŞÜ])/i);
    if (secMatch) sec = secMatch[1].toUpperCase();
    const clsMatch = cls.match(/(\d+)/);
    if (clsMatch) cls = clsMatch[1];
    return { cls, sec };
  }

  // Combined formats: "7A", "7/A", "7-A", "7 A", "7. SINIF A", "7. SINIF / A ŞUBESİ", "8B"
  const matchCombined = cls.match(/(\d+)\s*(?:\.|\/|-|\s|SINIF|\.SINIF)*\s*([A-ZÇĞİÖŞÜ])(?:\s*(?:ŞUBE|ŞUBESİ|SUBE|SUBESI))?/i);
  if (matchCombined) {
    cls = matchCombined[1];
    sec = matchCombined[2].toUpperCase();
    return { cls, sec };
  }

  // Only digits (class only)
  const onlyDigits = cls.match(/^(\d+)$/);
  if (onlyDigits) {
    return { cls: onlyDigits[1], sec: "" };
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
