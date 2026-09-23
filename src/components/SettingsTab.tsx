import React, { useState, useRef } from 'react';
import { Exam, Subject } from '../types';
import { Icons } from './Icons';
import { getTotalQuestions } from '../constants';

interface SettingsTabProps {
  exam: Exam;
  updateExam: (updates: Partial<Exam>) => void;
  exams: Exam[];
  activeExamId: number;
  setActiveExamId: (id: number) => void;
  handleCreateExam: () => void;
  handleDeleteExam: (id: number) => void;
  handleCloneExam?: (id?: number) => void;
  handleExportSingleExam?: (id?: number) => void;
  handleExportData: () => void;
  handleImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showAlert: (msg: string) => void;
  showConfirm: (msg: string, onConfirm: () => void) => void;
}

interface TemplatePreset {
  id: string;
  name: string;
  badge: string;
  desc: string;
  subjects: Subject[];
  optionsCount: number;
  penalty: number;
  layoutType: 'standard' | 'split';
  format?: string;
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: 'lgs-mebi',
    name: 'LGS Denemesi',
    badge: '90 Soru',
    desc: 'Türkçe, İnkılap, Din, İngilizce, Mat, Fen (Sözel & Sayısal)',
    optionsCount: 4,
    penalty: 3,
    layoutType: 'split',
    format: 'lgs',
    subjects: [
      { id: 1, name: 'Türkçe', count: 20, section: 1 },
      { id: 2, name: 'T.C. İnkılap', count: 10, section: 1 },
      { id: 3, name: 'Din Kültürü', count: 10, section: 1 },
      { id: 4, name: 'İngilizce', count: 10, section: 1 },
      { id: 5, name: 'Matematik', count: 20, section: 2 },
      { id: 6, name: 'Fen Bilimleri', count: 20, section: 2 }
    ]
  },
  {
    id: 'tyt-120',
    name: 'TYT Denemesi (ÖSYM YKS)',
    badge: '120 Soru (5 Şık)',
    desc: 'Türkçe (40), Sosyal Bilimler (20), Temel Matematik (40), Fen Bilimleri (20)',
    optionsCount: 5,
    penalty: 4,
    layoutType: 'standard',
    format: 'tyt',
    subjects: [
      { id: 1, name: 'Türkçe', count: 40, section: 1 },
      { id: 2, name: 'Sosyal Bilimler', count: 20, section: 2 },
      { id: 3, name: 'Temel Matematik', count: 40, section: 3 },
      { id: 4, name: 'Fen Bilimleri', count: 20, section: 4 }
    ]
  },
  {
    id: 'ayt-80',
    name: 'AYT Alan Denemesi (ÖSYM YKS)',
    badge: '80 Soru (5 Şık)',
    desc: 'Türk Dili ve Ed.-Sos-1 (40), Matematik (40) [Sayısal & Eşit Ağırlık]',
    optionsCount: 5,
    penalty: 4,
    layoutType: 'standard',
    format: 'ayt',
    subjects: [
      { id: 1, name: 'T.Dili ve Ed. - Sos-1', count: 40, section: 1 },
      { id: 2, name: 'Matematik', count: 40, section: 3 }
    ]
  },
  {
    id: 'ayt-160',
    name: 'AYT 4 Testlik Genel Deneme (ÖSYM YKS)',
    badge: '160 Soru (4 Test - 5 Şık)',
    desc: 'Edebiyat-Sos-1 (40), Sosyal-2 (40), Matematik (40), Fen Bilimleri (40)',
    optionsCount: 5,
    penalty: 4,
    layoutType: 'standard',
    format: 'ayt',
    subjects: [
      { id: 1, name: 'T.Dili ve Ed. - Sos-1', count: 40, section: 1 },
      { id: 2, name: 'Sosyal Bilimler-2', count: 40, section: 2 },
      { id: 3, name: 'Matematik', count: 40, section: 3 },
      { id: 4, name: 'Fen Bilimleri', count: 40, section: 4 }
    ]
  },
  {
    id: 'single-20',
    name: 'Tek Ders Testi',
    badge: '20 Soru',
    desc: 'Tek branş tarama sınavı, 4 şıklı',
    optionsCount: 4,
    penalty: 3,
    layoutType: 'standard',
    format: 'mebi',
    subjects: [
      { id: 1, name: 'Ders Adı', count: 20, section: 1 }
    ]
  },
  {
    id: 'middle-40',
    name: '4 Ders Branş Denemesi',
    badge: '40 Soru',
    desc: 'Türkçe, Mat, Fen, Sosyal (10\'ar soru)',
    optionsCount: 4,
    penalty: 3,
    layoutType: 'standard',
    format: 'mebi',
    subjects: [
      { id: 1, name: 'Türkçe', count: 10, section: 1 },
      { id: 2, name: 'Matematik', count: 10, section: 1 },
      { id: 3, name: 'Fen Bilimleri', count: 10, section: 1 },
      { id: 4, name: 'Sosyal Bilgiler', count: 10, section: 1 }
    ]
  },
  {
    id: 'high-25',
    name: 'Lise / YKS Formatı',
    badge: '25 Soru (5 Şık)',
    desc: '5 şıklı, 4 yanlış 1 doğru kuralı',
    optionsCount: 5,
    penalty: 4,
    layoutType: 'standard',
    format: 'mebi',
    subjects: [
      { id: 1, name: 'Branş Testi', count: 25, section: 1 }
    ]
  }
];

