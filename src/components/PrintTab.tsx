import React, { useState, useMemo } from 'react';
import { Exam, Student } from '../types';
import { Icons } from './Icons';
import { LocalQRCode } from './LocalQRCode';
import { DEFAULT_OMR, OPTS_4, OPTS_5, getQuestionsLayout } from '../constants';

interface PrintLayoutProps {
  exam: Exam;
  isColorMode: boolean;
  student: Student | null;
}

export function PrintLayout({ exam, isColorMode, student }: PrintLayoutProps) {
  const options = exam.optionsCount === 4 ? OPTS_4 : OPTS_5;
  const isMebi = student !== null;

  const renderOMR = isMebi
    ? { ...DEFAULT_OMR, infoBox: { ...DEFAULT_OMR.infoBox, h: 35 }, qBox: { ...DEFAULT_OMR.qBox, y: 65 } }
    : DEFAULT_OMR;

  const { items: layoutItems, finalQBoxH, isSplit, topPadding } = getQuestionsLayout(exam, renderOMR);

  const themeColor = isColorMode ? '#ef4444' : '#000000';
  const themeBg = isColorMode ? '#fef2f2' : '#e5e7eb';

  const getStudentChar = (fId: string, cIdx: number) => {
    if (!student) return null;
    let val = "";
    if (fId === 'name') val = (student.name || "").replace(/[^A-ZÇĞİÖŞÜ ]/gi, '').toUpperCase();
    else if (fId === 'no') val = (student.no || "").toString();
    else if (fId === 'cls') val = (student.classStr || "").toString();
    else if (fId === 'sec') val = (student.sectionStr || "").toUpperCase();
    else if (fId === 'bk') return null;

    const field = DEFAULT_OMR.info.fields.find(f => f.id === fId);
    if (!field) return null;

    if (field.cols === 1) return val;

    if (fId === 'no') {
      val = val.padStart(field.cols, '0');
    } else {
      val = val.padEnd(field.cols, ' ');
    }
    return val[cIdx];
  };

  return (
    <div
      className="optik-page bg-white text-black font-sans relative select-none"
      style={{
        width: '210mm',
        height: '297mm',
        ['--print-color' as any]: themeColor,
        ['--print-bg' as any]: themeBg
      }}
    >
      <div className="anchor-mark" style={{ left: `${DEFAULT_OMR.anchorMargin}mm`, top: `${DEFAULT_OMR.anchorMargin}mm` }} />
      <div className="anchor-mark" style={{ left: `${DEFAULT_OMR.paperW - DEFAULT_OMR.anchorMargin}mm`, top: `${DEFAULT_OMR.anchorMargin}mm` }} />
      <div className="anchor-mark" style={{ left: `${DEFAULT_OMR.anchorMargin}mm`, top: `${DEFAULT_OMR.paperH - DEFAULT_OMR.anchorMargin}mm` }} />
      <div className="anchor-mark" style={{ left: `${DEFAULT_OMR.paperW - DEFAULT_OMR.anchorMargin}mm`, top: `${DEFAULT_OMR.paperH - DEFAULT_OMR.anchorMargin}mm` }} />

      <div
        className="absolute border-[2px] print-border bg-gray-50 flex items-center justify-between px-3 py-1"
        style={{ left: `${renderOMR.header.x}mm`, top: `${renderOMR.header.y}mm`, width: `${renderOMR.header.w}mm`, height: `${renderOMR.header.h}mm` }}
      >
        <img
          src={exam.logo || "logo.png"}
          alt="Logo"
          style={{ maxHeight: '7mm', maxWidth: '20mm', objectFit: 'contain', filter: 'grayscale(100%)' }}
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <h1 className="text-[12px] font-black uppercase tracking-widest print-text leading-none">{exam.institution || "EĞİTİM KURUMU"}</h1>
          <h2 className="text-[8px] font-bold text-slate-600 mt-0.5 tracking-wider">{exam.name} • {exam.date || "Tarih Yok"}</h2>
        </div>
        {!isMebi && (
          <div style={{ height: '7.5mm', width: '7.5mm' }}>
            <LocalQRCode data={`SINAV_ID:${exam.id}`} size={64} />
          </div>
        )}
      </div>

      <div
        className="absolute border-[2px] print-border bg-white"
        style={{ left: `${renderOMR.infoBox.x}mm`, top: `${renderOMR.infoBox.y}mm`, width: `${renderOMR.infoBox.w}mm`, height: `${renderOMR.infoBox.h}mm` }}
      >
        {isMebi ? (
          <div className="flex p-3 gap-4 h-full items-center justify-between relative">
            <div className="flex-1 flex flex-col justify-center gap-1.5 pl-4">
              <div className="text-[14px] font-black">{student ? student.name : "..................................................."}</div>
              <div className="text-[10px] font-bold text-slate-600">ÖĞRENCİ NO: <span className="text-[12px] text-black">{student ? student.no : "..................."}</span></div>
              <div className="text-[10px] font-bold text-slate-600">SINIF / ŞUBE: <span className="text-[12px] text-black">{student ? `${student.classStr} / ${student.sectionStr}` : "..................."}</span></div>
            </div>

            <div className="absolute text-[8px] font-bold text-center w-[30mm] -translate-x-1/2" style={{ left: '145.5mm', top: '8mm' }}>
              KİTAPÇIK
            </div>
            {["A", "B", "C", "D"].map((b, idx) => {
              const bx = 135 + (idx * 7);
              const by = 18;
              const isFilled = student && student.booklet === b;
              return (
                <div
                  key={b}
                  className={`info-bubble absolute -translate-x-1/2 -translate-y-1/2 ${isFilled ? 'bubble-filled border-black print-border-black' : ''}`}
                  style={{ left: `${bx}mm`, top: `${by}mm` }}
                >
                  {b}
                </div>
              );
            })}

            <div className="absolute right-[5mm] top-[5mm] w-[25mm] h-[25mm] flex items-center justify-center border-2 border-black p-1 bg-white">
              {student ? (
                <LocalQRCode data={`E:${exam.id}|N:${student.no}|B:${student.booklet}`} size={150} />
              ) : (
                <div className="text-center text-[9px] text-slate-400 font-bold">ÖĞRENCİ<br />KAREKODU<br />(Kişiye Özel)</div>
              )}
            </div>
          </div>
        ) : (
          <React.Fragment>
            {DEFAULT_OMR.info.fields.map(f => (
              <React.Fragment key={f.id}>
                <div
                  className="absolute text-[5px] font-black uppercase tracking-tighter text-center print-text"
                  style={{
                    left: `${f.startX - renderOMR.infoBox.x}mm`,
                    top: `${DEFAULT_OMR.info.labelY - renderOMR.infoBox.y}mm`,
                    width: `${f.cols * DEFAULT_OMR.info.colW}mm`
                  }}
                >
                  {f.label}
                </div>

                {Array.from({ length: f.cols }).map((_, cIdx) => {
                  const centerX = (f.startX - renderOMR.infoBox.x) + (cIdx * DEFAULT_OMR.info.colW) + (DEFAULT_OMR.info.colW / 2);
                  const printedChar = getStudentChar(f.id, cIdx);
                  return (
                    <React.Fragment key={`${f.id}-${cIdx}`}>
                      <div
                        className="info-input-box absolute -translate-x-1/2 flex items-center justify-center font-bold text-[8px] text-slate-800"
                        style={{
                          left: `${centerX}mm`,
                          top: `${DEFAULT_OMR.info.inputY - renderOMR.infoBox.y}mm`,
                          width: '4.4mm',
                          height: '4.2mm'
                        }}
                      >
                        {printedChar && printedChar !== " " ? printedChar : ""}
                      </div>
                      {f.items.map((item, rIdx) => {
                        const centerY = DEFAULT_OMR.info.startY - renderOMR.infoBox.y + (rIdx * DEFAULT_OMR.info.rowH);
                        const isFilled = printedChar === item.toString();
                        return (
                          <div
                            key={`${f.id}-${cIdx}-${item}`}
                            className={`info-bubble absolute -translate-x-1/2 -translate-y-1/2 ${isFilled ? 'bubble-filled border-black print-border-black' : ''}`}
                            style={{ left: `${centerX}mm`, top: `${centerY}mm` }}
                          >
                            {item}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </React.Fragment>
        )}
      </div>

      <div
        className="absolute border-[2px] print-border bg-white"
        style={{ left: `${renderOMR.qBox.x}mm`, top: `${renderOMR.qBox.y}mm`, width: `${renderOMR.qBox.w}mm`, height: `${finalQBoxH}mm` }}
      >
        {isSplit && (
          <div
            className="absolute top-0 bottom-0 border-r-[1.5px] print-border"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          />
        )}

        {layoutItems.map((item, idx) => {
          const topY = item.y - renderOMR.qBox.y;

          if (item.type === 'header') {
            return (
              <div
                key={`h-${idx}`}
                className="absolute font-black text-[7.5px] tracking-wider uppercase text-center print-text print-bg py-0.5 border-t border-b print-border flex items-center justify-center -translate-y-1/2"
                style={{
                  left: `${item.cIdx * renderOMR.questions.colW + 1}mm`,
                  top: `${topY}mm`,
                  width: `${renderOMR.questions.colW - 2}mm`,
                  height: `${item.h}mm`
                }}
              >
                {item.text}
              </div>
            );
          }

          const qNumX = (item.cIdx * renderOMR.questions.colW) + (DEFAULT_OMR.questions as any).qNumOffset;

          return (
            <React.Fragment key={`q-${item.qIdx}`}>
              <div
                className="absolute font-bold text-[8px] print-text text-right -translate-y-1/2 flex items-center justify-end"
                style={{
                  left: `${qNumX}mm`,
                  top: `${topY}mm`,
                  width: '6mm'
                }}
              >
                {(item.localIdx ?? 0) + 1}.
              </div>

              {options.map((o, optIdx) => {
                const centerX = (item.cIdx * renderOMR.questions.colW) + renderOMR.questions.startXOffset + (optIdx * renderOMR.questions.bubbleGap);
                return (
                  <div
                    key={`${item.qIdx}-${o}`}
                    className="bubble absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${centerX}mm`, top: `${topY}mm` }}
                  >
                    {o}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface PrintTabProps {
  exam: Exam;
  updateExam: (updates: Partial<Exam>) => void;
  schoolStudents?: Student[];
  showAlert: (msg: string) => void;
}

export function PrintTab({ exam, updateExam: _updateExam, schoolStudents, showAlert }: PrintTabProps) {
  const [isColorMode, setIsColorMode] = useState(true);
  const [printFormat, setPrintFormat] = useState<'standard' | 'mebi'>('standard');
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [isPrinting, setIsPrinting] = useState(false);

  // Active student list (prioritizing master school roster)
  const effectiveStudentList = useMemo(() => {
    if (schoolStudents && schoolStudents.length > 0) return schoolStudents;
    return exam.studentList || [];
  }, [schoolStudents, exam.studentList]);

  // Zoom scale for preview: auto-adaptive for mobile/desktop
  const [previewScale, setPreviewScale] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 0.38;
    }
    return 0.6;
  });

  const availableClasses = useMemo(() => {
    if (!effectiveStudentList) return [];
    const classesList = effectiveStudentList.map(r => {
      const c = r.classStr && r.classStr !== "-" ? r.classStr : "";
      const s = r.sectionStr && r.sectionStr !== "-" ? r.sectionStr : "";
      if (!c && !s) return null;
      if (c && s) return `${c}/${s}`;
      return c || s;
    }).filter(Boolean) as string[];
    return [...new Set(classesList)].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [effectiveStudentList]);

  // Compute print students based on format and filter
  const printStudents = useMemo(() => {
    if (printFormat === 'standard') {
      return [null];
    }

    if (!effectiveStudentList || effectiveStudentList.length === 0) {
      return [];
    }

    if (selectedClassFilter === "ALL") {
      return effectiveStudentList;
    }

    return effectiveStudentList.filter(r => {
      const c = r.classStr && r.classStr !== "-" ? r.classStr : "";
      const s = r.sectionStr && r.sectionStr !== "-" ? r.sectionStr : "";
      const val = (c && s) ? `${c}/${s}` : (c || s || "");
      return val === selectedClassFilter;
    });
  }, [printFormat, effectiveStudentList, selectedClassFilter]);

  const handlePrint = () => {
    if (printFormat === 'mebi' && printStudents.length === 0) {
      showAlert("Yazdırılacak öğrenci bulunamadı. Lütfen önce Öğrenci Listesi sekmesinden öğrenci ekleyin veya sınıf filtresini değiştirin.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return showAlert("Lütfen tarayıcınızın açılır pencere (pop-up) engelleyicisine izin verin.");

    printWindow.document.open();
    printWindow.document.write('<!DOCTYPE html><html lang="tr"><head><title>Baskı Hazırlanıyor...</title><style>body{font-family:sans-serif;text-align:center;padding-top:20%;color:#475569;background:#f8fafc;}</style></head><body><h2>Optik Formlar Yazıcıya Gönderiliyor, lütfen bekleyin...</h2></body></html>');
    printWindow.document.close();

    setIsPrinting(true);

    setTimeout(() => {
      let printHTML = '<div id="print-wrapper">';
      document.querySelectorAll('.print-page-node').forEach(c => {
        const clone = c.cloneNode(true) as HTMLElement;
        clone.className = "a4-preview-container";
        printHTML += clone.outerHTML;
      });
      printHTML += '</div>';

      printWindow.document.head.innerHTML = '<title>Optik Form Baskı</title>';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(n => printWindow.document.head.appendChild(n.cloneNode(true)));

      const s = printWindow.document.createElement('style');
      s.innerHTML = `
        @page { size: A4 portrait; margin: 0 !important; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          width: 100% !important;
          height: 100% !important;
        }
        #print-wrapper {
          display: block;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        .a4-preview-container, .optik-page {
          width: 210mm !important;
          height: 296mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: white !important;
          box-sizing: border-box !important;
          border: none !important;
          box-shadow: none !important;
          zoom: 0.95 !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
          overflow: hidden !important;
          position: relative !important;
          top: 3mm !important;
        }
        .a4-preview-container:last-child, .optik-page:last-child {
          page-break-after: auto !important;
        }
        @-moz-document url-prefix() {
          .a4-preview-container, .optik-page {
            transform: scale(0.95) !important;
            transform-origin: top center !important;
          }
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `;
      printWindow.document.head.appendChild(s);
      printWindow.document.body.innerHTML = printHTML;

      setIsPrinting(false);

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }, 1200);
  };

  const totalPages = printStudents.length;

  return (
    <div className="flex flex-col h-full w-full no-print bg-slate-100 overflow-hidden">
      {/* Top Modern Header & Controls Card */}
      <div className="bg-white px-3.5 sm:px-6 py-3.5 shadow-xs border-b border-slate-200/80 shrink-0 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title and Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
              <Icons.Printer />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                  Optik Form Baskı & Önizleme
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {totalPages} {totalPages === 1 ? 'Sayfa' : 'Öğrenci'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                A4 standartlarında optik form şablonu • 4 köşe karekod ve siyah çapa uyumlu
              </p>
            </div>
          </div>

          {/* Primary Action & Print Button */}
          <div className="flex items-center gap-2 self-stretch lg:self-auto">
            <button
              onClick={handlePrint}
              disabled={isPrinting || totalPages === 0}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-xs shadow-emerald-600/30 transition-all cursor-pointer ${
                isPrinting || totalPages === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Icons.Printer />
              <span>{isPrinting ? 'Hazırlanıyor...' : `Yazdır (${totalPages} Sayfa)`}</span>
            </button>
          </div>
        </div>

        {/* Controls Toolbar (Format, Color Mode, Class Filter, Zoom) */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          {/* Format Selector: Standart (Boş) vs MEBİ (Karekodlu/Öğrencili) */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setPrintFormat('standard')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                printFormat === 'standard'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 Standart Boş Form
            </button>
            <button
              type="button"
              onClick={() => {
                if (!exam.studentList || exam.studentList.length === 0) {
                  showAlert("Öğrenci Listesi sekmesinde henüz öğrenci bulunmuyor. Yine de önizleme şablonu oluşturuldu.");
                }
                setPrintFormat('mebi');
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                printFormat === 'mebi'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👤 Kişiye Özel (MEBİ Karekodlu)
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Color Mode: Red/Color vs Black/White */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsColorMode(true)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isColorMode
                    ? 'bg-white text-red-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Kırmızı Optik Mürekkebi"
              >
                🔴 Renkli
              </button>
              <button
                type="button"
                onClick={() => setIsColorMode(false)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  !isColorMode
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Siyah-Beyaz Fotokopi Uyumu"
              >
                ⚫ S/B
              </button>
            </div>

            {/* Sınıf Filtresi (Sadece MEBİ modunda varsa aktif) */}
            {printFormat === 'mebi' && availableClasses.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
                <span className="text-slate-400 uppercase text-[10px] tracking-wider">Sınıf:</span>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="bg-transparent text-indigo-600 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tüm Liste ({exam.studentList?.length || 0})</option>
                  {availableClasses.map(c => <option key={c} value={c}>{c} Sınıfı</option>)}
                </select>
              </div>
            )}

            {/* Önizleme Yakınlaştırma (Scale Selector) */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-1 hidden sm:inline">Ölçek:</span>
              <button
                type="button"
                onClick={() => setPreviewScale(0.38)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  previewScale === 0.38 ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Mobil Cihaza Sığdır (%38)"
              >
                Sığdır
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(0.6)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  previewScale === 0.6 ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Orta Boyut (%60)"
              >
                Orta
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(0.85)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  previewScale === 0.85 ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Büyük Boyut (%85)"
              >
                Büyük
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Preview Container with Responsive Scaling */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 md:p-8 flex flex-col items-center custom-scrollbar">
        {printStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 max-w-sm text-center border border-slate-200 shadow-xs my-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Icons.Users />
            </div>
            <h4 className="font-bold text-slate-800 text-base mb-1">
              Öğrenci Kaydı Bulunamadı
            </h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Seçilen sınıf filtresinde öğrenci bulunmuyor veya henüz öğrenci listesi yüklemediniz.
            </p>
            <button
              onClick={() => setPrintFormat('standard')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Standart Boş Formu Göster
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 items-center w-full max-w-5xl">
            {/* Format info pill banner */}
            <div className="bg-white/80 backdrop-blur-xs px-4 py-2 rounded-xl border border-slate-200/80 text-xs text-slate-600 shadow-2xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                {printFormat === 'standard'
                  ? 'Boş Standart Optik Form (Tüm öğrenciler için ortak çoğaltılabilir)'
                  : `Kişiye Özel MEBİ Karekodlu Form (${printStudents.length} Öğrenci hazırlandı)`}
              </span>
            </div>

            {/* A4 Form Preview Box */}
            {printStudents.slice(0, 3).map((student, idx) => (
              <div
                key={`preview-${idx}`}
                className="rounded-xl overflow-hidden shadow-xl border border-slate-300/80 bg-white flex flex-col items-center"
              >
                {printFormat === 'mebi' && student && (
                  <div className="w-full bg-slate-800 text-white text-xs font-bold px-4 py-2 flex items-center justify-between">
                    <span>{idx + 1}. Form: {student.name}</span>
                    <span className="text-slate-400 font-mono">No: {student.no}</span>
                  </div>
                )}
                <div
                  className="a4-preview-container origin-top transform-gpu"
                  style={{
                    transform: `scale(var(--preview-scale, ${previewScale}))`,
                    marginBottom: `calc((297mm * ${previewScale}) - 297mm)`
                  }}
                >
                  <PrintLayout exam={exam} isColorMode={isColorMode} student={student} />
                </div>
              </div>
            ))}

            {/* More forms notification */}
            {printStudents.length > 3 && (
              <div className="p-4 sm:p-5 bg-white border border-blue-200 text-blue-800 rounded-2xl text-center w-full max-w-[210mm] shadow-xs flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icons.List />
                </div>
                <h4 className="font-bold text-sm sm:text-base">
                  + {printStudents.length - 3} Öğrencinin Formu Daha Var
                </h4>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  Cihaz performansını ve akıcılığı korumak için önizlemede ilk 3 form listelenir.<br />
                  <b>"Yazdır"</b> butonuna bastığınızda {printStudents.length} sayfanın tümü baskı penceresine aktarılacaktır.
                </p>
                <button
                  onClick={handlePrint}
                  className="mt-1 px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Icons.Printer />
                  <span>Hepsini Yazdır ({printStudents.length} Sayfa)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hidden Container for Actual Print Cloning */}
        {isPrinting && (
          <div className="hidden">
            {printStudents.map((student, idx) => (
              <div key={`print-node-${idx}`} className="print-page-node">
                <PrintLayout exam={exam} isColorMode={isColorMode} student={student} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
