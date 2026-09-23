import React, { useState, useMemo } from 'react';
import { Exam, ExamResult, EvaluatedScore, Student } from '../types';
import { Icons } from './Icons';
import { OPTS_4, OPTS_5, calculateScore, exportToCSV, isLgsExam, isTytExam, isAytExam } from '../constants';

interface StudentReportModalProps {
  student: ExamResult & { scores: EvaluatedScore };
  exam: Exam;
  onClose: () => void;
}

export function StudentReportModal({ student, exam, onClose }: StudentReportModalProps) {
  const key = exam.keys[student.booklet] || exam.keys["A"];
  const isLgs = isLgsExam(exam);
  const isTyt = isTytExam(exam);
  const isAyt = isAytExam(exam);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Lütfen pop-up engelleyiciye izin verin.");

    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${student.name} - Sınav Karnesi</title><style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #333; font-size: 11px; line-height: 1.2; }
      .header { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 12px; }
      .header h2 { margin: 0 0 4px 0; font-size: 14px; color: #475569; text-transform: uppercase; }
      .header h1 { margin: 0; font-size: 18px; font-weight: 900; }
      .info { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; font-weight: bold; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
      .info span { color: #2563eb; }
      .summary { display: flex; gap: 10px; margin-bottom: 15px; }
      .sum-box { flex: 1; padding: 8px; text-align: center; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
      .sum-title { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
      .sum-val { font-size: 20px !important; font-weight: 900; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-items: start; }
      .subject { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff; }
      .sub-head { background: #1e293b; color: white; padding: 5px; font-weight: bold; text-align: center; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; text-align: center; font-size: 10px; }
      th { background: #f1f5f9; padding: 3px; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
      td { border-bottom: 1px solid #f1f5f9; padding: 3px; }
      tr:last-child td { border-bottom: none; }
      .D { color: #16a34a; font-weight: bold; }
      .Y { color: #dc2626; font-weight: bold; }
      .B { color: #94a3b8; font-weight: bold; }
      @media print { 
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
        .subject { page-break-inside: avoid; } 
      }
    </style></head><body>
      <div class="header">
        <h2>${exam.institution || "Eğitim Kurumu"} - ${exam.name}</h2>
        <h1>ÖĞRENCİ SINAV KARNESİ</h1>
      </div>
      <div class="info">
        <div>Adı Soyadı: <span>${student.name}</span></div>
        <div>Öğrenci No: <span>${student.no}</span></div>
        <div>Sınıf/Şube: <span>${student.classStr} / ${student.sectionStr}</span></div>
        <div>Kitapçık: <span>${student.booklet}</span></div>
      </div>
      <div class="summary">
        <div class="sum-box"><div class="sum-title">Toplam Doğru</div><div class="sum-val" style="color: #16a34a">${student.scores.total.correct}</div></div>
        <div class="sum-box"><div class="sum-title">Toplam Yanlış</div><div class="sum-val" style="color: #dc2626">${student.scores.total.wrong}</div></div>
        <div class="sum-box"><div class="sum-title">Toplam Boş</div><div class="sum-val" style="color: #64748b">${student.scores.total.empty}</div></div>
        <div class="sum-box" style="background:#eff6ff; border-color:#bfdbfe;"><div class="sum-title" style="color:#1d4ed8;">Toplam Net</div><div class="sum-val" style="color: #1d4ed8">${student.scores.total.net.toFixed(2).replace('.', ',')}</div></div>
        ${isLgs ? `<div class="sum-box" style="background:#fdf4ff; border-color:#c084fc;"><div class="sum-title" style="color:#7e22ce;">PUAN (LGS 2026)</div><div class="sum-val" style="color: #7e22ce">${student.scores.total.lgsScore.toFixed(2).replace('.', ',')}</div></div><div class="sum-box" style="background:#faf5ff; border-color:#e879f9;"><div class="sum-title" style="color:#a21caf;">DİLİM (Genel)</div><div class="sum-val" style="color: #a21caf">%${student.scores.total.percentile.toFixed(2).replace('.', ',')}</div></div>` : isTyt ? `<div class="sum-box" style="background:#eff6ff; border-color:#93c5fd;"><div class="sum-title" style="color:#1d4ed8;">TYT PUANI</div><div class="sum-val" style="color: #1d4ed8">${(student.scores.total.tytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}</div></div>` : isAyt ? `<div class="sum-box" style="background:#f0fdf4; border-color:#86efac;"><div class="sum-title" style="color:#15803d;">AYT PUANI</div><div class="sum-val" style="color: #15803d">${(student.scores.total.aytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}</div></div>` : ''}
      </div>
      <div class="grid">
    `;

    let qIndex = 0;
    exam.subjects.forEach(sub => {
      const ss = student.scores.subjectScores[sub.id];
      html += `<div class="subject">
        <div class="sub-head">${sub.name} (D:${ss.correct} Y:${ss.wrong} N:${ss.net.toFixed(2).replace('.', ',')})</div>
        <table><tr><th>#</th><th>Cevap</th><th>Öğr.</th><th>Durum</th></tr>`;
      for (let i = 0; i < sub.count; i++) {
        const ans = student.answers[qIndex];
        const k = key ? key[qIndex] : undefined;
        const status = !ans ? "B" : (ans === k ? "D" : "Y");
        html += `<tr><td>${i + 1}</td><td>${k || "-"}</td><td>${ans || "-"}</td><td class="${status}">${!ans ? "BOŞ" : (ans === k ? "DOĞRU" : "YANLIŞ")}</td></tr>`;
        qIndex++;
      }
      html += `</table></div>`;
    });

    html += `</div></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };

  const handleExportDetailedCSV = () => {
    let csv = "data:text/csv;charset=utf-8,\uFEFF";
    csv += `Sinav;${exam.name}\nOgrenci Adi;${student.name}\nOgrenci No;${student.no}\nSinif/Sube;${student.classStr}/${student.sectionStr}\nKitapcik;${student.booklet}\n`;
    if (isLgs) {
      csv += `PUAN;${student.scores.total.lgsScore.toFixed(2).replace('.', ',')}\n`;
      csv += `DİLİM;%${student.scores.total.percentile.toFixed(2).replace('.', ',')}\n`;
    } else if (isTyt) {
      csv += `TYT_PUAN;${(student.scores.total.tytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}\n`;
    } else if (isAyt) {
      csv += `AYT_PUAN;${(student.scores.total.aytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}\n`;
    }
    csv += `\n`;
    csv += "Ders;Soru No;Dogru Cevap;Ogrenci Cevabi;Durum\n";

    let qIndex = 0;
    exam.subjects.forEach(sub => {
      for (let i = 0; i < sub.count; i++) {
        const ans = student.answers[qIndex];
        const k = key ? key[qIndex] : undefined;
        const status = !ans ? "BOS" : (ans === k ? "DOGRU" : "YANLIS");
        csv += `${sub.name};${i + 1};${k || "-"};${ans || "-"};${status}\n`;
        qIndex++;
      }
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${student.name.replace(/\s+/g, "_")}_Karne.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl relative flex flex-col max-h-[92vh] overflow-hidden border border-slate-300">
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Icons.BookOpen />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                Öğrenci Sınav Karnesi
              </h2>
              <p className="text-xs text-slate-500 font-medium">{student.name} • No: {student.no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors cursor-pointer"
          >
            <Icons.X />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 custom-scrollbar">
          {/* Student Info Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Öğrenci Adı</div>
              <div className="font-bold text-blue-600 truncate text-sm">{student.name}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Numara</div>
              <div className="font-bold font-mono text-slate-800 text-sm">{student.no}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Sınıf / Şube</div>
              <div className="font-bold text-slate-800 text-sm">{student.classStr} / {student.sectionStr}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Kitapçık</div>
              <div className="font-bold text-indigo-700 text-sm">{student.booklet} Kitapçığı</div>
            </div>
          </div>

          {/* Quick Metric Bubbles */}
          <div className={`grid gap-2 text-center ${isLgs ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : (isTyt || isAyt) ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
            <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 sm:p-3 rounded-xl shadow-2xs">
              <div className="text-[10px] text-emerald-700 font-bold uppercase mb-0.5">Doğru</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700">{student.scores.total.correct}</div>
            </div>
            <div className="bg-rose-50/80 border border-rose-200 p-2.5 sm:p-3 rounded-xl shadow-2xs">
              <div className="text-[10px] text-rose-700 font-bold uppercase mb-0.5">Yanlış</div>
              <div className="text-xl sm:text-2xl font-black text-rose-700">{student.scores.total.wrong}</div>
            </div>
            <div className="bg-slate-100 border border-slate-200 p-2.5 sm:p-3 rounded-xl shadow-2xs">
              <div className="text-[10px] text-slate-600 font-bold uppercase mb-0.5">Boş</div>
              <div className="text-xl sm:text-2xl font-black text-slate-700">{student.scores.total.empty}</div>
            </div>
            <div className="bg-blue-50/80 border border-blue-200 p-2.5 sm:p-3 rounded-xl shadow-2xs">
              <div className="text-[10px] text-blue-700 font-bold uppercase mb-0.5">Genel Net</div>
              <div className="text-xl sm:text-2xl font-black text-blue-700">{student.scores.total.net.toFixed(2).replace('.', ',')}</div>
            </div>
            {isLgs ? (
              <>
                <div className="bg-purple-50/80 border border-purple-200 p-2.5 sm:p-3 rounded-xl shadow-2xs">
                  <div className="text-[10px] text-purple-700 font-bold uppercase mb-0.5">PUAN (LGS 2026)</div>
                  <div className="text-xl sm:text-2xl font-black text-purple-700">{student.scores.total.lgsScore.toFixed(2).replace('.', ',')}</div>
                </div>
                <div className="bg-fuchsia-50/80 border border-fuchsia-200 p-2.5 sm:p-3 rounded-xl shadow-2xs">
                  <div className="text-[10px] text-fuchsia-700 font-bold uppercase mb-0.5">DİLİM (Genel)</div>
                  <div className="text-xl sm:text-2xl font-black text-fuchsia-700">%{student.scores.total.percentile.toFixed(2).replace('.', ',')}</div>
                </div>
              </>
            ) : isTyt ? (
              <div className="bg-indigo-50/80 border border-indigo-200 p-2.5 sm:p-3 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
                <div className="text-[10px] text-indigo-700 font-bold uppercase mb-0.5">TYT PUANI (ÖSYM)</div>
                <div className="text-xl sm:text-2xl font-black text-indigo-700">{(student.scores.total.tytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}</div>
              </div>
            ) : isAyt ? (
              <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 sm:p-3 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
                <div className="text-[10px] text-emerald-700 font-bold uppercase mb-0.5">AYT PUANI (ÖSYM)</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700">{(student.scores.total.aytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}</div>
              </div>
            ) : null}
          </div>

          {/* Subject Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {(() => {
              let globalQIndex = 0;
              return exam.subjects.map(sub => {
                const ss = student.scores.subjectScores[sub.id];
                const questions: React.ReactNode[] = [];
                for (let i = 0; i < sub.count; i++) {
                  const ans = student.answers[globalQIndex];
                  const k = key ? key[globalQIndex] : undefined;
                  const statusClass = !ans ? "text-slate-400 font-medium" : (ans === k ? "text-emerald-600 font-bold" : "text-rose-600 font-bold");
                  const statusText = !ans ? "BOŞ" : (ans === k ? "DOĞRU" : "YANLIŞ");

                  questions.push(
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-1 px-2 text-center text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="py-1 px-2 text-center font-bold text-slate-700">{k || "-"}</td>
                      <td className={`py-1 px-2 text-center font-bold ${!ans ? 'text-slate-300' : 'text-blue-600'}`}>{ans || "-"}</td>
                      <td className={`py-1 px-2 text-center text-[10px] ${statusClass}`}>{statusText}</td>
                    </tr>
                  );
                  globalQIndex++;
                }

                return (
                  <div key={sub.id} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
                    <div className="bg-slate-800 text-white px-3 py-2 flex justify-between items-center text-xs font-bold">
                      <span className="truncate pr-2">{sub.name}</span>
                      <span className="shrink-0 text-[10px] bg-slate-700 px-2 py-0.5 rounded-full font-mono">
                        D:{ss.correct} Y:{ss.wrong} <span className="text-emerald-300 ml-1">N:{ss.net.toFixed(2).replace('.', ',')}</span>
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-56 custom-scrollbar">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="py-1 px-1">Soru</th>
                            <th className="py-1 px-1">Cevap</th>
                            <th className="py-1 px-1">Öğr.</th>
                            <th className="py-1 px-1">Durum</th>
                          </tr>
                        </thead>
                        <tbody>{questions}</tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2.5 shrink-0">
          <button
            onClick={handleExportDetailedCSV}
            className="w-full sm:w-auto bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
          >
            <Icons.Download />
            <span>Detaylı Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Icons.Printer />
            <span>Karneyi Yazdır (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditResultModalProps {
  student: ExamResult;
  exam: Exam;
  onClose: () => void;
  onSave: (updated: ExamResult) => void;
}

export function EditResultModal({ student, exam, onClose, onSave }: EditResultModalProps) {
  const [formData, setFormData] = useState({
    name: student.name,
    no: student.no,
    classStr: student.classStr,
    sectionStr: student.sectionStr,
    booklet: student.booklet
  });
  const [answers, setAnswers] = useState<string[]>([...student.answers]);
  const options = exam.optionsCount === 4 ? OPTS_4 : OPTS_5;

  const setKey = (gIdx: number, val: string) => {
    const n = [...answers];
    n[gIdx] = n[gIdx] === val ? "" : val;
    setAnswers(n);
  };

  let gCounter = 0;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[250] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl relative flex flex-col max-h-[92vh] overflow-hidden border border-slate-300">
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Icons.Edit />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                Öğrenci Sonucunu Düzenle
              </h2>
              <p className="text-xs text-slate-500 font-medium">Hatalı okunan bilgileri veya optik şıkları düzeltebilirsiniz.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors cursor-pointer"
          >
            <Icons.X />
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Adı Soyadı</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold uppercase outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Öğrenci No</label>
              <input
                type="text"
                value={formData.no}
                onChange={e => setFormData({ ...formData, no: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Sınıf</label>
              <input
                type="text"
                value={formData.classStr}
                onChange={e => setFormData({ ...formData, classStr: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Şube</label>
              <input
                type="text"
                value={formData.sectionStr}
                onChange={e => setFormData({ ...formData, sectionStr: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold uppercase outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Kitapçık</label>
              <select
                value={formData.booklet}
                onChange={e => setFormData({ ...formData, booklet: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold cursor-pointer outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="A">A Kitapçığı</option>
                <option value="B">B Kitapçığı</option>
                <option value="C">C Kitapçığı</option>
                <option value="D">D Kitapçığı</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {exam.subjects.map((sub) => {
              const startGlobalIdx = gCounter;
              gCounter += sub.count;
              const chunks: number[][] = [];
              for (let i = 0; i < sub.count; i += 10) {
                chunks.push(Array.from({ length: Math.min(10, sub.count - i) }).map((_, idx) => i + idx));
              }

              return (
                <div key={sub.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 text-xs sm:text-sm flex justify-between items-center">
                    <span>{sub.name}</span>
                    <span className="text-xs text-slate-400 font-mono">({sub.count} Soru)</span>
                  </div>
                  <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 bg-white">
                    {chunks.map((chunk, cIdx) => (
                      <div key={cIdx} className="flex flex-col gap-1.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 w-full">
                        {chunk.map(lIdx => {
                          const gIdx = startGlobalIdx + lIdx;
                          return (
                            <div key={gIdx} className="flex items-center justify-between hover:bg-slate-100 p-1 rounded-lg transition-colors">
                              <span className="w-6 font-bold text-slate-500 text-xs font-mono">{lIdx + 1}.</span>
                              <div className="flex gap-1 sm:gap-1.5">
                                {options.map(opt => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setKey(gIdx, opt)}
                                    className={`w-7 h-7 rounded-full border-2 font-bold text-xs transition-all cursor-pointer ${
                                      answers[gIdx] === opt ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-2xs' : 'bg-white border-slate-300 text-slate-600 hover:border-blue-400'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            onClick={() => onSave({ ...student, ...formData, answers })}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-xs flex gap-1.5 items-center cursor-pointer"
          >
            <Icons.CheckCircle />
            <span>Değişiklikleri Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface ResultsTabProps {
  exam: Exam;
  updateExam: (updates: Partial<Exam>) => void;
  schoolStudents?: Student[];
  showAlert: (msg: string) => void;
  showConfirm: (msg: string, onConfirm: () => void) => void;
}

export function ResultsTab({ exam, updateExam, schoolStudents, showAlert, showConfirm }: ResultsTabProps) {
  const [selectedStudent, setSelectedStudent] = useState<(ExamResult & { scores: EvaluatedScore }) | null>(null);
  const [editingStudent, setEditingStudent] = useState<ExamResult | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [classDropdownSearch, setClassDropdownSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResultView, setActiveResultView] = useState<'results' | 'absent'>('results');

  const isLgs = isLgsExam(exam);
  const isTyt = isTytExam(exam);
  const isAyt = isAytExam(exam);

  // Mobile layout view: 'cards' | 'table' (default to cards for great mobile UX, or table for dense view)
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'cards' | 'table'>('cards');

  const masterList = useMemo(() => {
    if (schoolStudents && schoolStudents.length > 0) return schoolStudents;
    return exam.studentList || [];
  }, [schoolStudents, exam.studentList]);

  const scannedNosSet = useMemo(() => {
    return new Set(exam.results.map(r => r.no.toString().trim()));
  }, [exam.results]);

  const absentStudents = useMemo(() => {
    return masterList.filter(s => {
      const sNo = s.no.toString().trim();
      if (scannedNosSet.has(sNo)) return false;

      if (selectedClassFilter !== "ALL") {
        const c = (s.classStr || "").trim();
        const sec = (s.sectionStr || "").trim().toUpperCase();
        const full = (c && sec) ? `${c}/${sec}` : (c ? `${c}. Sınıf` : '');
        if (full !== selectedClassFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return s.name.toLowerCase().includes(q) || sNo.includes(q);
      }

      return true;
    });
  }, [masterList, scannedNosSet, selectedClassFilter, searchQuery]);

  const confirmDelete = (id: number | string) => {
    showConfirm("Sınav sonucunu silmek istediğinize emin misiniz?", () => {
      updateExam({ results: exam.results.filter(r => r.id !== id) });
    });
  };

  const confirmDeleteAll = () => {
    showConfirm("Tüm sonuçları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.", () => {
      updateExam({ results: [] });
    });
  };

  const saveEdit = (updatedStudent: ExamResult) => {
    updateExam({
      results: exam.results.map(r => (r.id === updatedStudent.id ? updatedStudent : r))
    });
    setEditingStudent(null);
  };

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    exam.results.forEach(r => {
      const c = r.classStr && r.classStr !== "-" ? r.classStr.trim() : "";
      const s = r.sectionStr && r.sectionStr !== "-" ? r.sectionStr.trim().toUpperCase() : "";
      if (c && s) set.add(`${c}/${s}`);
      else if (c) set.add(`${c}. Sınıf`);
    });
    masterList.forEach(s => {
      const c = (s.classStr || "").trim();
      const sec = (s.sectionStr || "").trim().toUpperCase();
      if (c && sec) set.add(`${c}/${sec}`);
      else if (c) set.add(`${c}. Sınıf`);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [exam.results, masterList]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    exam.results.forEach(r => {
      const c = r.classStr && r.classStr !== "-" ? r.classStr : "";
      const s = r.sectionStr && r.sectionStr !== "-" ? r.sectionStr : "";
      const val = (c && s) ? `${c}/${s}` : (c || s || "");
      if (val) {
        counts[val] = (counts[val] || 0) + 1;
      }
    });
    return counts;
  }, [exam.results]);

  const handleCopyAbsentList = () => {
    if (absentStudents.length === 0) return;
    const text = `Sınava Girmeyen Öğrenciler (${exam.name} - ${selectedClassFilter === 'ALL' ? 'Tüm Okul' : selectedClassFilter}):\n` +
      absentStudents.map((s, i) => `${i + 1}. [No: ${s.no}] ${s.name} (${s.classStr || ''}/${s.sectionStr || ''})`).join('\n');
    navigator.clipboard.writeText(text);
    showAlert("Sınava girmeyen öğrencilerin listesi panoya kopyalandı.");
  };

  const handlePrintAbsentList = () => {
    if (absentStudents.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return showAlert("Lütfen pop-up engelleyiciye izin verin.");
    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${exam.name} - Sınava Girmeyenler</title><style>
      @page { size: A4 portrait; margin: 12mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 0; margin: 0; }
      .header { border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 16px; }
      h1 { font-size: 18px; margin: 0 0 4px 0; color: #0f172a; }
      .sub { font-size: 12px; color: #64748b; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
      th { background-color: #f1f5f9; font-weight: bold; }
      .no { font-family: monospace; font-weight: bold; color: #dc2626; width: 80px; }
      .idx { width: 40px; text-align: center; }
    </style></head><body>
      <div class="header">
        <h1>${exam.institution || "EĞİTİM KURUMU"} - ${exam.name}</h1>
        <div class="sub">SINAVA GİRMEYEN / KATILMAYAN ÖĞRENCİ LİSTESİ (${absentStudents.length} Öğrenci) • Filtre: ${selectedClassFilter === 'ALL' ? 'Tüm Şubeler' : selectedClassFilter}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="idx">#</th>
            <th class="no">Okul No</th>
            <th>Öğrenci Adı Soyadı</th>
            <th>Sınıf / Şube</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${absentStudents.map((s, idx) => `
            <tr>
              <td class="idx">${idx + 1}</td>
              <td class="no">${s.no}</td>
              <td style="font-weight:bold;">${s.name}</td>
              <td>${s.classStr || '-'}/${s.sectionStr || '-'}</td>
              <td style="color:#dc2626; font-weight:bold;">Sınava Girmedi</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };

  const handleExportAbsentCSV = () => {
    if (absentStudents.length === 0) return;
    let csv = "data:text/csv;charset=utf-8,\uFEFF";
    csv += "Sıra;Okul No;Öğrenci Adı Soyadı;Sınıf;Şube;Durum\n";
    absentStudents.forEach((s, idx) => {
      csv += `${idx + 1};${s.no};${s.name};${s.classStr || ''};${s.sectionStr || ''};Sınava Girmedi\n`;
    });
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${exam.name}_Sinava_Girmeyenler.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const evaluatedResults = useMemo(() => {
    let filtered = exam.results;
    if (selectedClassFilter !== "ALL") {
      filtered = filtered.filter(r => {
        const c = r.classStr && r.classStr !== "-" ? r.classStr : "";
        const s = r.sectionStr && r.sectionStr !== "-" ? r.sectionStr : "";
        const val = (c && s) ? `${c}/${s}` : (c || s || "");
        return val === selectedClassFilter;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.no && r.no.toString().includes(q))
      );
    }

    return filtered.map(res => {
      const key = exam.keys[res.booklet] || exam.keys["A"];
      return { ...res, scores: calculateScore(res.answers, key, exam.penalty, exam.subjects, exam.format, exam.name, exam.optionsCount) };
    }).sort((a, b) => {
      if (isLgs) {
        if (b.scores.total.lgsScore !== a.scores.total.lgsScore) {
          return b.scores.total.lgsScore - a.scores.total.lgsScore;
        }
      }
      return b.scores.total.net - a.scores.total.net;
    });
  }, [exam, selectedClassFilter, searchQuery, isLgs]);

  // General summary statistics
  const summaryStats = useMemo(() => {
    if (evaluatedResults.length === 0) {
      return {
        avgNet: "0,00",
        maxNet: "0,00",
        avgCorrect: "0",
        totalScanned: 0,
        avgLgs: "0,00",
        maxLgs: "0,00",
        bestPercentile: "0,00"
      };
    }
    const totalNet = evaluatedResults.reduce((acc, curr) => acc + curr.scores.total.net, 0);
    const totalCorrect = evaluatedResults.reduce((acc, curr) => acc + curr.scores.total.correct, 0);
    const maxNet = Math.max(...evaluatedResults.map(r => r.scores.total.net));
    const avgNet = (totalNet / evaluatedResults.length).toFixed(2).replace('.', ',');
    const avgCorrect = (totalCorrect / evaluatedResults.length).toFixed(1).replace('.', ',');

    const totalLgs = evaluatedResults.reduce((acc, curr) => acc + curr.scores.total.lgsScore, 0);
    const avgLgs = (totalLgs / evaluatedResults.length).toFixed(2).replace('.', ',');
    const maxLgs = Math.max(...evaluatedResults.map(r => r.scores.total.lgsScore)).toFixed(2).replace('.', ',');
    const bestPercentile = Math.min(...evaluatedResults.map(r => r.scores.total.percentile)).toFixed(2).replace('.', ',');

    return {
      avgNet,
      maxNet: maxNet.toFixed(2).replace('.', ','),
      avgCorrect,
      totalScanned: evaluatedResults.length,
      avgLgs,
      maxLgs,
      bestPercentile
    };
  }, [evaluatedResults]);

  const handlePrintResults = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return showAlert("Lütfen pop-up engelleyiciye izin verin.");

    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${exam.name} - Sonuç Listesi</title><style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
      h1 { text-align: center; font-size: 16px; margin-bottom: 15px; text-transform: uppercase; color: #1e293b; }
      table { width: 100%; border-collapse: collapse; text-align: center; font-size: 10px; }
      th, td { border: 1px solid #cbd5e1; padding: 5px; }
      th { background-color: #f1f5f9; font-weight: bold; font-size: 9px; text-transform: uppercase; }
      .net { font-weight: bold; color: #2563eb; }
      .lgs-puan { font-weight: 900; color: #7e22ce; background-color: #fdf4ff !important; }
      .lgs-dilim { font-weight: 900; color: #9333ea; background-color: #faf5ff !important; }
      .D { color: #16a34a; }
      .Y { color: #dc2626; }
      .name-col { text-align: left; font-weight: bold; }
      @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    </style></head><body>
      <h1>${exam.name} - GENEL SONUÇ LİSTESİ</h1>
      <table>
        <thead>
          <tr>
            <th rowspan="2">Sıra</th>
            <th rowspan="2">Öğr. No</th>
            <th rowspan="2">Adı Soyadı</th>
            <th rowspan="2">Sınıf</th>
            <th rowspan="2">Kit.</th>`;

    exam.subjects.forEach(sub => {
      html += `<th colspan="3">${sub.name}</th>`;
    });

    const toplamCols = isLgs ? 6 : 4;
    html += `<th colspan="${toplamCols}" style="background-color: #e2e8f0;">GENEL TOPLAM</th></tr><tr>`;

    exam.subjects.forEach(() => {
      html += `<th class="D">D</th><th class="Y">Y</th><th class="net">N</th>`;
    });
    html += `<th class="D">D</th><th class="Y">Y</th><th>B</th><th class="net" style="background-color: #e2e8f0;">NET</th>`;
    if (isLgs) {
      html += `<th class="lgs-puan" style="font-size:10px;">PUAN</th>`;
      html += `<th class="lgs-dilim" style="font-size:10px;">DİLİM</th>`;
    }
    html += `</tr></thead><tbody>`;

    evaluatedResults.forEach((student, idx) => {
      html += `<tr>
        <td>${idx + 1}</td>
        <td style="font-weight:bold; color:#dc2626;">${student.no}</td>
        <td class="name-col">${student.name}</td>
        <td>${student.classStr}/${student.sectionStr}</td>
        <td>${student.booklet}</td>`;

      exam.subjects.forEach(sub => {
        const ss = student.scores.subjectScores[sub.id];
        html += `<td class="D">${ss.correct}</td><td class="Y">${ss.wrong}</td><td class="net">${ss.net.toFixed(2).replace('.', ',')}</td>`;
      });

      html += `<td class="D" style="font-weight:bold;">${student.scores.total.correct}</td>
               <td class="Y" style="font-weight:bold;">${student.scores.total.wrong}</td>
               <td style="font-weight:bold;">${student.scores.total.empty}</td>
               <td class="net" style="background-color: #f8fafc; font-size: 11px;">${student.scores.total.net.toFixed(2).replace('.', ',')}</td>`;
      if (isLgs) {
        html += `<td class="lgs-puan">${student.scores.total.lgsScore.toFixed(2).replace('.', ',')}</td>`;
        html += `<td class="lgs-dilim">%${student.scores.total.percentile.toFixed(2).replace('.', ',')}</td>`;
      }
      html += `</tr>`;
    });

    html += `</tbody></table></body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };

  const handlePrintAllReports = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return showAlert("Lütfen pop-up engelleyiciye izin verin.");

    let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${exam.name} - Toplu Karneler</title><style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #333; font-size: 11px; line-height: 1.2; }
      .report-page { page-break-after: always; padding-bottom: 20px; }
      .report-page:last-child { page-break-after: auto; }
      .header { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 12px; }
      .header h2 { margin: 0 0 4px 0; font-size: 14px; color: #475569; text-transform: uppercase; }
      .header h1 { margin: 0; font-size: 18px; font-weight: 900; }
      .info { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; font-weight: bold; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
      .info span { color: #2563eb; }
      .summary { display: flex; gap: 10px; margin-bottom: 15px; }
      .sum-box { flex: 1; padding: 8px; text-align: center; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
      .sum-title { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
      .sum-val { font-size: 20px !important; font-weight: 900; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-items: start; }
      .subject { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff; }
      .sub-head { background: #1e293b; color: white; padding: 5px; font-weight: bold; text-align: center; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; text-align: center; font-size: 10px; }
      th { background: #f1f5f9; padding: 3px; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
      td { border-bottom: 1px solid #f1f5f9; padding: 3px; }
      tr:last-child td { border-bottom: none; }
      .D { color: #16a34a; font-weight: bold; }
      .Y { color: #dc2626; font-weight: bold; }
      .B { color: #94a3b8; font-weight: bold; }
      @media print { 
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
        .subject { page-break-inside: avoid; } 
      }
    </style></head><body>`;

    evaluatedResults.forEach((student) => {
      const key = exam.keys[student.booklet] || exam.keys["A"];

      html += `<div class="report-page">
        <div class="header">
          <h2>${exam.institution || "Eğitim Kurumu"} - ${exam.name}</h2>
          <h1>ÖĞRENCİ SINAV KARNESİ</h1>
        </div>
        <div class="info">
          <div>Adı Soyadı: <span>${student.name}</span></div>
          <div>Öğrenci No: <span>${student.no}</span></div>
          <div>Sınıf/Şube: <span>${student.classStr} / ${student.sectionStr}</span></div>
          <div>Kitapçık: <span>${student.booklet}</span></div>
        </div>
        <div class="summary">
          <div class="sum-box"><div class="sum-title">Toplam Doğru</div><div class="sum-val" style="color: #16a34a">${student.scores.total.correct}</div></div>
          <div class="sum-box"><div class="sum-title">Toplam Yanlış</div><div class="sum-val" style="color: #dc2626">${student.scores.total.wrong}</div></div>
          <div class="sum-box"><div class="sum-title">Toplam Boş</div><div class="sum-val" style="color: #64748b">${student.scores.total.empty}</div></div>
          <div class="sum-box" style="background:#eff6ff; border-color:#bfdbfe;"><div class="sum-title" style="color:#1d4ed8;">Toplam Net</div><div class="sum-val" style="color: #1d4ed8">${student.scores.total.net.toFixed(2).replace('.', ',')}</div></div>
          ${isLgs ? `<div class="sum-box" style="background:#fdf4ff; border-color:#c084fc;"><div class="sum-title" style="color:#7e22ce;">PUAN (LGS 2026)</div><div class="sum-val" style="color: #7e22ce">${student.scores.total.lgsScore.toFixed(2).replace('.', ',')}</div></div><div class="sum-box" style="background:#faf5ff; border-color:#e879f9;"><div class="sum-title" style="color:#a21caf;">DİLİM (Genel)</div><div class="sum-val" style="color: #a21caf">%${student.scores.total.percentile.toFixed(2).replace('.', ',')}</div></div>` : ''}
        </div>
        <div class="grid">`;

      let qIndex = 0;
      exam.subjects.forEach(sub => {
        const ss = student.scores.subjectScores[sub.id];
        html += `<div class="subject">
          <div class="sub-head">${sub.name} (D:${ss.correct} Y:${ss.wrong} N:${ss.net.toFixed(2).replace('.', ',')})</div>
          <table><tr><th>#</th><th>Cevap</th><th>Öğr.</th><th>Durum</th></tr>`;
        for (let i = 0; i < sub.count; i++) {
          const ans = student.answers[qIndex];
          const k = key ? key[qIndex] : undefined;
          const status = !ans ? "B" : (ans === k ? "D" : "Y");
          html += `<tr><td>${i + 1}</td><td>${k || "-"}</td><td>${ans || "-"}</td><td class="${status}">${!ans ? "BOŞ" : (ans === k ? "DOĞRU" : "YANLIŞ")}</td></tr>`;
          qIndex++;
        }
        html += `</table></div>`;
      });

      html += `</div></div>`;
    });

    html += `</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1500);
  };

  return (
    <div className="bg-slate-50 min-h-full flex flex-col gap-3 pb-8 no-print">
      {/* Modal Dialogs */}
      {selectedStudent && (
        <StudentReportModal student={selectedStudent} exam={exam} onClose={() => setSelectedStudent(null)} />
      )}
      {editingStudent && (
        <EditResultModal student={editingStudent} exam={exam} onClose={() => setEditingStudent(null)} onSave={saveEdit} />
      )}

      {/* Modern Summary & Actions Card */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs shrink-0">
              <Icons.BarChart />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                  Sınav Sonuçları ve Değerlendirme
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {evaluatedResults.length} / {exam.results.length} Sonuç
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Optik taramadan veya manuel eklenen sınav kağıtlarının net ve karne dökümü
              </p>
            </div>
          </div>

          {/* Quick Action Buttons (Excel, Print, Karne, Sil) */}
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
            <button
              onClick={() => {
                const resultsToExport = selectedClassFilter === "ALL" ? null : exam.results.filter(r => {
                  const c = r.classStr && r.classStr !== "-" ? r.classStr : "";
                  const s = r.sectionStr && r.sectionStr !== "-" ? r.sectionStr : "";
                  const val = (c && s) ? `${c}/${s}` : (c || s || "");
                  return val === selectedClassFilter;
                });
                exportToCSV(exam, resultsToExport);
              }}
              disabled={evaluatedResults.length === 0}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                evaluatedResults.length === 0
                  ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 active:scale-95 shadow-2xs'
              }`}
              title="Excel (CSV) Olarak İndir"
            >
              <Icons.Download />
              <span>Excel İndir</span>
            </button>

            <button
              onClick={handlePrintResults}
              disabled={evaluatedResults.length === 0}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                evaluatedResults.length === 0
                  ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 active:scale-95 shadow-2xs'
              }`}
              title="Sonuç Listesini Yazdır"
            >
              <Icons.Printer />
              <span>Listeyi Yazdır</span>
            </button>

            <button
              onClick={handlePrintAllReports}
              disabled={evaluatedResults.length === 0}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                evaluatedResults.length === 0
                  ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 border-fuchsia-200 active:scale-95 shadow-2xs'
              }`}
              title="Toplu Öğrenci Karneleri"
            >
              <Icons.BookOpen />
              <span>Toplu Karne</span>
            </button>

            <button
              onClick={confirmDeleteAll}
              disabled={exam.results.length === 0}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                exam.results.length === 0
                  ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200 active:scale-95 shadow-2xs'
              }`}
              title="Tüm sınav sonuçlarını sil"
            >
              <Icons.Trash />
              <span>Tümünü Sil</span>
            </button>
          </div>
        </div>

        {/* Statistical Summary Pills */}
        <div className={`grid gap-2.5 pt-3 ${isLgs ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}>
          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Okunan Kağıt</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-700">{summaryStats.totalScanned} Adet</span>
          </div>
          <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Sınav Net Ortalaması</span>
            <span className="text-base sm:text-lg font-black font-mono text-blue-700">{summaryStats.avgNet}</span>
          </div>
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">En Yüksek Net</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-700">{summaryStats.maxNet}</span>
          </div>
          <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Ortalama Doğru</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-700">{summaryStats.avgCorrect}</span>
          </div>
          {isLgs && (
            <>
              <div className="bg-fuchsia-50/70 p-2.5 rounded-xl border border-fuchsia-100 flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-600">Ort. LGS Puanı</span>
                <span className="text-base sm:text-lg font-black font-mono text-fuchsia-700">{summaryStats.avgLgs}</span>
              </div>
              <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">En Yüksek Puan</span>
                <span className="text-base sm:text-lg font-black font-mono text-purple-700">
                  {summaryStats.maxLgs} <span className="text-[10px] font-medium text-purple-500">(%{summaryStats.bestPercentile})</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* View Switcher: Sınav Sonuçları vs Sınava Girmeyenler */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveResultView('results')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeResultView === 'results'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Icons.BarChart />
          <span>Sınav Sonuçları</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeResultView === 'results' ? 'bg-purple-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {evaluatedResults.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveResultView('absent')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeResultView === 'absent'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Icons.Users />
          <span>Sınava Girmeyenler / Devamsız</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeResultView === 'absent'
              ? 'bg-amber-800 text-white'
              : (absentStudents.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500')
          }`}>
            {absentStudents.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icons.Search />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Öğrenci adı veya numarası ile ara..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <Icons.X />
            </button>
          )}
        </div>

        {/* Right Tools: Downward-Expanding Custom Class Filter Dropdown & Mobile View Toggle */}
        <div className="flex items-center gap-2">
          {availableClasses.length > 0 && (
            <div className="relative shrink-0">
              {/* Filter Trigger Button */}
              <button
                type="button"
                onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  selectedClassFilter !== "ALL"
                    ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icons.Filter />
                <span>
                  {selectedClassFilter === "ALL" ? "Tüm Sınıflar" : `${selectedClassFilter} Sınıfı`}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  selectedClassFilter !== "ALL"
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {selectedClassFilter === "ALL" ? exam.results.length : (classCounts[selectedClassFilter] || 0)}
                </span>
                <span className={`transition-transform duration-200 ${isClassDropdownOpen ? 'rotate-180' : ''}`}>
                  <Icons.ChevronDown />
                </span>
              </button>

              {/* Downward Expanding Filter Menu */}
              {isClassDropdownOpen && (
                <>
                  {/* Backdrop overlay for outside click */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsClassDropdownOpen(false)}
                  />

                  <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-2.5 z-40 animate-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Sınıfa Göre Filtrele
                      </span>
                      {selectedClassFilter !== "ALL" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassFilter("ALL");
                            setIsClassDropdownOpen(false);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                        >
                          Tümünü Göster
                        </button>
                      )}
                    </div>

                    {availableClasses.length > 4 && (
                      <div className="relative mb-2">
                        <input
                          type="text"
                          value={classDropdownSearch}
                          onChange={e => setClassDropdownSearch(e.target.value)}
                          placeholder="Sınıf ara..."
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-medium"
                        />
                        {classDropdownSearch && (
                          <button
                            type="button"
                            onClick={() => setClassDropdownSearch("")}
                            className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                      {/* Option: All */}
                      {(!classDropdownSearch || "tüm liste sınıflar".includes(classDropdownSearch.toLowerCase())) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassFilter("ALL");
                            setIsClassDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                            selectedClassFilter === "ALL"
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${selectedClassFilter === "ALL" ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                            <span>Tüm Liste / Bütün Sınıflar</span>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            selectedClassFilter === "ALL" ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {exam.results.length}
                          </span>
                        </button>
                      )}

                      {/* Options: Classes */}
                      {availableClasses
                        .filter(c => !classDropdownSearch || c.toLowerCase().includes(classDropdownSearch.toLowerCase()))
                        .map(cls => {
                          const isSelected = selectedClassFilter === cls;
                          const count = classCounts[cls] || 0;
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => {
                                setSelectedClassFilter(cls);
                                setIsClassDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`} />
                                <span>{cls} Sınıfı</span>
                              </div>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {count} Öğrenci
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile Display Mode Toggle: Cards vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold md:hidden">
            <button
              type="button"
              onClick={() => setMobileDisplayMode('cards')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mobileDisplayMode === 'cards' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'
              }`}
              title="Kart Görünümü"
            >
              Kartlar
            </button>
            <button
              type="button"
              onClick={() => setMobileDisplayMode('table')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mobileDisplayMode === 'table' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500'
              }`}
              title="Tablo Görünümü"
            >
              Tablo
            </button>
          </div>
        </div>
      </div>

      {/* Main Results / Absent View */}
      {activeResultView === 'absent' ? (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800 text-base">
                  Sınava Katılmayan / Taranmayan Öğrenciler
                </h4>
                <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {absentStudents.length} Öğrenci
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Öğrenci listenizde kayıtlı olan ancak bu sınav için henüz optik formu okunmamış öğrencilerdir.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyAbsentList}
                disabled={absentStudents.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  absentStudents.length === 0
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 active:scale-95'
                }`}
                title="Sınava girmeyenleri panoya kopyala (WhatsApp / duyuru için)"
              >
                <Icons.Copy />
                <span>Panoya Kopyala</span>
              </button>

              <button
                type="button"
                onClick={handlePrintAbsentList}
                disabled={absentStudents.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  absentStudents.length === 0
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 active:scale-95'
                }`}
                title="A4 formatında yazdır"
              >
                <Icons.Printer />
                <span>Yazdır</span>
              </button>

              <button
                type="button"
                onClick={handleExportAbsentCSV}
                disabled={absentStudents.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  absentStudents.length === 0
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 active:scale-95'
                }`}
                title="Excel (CSV) olarak indir"
              >
                <Icons.Download />
                <span>Excel İndir</span>
              </button>
            </div>
          </div>

          {absentStudents.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xl font-bold">
                ✓
              </div>
              <h5 className="font-bold text-slate-800 text-sm sm:text-base">Tüm Öğrenciler Sınava Katıldı</h5>
              <p className="text-xs text-slate-500 max-w-md">
                {selectedClassFilter !== "ALL"
                  ? `${selectedClassFilter} şubesinde optik formu taranmayan eksik öğrenci bulunmamaktadır.`
                  : "Öğrenci listenizdeki tüm öğrencilerin optik formları başarıyla taranmıştır."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-center w-12">#</th>
                    <th className="p-2.5">Okul No</th>
                    <th className="p-2.5">Öğrenci Adı Soyadı</th>
                    <th className="p-2.5 text-center">Sınıf / Şube</th>
                    <th className="p-2.5 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {absentStudents.map((s, idx) => (
                    <tr key={`${s.no}-${idx}`} className="hover:bg-amber-50/40 transition-colors">
                      <td className="p-2.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-mono font-bold text-rose-600">{s.no}</td>
                      <td className="p-2.5 font-bold text-slate-800">{s.name}</td>
                      <td className="p-2.5 text-center text-slate-600 font-semibold">
                        {(s.classStr && s.sectionStr) ? `${s.classStr}/${s.sectionStr}` : (s.classStr || s.sectionStr || '-')}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Sınava Katılmadı
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : evaluatedResults.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 shadow-2xs">
            <Icons.Users />
          </div>
          <div>
            <h5 className="font-bold text-slate-700 text-sm sm:text-base">
              {searchQuery || selectedClassFilter !== "ALL"
                ? "Aramaya uygun sınav sonucu bulunamadı"
                : "Henüz okunmuş bir sınav sonucu bulunmamaktadır"}
            </h5>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery || selectedClassFilter !== "ALL"
                ? "Arama filtresini temizleyerek veya sınıf seçimini değiştirerek tekrar deneyin."
                : "Canlı Tarama sekmesinden optik formları okutarak sonuçları anında listeleyebilirsiniz."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Cards View (Visible on mobile when cards mode is chosen) */}
          <div className={`space-y-3 ${mobileDisplayMode === 'cards' ? 'block md:hidden' : 'hidden'}`}>
            {evaluatedResults.map((student, idx) => (
              <div
                key={student.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all flex flex-col gap-3"
              >
                {/* Card Top: Rank, Name, Booklet, Actions */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black font-mono text-indigo-700 shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div
                        onClick={() => setSelectedStudent(student)}
                        className="font-bold text-slate-800 text-sm truncate hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>{student.name}</span>
                        <span className="text-slate-300 text-[10px]">↗</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-rose-600">No: {student.no}</span>
                        <span>•</span>
                        <span>{student.classStr}/{student.sectionStr}</span>
                        <span>•</span>
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-600">
                          {student.booklet} Kitapçığı
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingStudent(student)}
                      className="p-1.5 bg-slate-50 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                      title="Düzenle"
                    >
                      <Icons.Edit />
                    </button>
                    <button
                      onClick={() => confirmDelete(student.id)}
                      className="p-1.5 bg-slate-50 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                      title="Sil"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>

                {/* Score Summary Grid in Card */}
                <div className={`grid gap-2 text-center bg-slate-50/80 p-2 rounded-xl border border-slate-100 ${
                  isLgs ? 'grid-cols-3 sm:grid-cols-6' : (isTyt || isAyt) ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-4'
                }`}>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 block">Doğru</span>
                    <span className="text-sm font-black text-emerald-700">{student.scores.total.correct}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 block">Yanlış</span>
                    <span className="text-sm font-black text-rose-700">{student.scores.total.wrong}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Boş</span>
                    <span className="text-sm font-black text-slate-600">{student.scores.total.empty}</span>
                  </div>
                  <div className="bg-blue-50/80 rounded-lg py-0.5 border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-600 block">Net</span>
                    <span className="text-sm font-black text-blue-700">{student.scores.total.net.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {isLgs ? (
                    <>
                      <div className="bg-fuchsia-50/90 rounded-lg py-0.5 border border-fuchsia-200">
                        <span className="text-[10px] font-black text-fuchsia-700 block">PUAN</span>
                        <span className="text-sm font-black font-mono text-fuchsia-800">{student.scores.total.lgsScore.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="bg-purple-50/90 rounded-lg py-0.5 border border-purple-200">
                        <span className="text-[10px] font-black text-purple-700 block">DİLİM</span>
                        <span className="text-sm font-black font-mono text-purple-800">%{student.scores.total.percentile.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </>
                  ) : isTyt ? (
                    <div className="bg-indigo-50/90 rounded-lg py-0.5 border border-indigo-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-black text-indigo-700 block">TYT PUANI</span>
                      <span className="text-sm font-black font-mono text-indigo-800">{(student.scores.total.tytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ) : isAyt ? (
                    <div className="bg-emerald-50/90 rounded-lg py-0.5 border border-emerald-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-black text-emerald-700 block">AYT PUANI</span>
                      <span className="text-sm font-black font-mono text-emerald-800">{(student.scores.total.aytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ) : null}
                </div>

                {/* Subject breakdown pill bars */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-[11px]">
                  {exam.subjects.map(sub => {
                    const ss = student.scores.subjectScores[sub.id];
                    return (
                      <div
                        key={sub.id}
                        className="bg-slate-100 px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 border border-slate-200/80"
                      >
                        <span className="font-bold text-slate-700">{sub.name.slice(0, 3)}:</span>
                        <span className="text-emerald-600 font-bold">{ss.correct}D</span>
                        <span className="text-rose-500 font-bold">{ss.wrong}Y</span>
                        <span className="text-blue-600 font-black ml-0.5">{ss.net.toFixed(1).replace('.', ',')}N</span>
                      </div>
                    );
                  })}
                </div>

                {/* Karne Göster Butonu */}
                <button
                  onClick={() => setSelectedStudent(student)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80"
                >
                  <Icons.BookOpen />
                  <span>Detaylı Karne Görüntüle</span>
                </button>
              </div>
            ))}
          </div>

          {/* High Density Table View (Desktop always, Mobile when table mode is selected) */}
          <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden ${
            mobileDisplayMode === 'cards' ? 'hidden md:block' : 'block'
          }`}>
            <div className="overflow-x-auto overflow-y-auto max-h-[680px] custom-scrollbar">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse min-w-max">
                <thead className="bg-slate-800 text-white sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th rowSpan={2} className="p-2.5 border-b border-slate-700 text-center w-10">Sıra</th>
                    <th rowSpan={2} className="p-2.5 border-b border-slate-700">Öğrenci No</th>
                    <th rowSpan={2} className="p-2.5 border-b border-slate-700">Adı Soyadı</th>
                    <th rowSpan={2} className="p-2.5 border-b border-slate-700 text-center">Sınıf</th>
                    <th rowSpan={2} className="p-2.5 border-b border-slate-700 text-center">Kit.</th>
                    {exam.subjects.map(sub => (
                      <th key={sub.id} colSpan={3} className="p-2 border-b border-slate-700 text-center bg-slate-850">
                        {sub.name}
                      </th>
                    ))}
                    <th colSpan={isLgs ? 6 : (isTyt || isAyt) ? 5 : 4} className="p-2 border-b border-slate-700 text-center bg-indigo-900">
                      GENEL TOPLAM
                    </th>
                    <th rowSpan={2} className="p-2.5 border-b border-slate-700 text-center sticky right-0 bg-slate-900 z-20">
                      İşlemler
                    </th>
                  </tr>
                  <tr>
                    {exam.subjects.map(sub => (
                      <React.Fragment key={`sub-${sub.id}`}>
                        <th className="p-1.5 border-b border-slate-700 text-center text-emerald-400 font-mono">D</th>
                        <th className="p-1.5 border-b border-slate-700 text-center text-rose-400 font-mono">Y</th>
                        <th className="p-1.5 border-b border-slate-700 text-center text-yellow-300 font-mono">N</th>
                      </React.Fragment>
                    ))}
                    <th className="p-1.5 border-b border-slate-700 text-center bg-indigo-900 text-emerald-300 font-mono">D</th>
                    <th className="p-1.5 border-b border-slate-700 text-center bg-indigo-900 text-rose-300 font-mono">Y</th>
                    <th className="p-1.5 border-b border-slate-700 text-center bg-indigo-900 text-slate-300 font-mono">B</th>
                    <th className="p-1.5 border-b border-slate-700 text-center bg-indigo-900 text-white font-black font-mono">NET</th>
                    {isLgs ? (
                      <>
                        <th className="p-1.5 border-b border-slate-700 text-center bg-fuchsia-950 text-fuchsia-200 font-black tracking-wide">PUAN</th>
                        <th className="p-1.5 border-b border-slate-700 text-center bg-purple-950 text-purple-200 font-black tracking-wide">DİLİM</th>
                      </>
                    ) : isTyt ? (
                      <th className="p-1.5 border-b border-slate-700 text-center bg-indigo-950 text-indigo-200 font-black tracking-wide">TYT PUAN</th>
                    ) : isAyt ? (
                      <th className="p-1.5 border-b border-slate-700 text-center bg-emerald-950 text-emerald-200 font-black tracking-wide">AYT PUAN</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluatedResults.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-indigo-50/40 bg-white transition-colors">
                      <td className="p-2.5 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-bold font-mono text-rose-600">{student.no}</td>
                      <td
                        className="p-2.5 font-bold text-blue-600 cursor-pointer hover:text-blue-800 hover:underline flex items-center gap-1"
                        onClick={() => setSelectedStudent(student)}
                        title="Karnesini Görüntüle"
                      >
                        {student.name}
                        <span className="text-slate-300 text-[10px]">↗</span>
                      </td>
                      <td className="p-2.5 text-center text-slate-600 font-semibold">{student.classStr}/{student.sectionStr}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700">
                          {student.booklet}
                        </span>
                      </td>
                      {exam.subjects.map(sub => {
                        const ss = student.scores.subjectScores[sub.id];
                        return (
                          <React.Fragment key={`score-${sub.id}`}>
                            <td className="p-2 text-center text-emerald-600 font-mono font-bold">{ss.correct}</td>
                            <td className="p-2 text-center text-rose-500 font-mono font-bold">{ss.wrong}</td>
                            <td className="p-2 text-center font-bold text-blue-600 font-mono">{ss.net.toFixed(2).replace('.', ',')}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className="p-2 text-center text-emerald-700 font-bold font-mono">{student.scores.total.correct}</td>
                      <td className="p-2 text-center text-rose-600 font-bold font-mono">{student.scores.total.wrong}</td>
                      <td className="p-2 text-center text-slate-500 font-bold font-mono">{student.scores.total.empty}</td>
                      <td className="p-2 text-center text-blue-700 font-black font-mono text-sm bg-blue-50/50">
                        {student.scores.total.net.toFixed(2).replace('.', ',')}
                      </td>
                      {isLgs ? (
                        <>
                          <td className="p-2 text-center text-fuchsia-700 font-black bg-fuchsia-50/60 font-mono border-l border-fuchsia-100">
                            <span className="px-2 py-0.5 rounded-md bg-fuchsia-100/90 text-fuchsia-900 border border-fuchsia-200 font-black">
                              {student.scores.total.lgsScore.toFixed(2).replace('.', ',')}
                            </span>
                          </td>
                          <td className="p-2 text-center text-purple-700 font-black bg-purple-50/60 font-mono">
                            <span className="px-2 py-0.5 rounded-md bg-purple-100/90 text-purple-900 border border-purple-200 font-black">
                              %{student.scores.total.percentile.toFixed(2).replace('.', ',')}
                            </span>
                          </td>
                        </>
                      ) : isTyt ? (
                        <td className="p-2 text-center text-indigo-700 font-black bg-indigo-50/60 font-mono border-l border-indigo-100">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100/90 text-indigo-900 border border-indigo-200 font-black">
                            {(student.scores.total.tytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}
                          </span>
                        </td>
                      ) : isAyt ? (
                        <td className="p-2 text-center text-emerald-700 font-black bg-emerald-50/60 font-mono border-l border-emerald-100">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-900 border border-emerald-200 font-black">
                            {(student.scores.total.aytScore ?? student.scores.total.lgsScore).toFixed(2).replace('.', ',')}
                          </span>
                        </td>
                      ) : null}
                      <td className="p-2 text-center sticky right-0 bg-white/95 backdrop-blur-xs border-l border-slate-100 shadow-2xs">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => setEditingStudent(student)}
                            title="Sonucu Düzenle"
                            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() => confirmDelete(student.id)}
                            title="Sonucu Sil"
                            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