export function SettingsTab({
  exam,
  updateExam,
  exams,
  activeExamId,
  setActiveExamId,
  handleCreateExam,
  handleDeleteExam,
  handleCloneExam,
  handleExportSingleExam,
  handleExportData,
  handleImportData,
  showAlert,
  showConfirm
}: SettingsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalQ = getTotalQuestions(exam.subjects);
  const [examSearch, setExamSearch] = useState('');
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showTemplatePickerModal, setShowTemplatePickerModal] = useState(false);

  // Hafıza kullanım hesabı
  const storageUsedBytes = typeof window !== 'undefined' ? (localStorage.getItem('omr_exams_v54_unified')?.length || 0) * 2 : 0;
  const storageUsedKb = (storageUsedBytes / 1024).toFixed(1);
  const storagePercent = Math.min(100, (storageUsedBytes / (5 * 1024 * 1024)) * 100).toFixed(1);

  const activeTemplate = TEMPLATES.find(tpl =>
    exam.optionsCount === tpl.optionsCount &&
    exam.layoutType === tpl.layoutType &&
    exam.format === tpl.format &&
    exam.subjects.length === tpl.subjects.length
  );

  const handleAddSubject = () => {
    if (totalQ >= 160) return showAlert("Sistem maksimum 160 soru desteklemektedir.");
    const newId = Date.now();
    updateExam({
      subjects: [
        ...exam.subjects,
        { id: newId, name: `Ders ${exam.subjects.length + 1}`, count: Math.min(10, 160 - totalQ), section: 1 }
      ]
    });
  };

  const handleUpdateSubject = (id: number, field: string, value: any) => {
    if (field === 'count') {
      const parsed = Math.max(1, parseInt(value, 10) || 1);
      const otherSubjectsQ = exam.subjects.filter(s => s.id !== id).reduce((sum, s) => sum + s.count, 0);
      if (otherSubjectsQ + parsed > 160) {
        showAlert("Toplam soru sayısı 160'ı geçemez! Optik form sınırlarına sığmayacaktır.");
        return;
      }
      updateExam({
        subjects: exam.subjects.map(s => (s.id === id ? { ...s, count: parsed } : s))
      });
      return;
    }
    updateExam({
      subjects: exam.subjects.map(s => (s.id === id ? { ...s, [field]: value } : s))
    });
  };

  const adjustSubjectCount = (id: number, delta: number) => {
    const sub = exam.subjects.find(s => s.id === id);
    if (!sub) return;
    const newCount = sub.count + delta;
    if (newCount < 1) return;
    const otherSubjectsQ = exam.subjects.filter(s => s.id !== id).reduce((sum, s) => sum + s.count, 0);
    if (otherSubjectsQ + newCount > 160) {
      showAlert("Toplam soru sayısı 160'ı geçemez.");
      return;
    }
    updateExam({
      subjects: exam.subjects.map(s => (s.id === id ? { ...s, count: newCount } : s))
    });
  };

  const handleRemoveSubject = (id: number) => {
    if (exam.subjects.length <= 1) return showAlert("Sınavda en az bir ders bulunmalıdır.");
    updateExam({ subjects: exam.subjects.filter(s => s.id !== id) });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      updateExam({ logo: (evt.target?.result as string) || null });
      showAlert("Kurum logosu başarıyla güncellendi.");
    };
    reader.readAsDataURL(file);
  };

  const handleApplyTemplate = (tpl: TemplatePreset) => {
    showConfirm(`"${tpl.name}" şablonunu uygulamak istediğinize emin misiniz? Mevcut ders listesi ve soru adetleri güncellenecektir.`, () => {
      updateExam({
        optionsCount: tpl.optionsCount,
        penalty: tpl.penalty,
        layoutType: tpl.layoutType,
        format: tpl.format,
        subjects: tpl.subjects.map((s, idx) => ({ ...s, id: Date.now() + idx }))
      });
      setShowTemplatePickerModal(false);
      showAlert(`"${tpl.name}" şablonu başarıyla uygulandı!`);
    });
  };

  return (
    <div className="space-y-4 no-print w-full max-w-4xl mx-auto pb-16">
      {/* 1. ÜST KONTROL ŞERİDİ: Aktif Sınav & Hızlı İşlemler */}
      <div id="exam-control-bar" className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-3 sm:p-4 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sol Taraf: Aktif Sınav Özeti & Hızlı Seçim */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowExamsModal(true)}
              className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer group active:scale-95"
              title="Sınav listesini aç ve sınav değiştir"
            >
              <span className="group-hover:scale-110 transition-transform">
                <Icons.Folder />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowExamsModal(true)}
                  className="font-extrabold text-sm sm:text-base text-slate-900 hover:text-blue-600 flex items-center gap-1.5 text-left transition-colors cursor-pointer group truncate max-w-full"
                  title="Sınavı değiştirmek veya listeyi görmek için tıklayın"
                >
                  <span className="truncate">{exam.name}</span>
                  <span className="text-slate-400 group-hover:text-blue-600 text-xs shrink-0 transition-transform group-hover:translate-x-0.5">
                    ▾
                  </span>
                </button>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif Sınav
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="font-bold text-slate-700">{totalQ} Soru</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-600">{exam.results.length} Okunan Form</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{exams.length} Kayıtlı Sınav</span>
              </div>
            </div>
          </div>

          {/* Sağ Taraf: Eylem Butonları */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-end shrink-0 flex-wrap sm:flex-nowrap">
            {/* Sınav Yönetimi / Değiştir */}
            <button
              type="button"
              onClick={() => setShowExamsModal(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-blue-700 border border-slate-200/90 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Tüm kayıtlı sınavları listele ve yönet"
            >
              <Icons.Folder />
              <span>Sınavlar</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-bold">
                {exams.length}
              </span>
            </button>

            {/* Sınavı Klonla */}
            {handleCloneExam && (
              <button
                type="button"
                onClick={() => handleCloneExam(exam.id)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Mevcut sınavın yapısını kopyalayarak yeni bir sınav oluştur"
              >
                <Icons.Copy />
                <span>Klonla</span>
              </button>
            )}

            {/* Veri Yedekle / Yükle */}
            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Sınav yedeğini indir veya geri yükle"
            >
              <Icons.Download />
              <span>Yedekle</span>
            </button>

            {/* Yeni Sınav */}
            <button
              type="button"
              onClick={handleCreateExam}
              className="px-3 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs shadow-blue-500/20 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Yeni boş sınav oluştur"
            >
              <Icons.Plus />
              <span>Yeni Sınav</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PUANLAMA VE OPTİK FORM KURALLARI (Temel Ayarlar - Doğrudan Görünür & İnteraktif) */}
      <div id="scoring-rules-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 transition-all space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-200/80 text-violet-600 flex items-center justify-center shrink-0 shadow-xs">
              <Icons.Sliders />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">Puanlama ve Optik Form Kuralları</h4>
              <p className="text-xs text-slate-500 font-medium">Net hesaplama standardı, şık sayısı ve sayfa yerleşim düzeni</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Anında Kaydedilir
          </span>
        </div>

        {/* 4 Kolonlu Kural Kontrolleri */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Sınav Şablonu (Hızlı Şablon Seçimi) */}
          <div className="p-3 bg-gradient-to-b from-amber-50/80 to-amber-50/30 rounded-xl border border-amber-200/90 flex flex-col justify-between gap-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <Icons.Sparkles />
                <span>Sınav Şablonu</span>
              </span>
              {activeTemplate ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300/80 font-mono truncate max-w-[85px]">
                  {activeTemplate.badge}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                  {totalQ} Soru
                </span>
              )}
            </div>

            <div className="relative">
              <select
                value={activeTemplate ? activeTemplate.id : "custom"}
                onChange={(e) => {
                  if (e.target.value === "custom") return;
                  const selectedTpl = TEMPLATES.find(t => t.id === e.target.value);
                  if (selectedTpl) handleApplyTemplate(selectedTpl);
                }}
                className="w-full bg-white border border-amber-300/90 hover:border-amber-400 text-slate-900 text-xs font-bold py-1.5 pl-2.5 pr-7 rounded-lg shadow-2xs outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer transition-all appearance-none"
              >
                <option value="custom" disabled={!activeTemplate}>
                  {activeTemplate ? `✓ ${activeTemplate.name}` : `Özel Dağılım (${totalQ} Soru)`}
                </option>
                <optgroup label="Hazır Şablonlar">
                  {TEMPLATES.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.badge})
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-amber-600">
                <Icons.ChevronDown />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-amber-900 font-medium">
              <span className="truncate">{activeTemplate ? activeTemplate.name : "Özel Soru Dağılımı"}</span>
              <button
                type="button"
                onClick={() => setShowTemplatePickerModal(true)}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-950 underline underline-offset-2 shrink-0 cursor-pointer"
              >
                İncele
              </button>
            </div>
          </div>

          {/* 2. Yanlış Kuralı */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Yanlış Kuralı</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                {exam.penalty === 0 ? 'Düşmez' : `${exam.penalty}Y = 1D`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => updateExam({ penalty: 0 })}
                className={`py-1.5 px-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center active:scale-95 ${
                  exam.penalty === 0
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Yanlışlar doğruyu eksiltmez"
              >
                Düşmez
              </button>
              <button
                type="button"
                onClick={() => updateExam({ penalty: 3 })}
                className={`py-1.5 px-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center active:scale-95 ${
                  exam.penalty === 3
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="3 Yanlış 1 Doğru (LGS standardı)"
              >
                3Y 1D
              </button>
              <button
                type="button"
                onClick={() => updateExam({ penalty: 4 })}
                className={`py-1.5 px-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center active:scale-95 ${
                  exam.penalty === 4
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="4 Yanlış 1 Doğru (YKS standardı)"
              >
                4Y 1D
              </button>
            </div>
            <span className="text-[10px] text-slate-400 text-center">
              {exam.penalty === 0 ? 'Net = Doğru sayısı' : exam.penalty === 3 ? 'LGS / Ortaokul standardı' : 'YKS / Lise standardı'}
            </span>
          </div>

          {/* 3. Şık Sayısı */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Şık Sayısı</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 font-mono">
                {exam.optionsCount} Seçenek
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => updateExam({ optionsCount: 4 })}
                className={`py-1.5 px-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center active:scale-95 ${
                  exam.optionsCount === 4
                    ? 'bg-violet-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="4 Seçenek (A, B, C, D)"
              >
                4 Şık (A-D)
              </button>
              <button
                type="button"
                onClick={() => updateExam({ optionsCount: 5 })}
                className={`py-1.5 px-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center active:scale-95 ${
                  exam.optionsCount === 5
                    ? 'bg-violet-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="5 Seçenek (A, B, C, D, E)"
              >
                5 Şık (A-E)
              </button>
            </div>
            <span className="text-[10px] text-slate-400 text-center">
              {exam.optionsCount === 4 ? 'İlkokul / Ortaokul / LGS' : 'Lise / YKS / TYT-AYT'}
            </span>
          </div>

          {/* 4. Sayfa Düzeni */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sayfa Düzeni</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                {exam.layoutType === 'split' ? '2 Bölüm' : 'Tek Parça'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => updateExam({ layoutType: 'standard' })}
                className={`py-1.5 px-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center active:scale-95 ${
                  exam.layoutType !== 'split'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Dersler tek bir optik blok halinde dizilir"
              >
                Tek Parça
              </button>
              <button
                type="button"
                onClick={() => updateExam({ layoutType: 'split' })}
                className={`py-1.5 px-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center active:scale-95 ${
                  exam.layoutType === 'split'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Sözel ve Sayısal olarak 2 ayrı bölüme ayrılır"
              >
                İki Parça
              </button>
            </div>
            <span className="text-[10px] text-slate-400 text-center">
              {exam.layoutType === 'split' ? 'Sözel & Sayısal 2 Oturum' : 'Standart sıralı liste'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SINAV VE KURUM BİLGİLERİ */}
      <div id="general-settings-section" className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 transition-all">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
              <Icons.BookOpen />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">Sınav ve Kurum Bilgileri</h4>
              <p className="text-xs text-slate-500 font-medium">Optik form başlıklarında ve karnelerde görüntülenecek resmi bilgiler</p>
            </div>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="sm:col-span-2 md:col-span-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Sınav Adı</label>
            <input
              type="text"
              value={exam.name}
              onChange={(e) => updateExam({ name: e.target.value })}
              placeholder="Örn: 8. Sınıf LGS Deneme 1"
              className="w-full px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-800 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Kurum / Okul Adı</label>
            <input
              type="text"
              value={exam.institution || ""}
              onChange={(e) => updateExam({ institution: e.target.value })}
              placeholder="Örn: Kırklareli Atatürk Ortaokulu"
              className="w-full px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-800 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Uygulama Tarihi</label>
            <input
              type="text"
              value={exam.date || ""}
              onChange={(e) => updateExam({ date: e.target.value })}
              placeholder="GG.AA.YYYY"
              className="w-full px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-indigo-500 rounded-xl font-bold text-xs text-slate-800 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-2xs font-mono"
            />
          </div>
        </div>

        {/* Kurum Logosu Alanı */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/70">
          <div className="flex items-center gap-3">
            {exam.logo ? (
              <div className="w-12 h-12 rounded-xl border border-slate-200 p-1.5 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                <img src={exam.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white border border-dashed border-slate-300 text-slate-400 flex items-center justify-center shrink-0 text-base shadow-2xs">
                <Icons.Image />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Kurum Logosu</span>
                {exam.logo ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ Yüklendi
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                    İsteğe Bağlı
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Optik form üst başlığında ve karne raporlarında görüntülenir (PNG / JPG)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              <Icons.Image /> <span>{exam.logo ? "Değiştir" : "Logo Yükle"}</span>
            </button>
            {exam.logo && (
              <button
                onClick={() => updateExam({ logo: null })}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer border border-transparent hover:border-red-200 active:scale-95"
              >
                Kaldır
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </div>
        </div>
      </div>

      {/* 4. DERSLER VE SORU SAYILARI KARTI */}
      <div id="question-distribution-section" className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 transition-all space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <Icons.List />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">Ders Dağılımı ve Soru Sayıları</h4>
                <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200/90 shadow-2xs">
                  {totalQ} / 160 Soru
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Sınavdaki dersleri adlandırın ve soru sayılarını ayarlayın</p>
            </div>
          </div>

          <button
            onClick={handleAddSubject}
            disabled={totalQ >= 160}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
              totalQ >= 160
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <Icons.Plus /> <span>Yeni Ders Ekle</span>
          </button>
        </div>

        {/* Ders Listesi */}
        <div className="space-y-2">
          {exam.subjects.map((sub, idx) => (
            <div
              key={sub.id}
              className="p-2.5 sm:p-3 bg-slate-50/70 hover:bg-slate-100/60 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0 shadow-2xs font-mono">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => handleUpdateSubject(sub.id, 'name', e.target.value)}
                  placeholder="Ders Adı"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200/90 focus:border-blue-500 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center gap-2 justify-between sm:justify-end">
                {/* İki Parçalı Sınavlar İçin Sözel/Sayısal Bölüm Seçici */}
                {exam.layoutType === 'split' && (
                  <div className="flex items-center bg-slate-200/70 rounded-lg p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleUpdateSubject(sub.id, 'section', 1)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-bold ${
                        sub.section === 1 ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sözel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateSubject(sub.id, 'section', 2)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-bold ${
                        sub.section === 2 ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sayısal
                    </button>
                  </div>
                )}

                {/* Soru Sayısı Stepper (+ / -) Dokunmatik Kontrolü */}
                <div className="flex items-center bg-white border border-slate-300/80 rounded-xl overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => adjustSubjectCount(sub.id, -1)}
                    disabled={sub.count <= 1}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-30 cursor-pointer active:scale-90"
                    title="1 Soru Azalt"
                  >
                    <Icons.Minus />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="160"
                    value={sub.count}
                    onChange={(e) => handleUpdateSubject(sub.id, 'count', e.target.value)}
                    className="w-11 text-center text-xs font-black font-mono text-blue-700 focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => adjustSubjectCount(sub.id, 1)}
                    disabled={totalQ >= 160}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-30 cursor-pointer active:scale-90"
                    title="1 Soru Arttır"
                  >
                    <Icons.Plus />
                  </button>
                </div>

                {/* Dersi Sil Butonu */}
                <button
                  type="button"
                  onClick={() => handleRemoveSubject(sub.id)}
                  title={exam.subjects.length <= 1 ? "En az bir ders bulunmalıdır" : "Dersi Sil"}
                  disabled={exam.subjects.length <= 1}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-90 border ${
                    exam.subjects.length <= 1
                      ? 'text-slate-300 border-transparent cursor-not-allowed'
                      : 'text-slate-400 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-200'
                  }`}
                >
                  <Icons.Trash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: SINAV YÖNETİMİ DİYALOĞU */}
      {showExamsModal && (
        <div
          className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowExamsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Icons.Folder />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Kayıtlı Sınavlar</h3>
                  <p className="text-xs text-slate-500">Geçiş yapmak istediğiniz sınavı seçin veya yeni sınav oluşturun</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExamsModal(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 custom-scrollbar bg-slate-50/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={examSearch}
                    onChange={e => setExamSearch(e.target.value)}
                    placeholder="Sınav adına göre ara..."
                    className="w-full text-xs pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all shadow-2xs"
                  />
                  <div className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none text-xs">
                    <Icons.Search />
                  </div>
                  {examSearch && (
                    <button
                      onClick={() => setExamSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleCreateExam();
                    setShowExamsModal(false);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs shadow-blue-500/20 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <Icons.Plus /> <span>Yeni Sınav Ekle</span>
                </button>
              </div>

              {/* Sınav Kartları Listesi */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {exams
                  .filter(e => !examSearch || e.name.toLowerCase().includes(examSearch.toLowerCase()))
                  .map(e => {
                    const isActive = e.id === activeExamId;
                    const qCount = e.subjects?.reduce((sum, s) => sum + s.count, 0) || 0;

                    return (
                      <div
                        key={e.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isActive
                            ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black text-slate-900">{e.name}</span>
                            {isActive ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                                ✓ Aktif Sınav
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveExamId(e.id);
                                  setShowExamsModal(false);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                Bu Sınava Geç
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span>{e.subjects?.length || 0} Ders</span>
                            <span>•</span>
                            <span>{qCount} Soru</span>
                            <span>•</span>
                            <span className="font-semibold text-blue-600">{e.results?.length || 0} Okunmuş Form</span>
                            {e.date && (
                              <>
                                <span>•</span>
                                <span>{e.date}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          {handleCloneExam && (
                            <button
                              type="button"
                              onClick={() => {
                                handleCloneExam(e.id);
                                setShowExamsModal(false);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95"
                              title="Bu sınavı klonla"
                            >
                              <Icons.Copy />
                            </button>
                          )}
                          {handleExportSingleExam && (
                            <button
                              type="button"
                              onClick={() => handleExportSingleExam(e.id)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95"
                              title="Bu sınavı JSON olarak indir"
                            >
                              <Icons.Download />
                            </button>
                          )}
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveExamId(e.id);
                                setShowExamsModal(false);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all cursor-pointer active:scale-95"
                            >
                              Seç
                            </button>
                          )}
                          {exams.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteExam(e.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 transition-all cursor-pointer active:scale-95"
                              title="Bu sınavı sil"
                            >
                              <Icons.Trash />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {exams.filter(e => !examSearch || e.name.toLowerCase().includes(examSearch.toLowerCase())).length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                    "{examSearch}" ile eşleşen sınav bulunamadı.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">Toplam {exams.length} / 50 Sınav</span>
              <button
                type="button"
                onClick={() => setShowExamsModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer active:scale-95 shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VERİ YEDEKLEME & AKTARMA DİYALOĞU */}
      {showBackupModal && (
        <div
          className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowBackupModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Icons.Download />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Veri Yedekleme & Aktarma</h3>
                  <p className="text-xs text-slate-500">Sınavlarınızı bilgisayarınıza kaydedin veya geri yükleyin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Aktif Sınavı İndir */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
                <div className="text-xs font-bold text-blue-950 flex items-center justify-between">
                  <span>Aktif Sınav Yedeği</span>
                  <span className="text-[10px] font-mono text-blue-700 font-bold">{exam.name}</span>
                </div>
                <p className="text-[11px] text-blue-800/80">
                  Sadece seçili aktif sınavın ayarlarını, cevap anahtarını ve öğrenci sonuçlarını tek dosya olarak indirir.
                </p>
                <button
                  type="button"
                  onClick={() => handleExportSingleExam?.(activeExamId)}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Icons.Download /> <span>Aktif Sınavı İndir (JSON)</span>
                </button>
              </div>

              {/* Tüm Sınavları Yedekle / Geri Yükle */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-800">
                  Tüm Sistem Verisi ({exams.length} Sınav)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
                  >
                    <Icons.Download /> <span>Tümünü Yedekle</span>
                  </button>
                  <label className="py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95 select-none">
                    <Icons.Upload /> <span>Yedek Yükle</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        handleImportData(e);
                        setShowBackupModal(false);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Hafıza Durumu */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Tarayıcı Hafıza Kullanımı</span>
                  </span>
                  <span className="font-mono text-emerald-800 text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                    {storageUsedKb} KB (%{storagePercent})
                  </span>
                </div>
                <div className="w-full h-1.5 bg-emerald-200/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(2, Number(storagePercent) || 0))}%` }}
                  />
                </div>
              </div>

              {/* Aktif Sınavı Sil (Varsa) */}
              {exams.length > 1 && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Aktif sınavı kalıcı olarak sil:</span>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteExam(activeExamId);
                      setShowBackupModal(false);
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200/60 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Icons.Trash /> <span>Aktif Sınavı Sil</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRATİK SINAV ŞABLONLARI DİYALOĞU */}
      {showTemplatePickerModal && (
        <div
          className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowTemplatePickerModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <Icons.Sparkles />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-800 tracking-tight">Pratik Sınav Şablonları</h3>
                    {activeTemplate && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80">
                        Aktif: {activeTemplate.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Tek tıkla hazır ders dağılımı, soru formatı ve puanlama kuralı uygulayın</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatePickerModal(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal Body: Şablon Listesi */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEMPLATES.map(tpl => {
                  const isCurrent =
                    exam.optionsCount === tpl.optionsCount &&
                    exam.layoutType === tpl.layoutType &&
                    exam.format === tpl.format &&
                    exam.subjects.length === tpl.subjects.length;

                  const tplTotalQ = tpl.subjects.reduce((sum, s) => sum + s.count, 0);

                  return (
                    <div
                      key={tpl.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                            {tpl.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                              {tpl.badge}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ Aktif
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mt-1">
                          <span>{tpl.optionsCount} Şık</span>
                          <span>•</span>
                          <span>{tpl.penalty > 0 ? `${tpl.penalty}Y = 1D` : 'Net Düşmez'}</span>
                          <span>•</span>
                          <span>{tpl.layoutType === 'split' ? '2 Parça (Sözel/Sayısal)' : 'Tek Parça'}</span>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap mt-2.5">
                          {tpl.subjects.map((sub, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono"
                            >
                              {sub.name}: <strong className="text-amber-800 font-bold">{sub.count}</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className={`w-full py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs ${
                          isCurrent
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-500/15'
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <Icons.CheckCircle />
                            <span>Yeniden Uygula</span>
                          </>
                        ) : (
                          <>
                            <Icons.Sparkles />
                            <span>Şablonu Uygula ({tplTotalQ} Soru)</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">Toplam {TEMPLATES.length} Hazır Şablon</span>
              <button
                type="button"
                onClick={() => setShowTemplatePickerModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer active:scale-95 shadow-2xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
