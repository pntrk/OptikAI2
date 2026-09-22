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
    name: 'MEBİ / LGS Denemesi',
    badge: '90 Soru',
    desc: 'Türkçe, İnkılap, Din, İngilizce, Mat, Fen (Sözel & Sayısal)',
    optionsCount: 4,
    penalty: 3,
    layoutType: 'split',
    format: 'mebi',
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
    id: 'single-20',
    name: 'Tek Ders Testi',
    badge: '20 Soru',
    desc: 'Tek branş tarama sınavı, 4 şıklı',
    optionsCount: 4,
    penalty: 3,
    layoutType: 'standard',
    format: 'standard',
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
    format: 'standard',
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
    format: 'standard',
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
  const [isExamsOpen, setIsExamsOpen] = useState(false);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

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
    if (totalQ >= 100) return showAlert("Sistem maksimum 100 soru desteklemektedir.");
    const newId = Date.now();
    updateExam({
      subjects: [
        ...exam.subjects,
        { id: newId, name: `Ders ${exam.subjects.length + 1}`, count: Math.min(10, 100 - totalQ), section: 1 }
      ]
    });
  };

  const handleUpdateSubject = (id: number, field: string, value: any) => {
    if (field === 'count') {
      const parsed = Math.max(1, parseInt(value, 10) || 1);
      const otherSubjectsQ = exam.subjects.filter(s => s.id !== id).reduce((sum, s) => sum + s.count, 0);
      if (otherSubjectsQ + parsed > 100) {
        showAlert("Toplam soru sayısı 100'ü geçemez! Optik form sınırlarına sığmayacaktır.");
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
    if (otherSubjectsQ + newCount > 100) {
      showAlert("Toplam soru sayısı 100'ü geçemez.");
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
    showConfirm(`"${tpl.name}" şablonunu uygulamak istediğinize emin misiniz? Mevcut ders listesi güncellenecektir.`, () => {
      updateExam({
        optionsCount: tpl.optionsCount,
        penalty: tpl.penalty,
        layoutType: tpl.layoutType,
        format: tpl.format,
        subjects: tpl.subjects.map((s, idx) => ({ ...s, id: Date.now() + idx }))
      });
      showAlert(`"${tpl.name}" şablonu başarıyla uygulandı!`);
    });
  };

  return (
    <div className="space-y-5 no-print w-full max-w-4xl mx-auto pb-20">
      {/* 1. Sınav Seçimi & Yönetimi Kartı (Tıklandıkça Aşağı Açılan Görünüm & Modal Yapısı) */}
      <div id="exam-management-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
        {/* Tıklanabilir Üst Çubuk (Trigger Header) */}
        <div
          onClick={() => setIsExamsOpen(!isExamsOpen)}
          className="p-3.5 sm:p-4.5 bg-gradient-to-r from-blue-50/70 via-sky-50/30 to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-blue-50/90 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Icons.Folder />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-slate-800 tracking-tight">Sınav Seçimi & Yönetimi</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  Aktif: {exam.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {exam.results.length} Okunmuş Form
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                  {exams.length} Kayıtlı Sınav
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Aktif sınavı seçin, yeni sınav oluşturun veya verileri yedekleyin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowExamsModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Sınav yönetimini modal pencerede aç"
            >
              <Icons.Folder />
              <span className="hidden sm:inline">Pencerede Aç</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExamsOpen(!isExamsOpen)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95 ${
                isExamsOpen
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span>{isExamsOpen ? 'Yönetimi Gizle' : 'Sınavları Yönet'}</span>
              <span className={`transform transition-transform duration-200 ${isExamsOpen ? 'rotate-180' : 'rotate-0'}`}>
                <Icons.ChevronDown />
              </span>
            </button>
          </div>
        </div>

        {/* Tıklandığında Aşağı Listelenen Yönetim Alanı (Accordion Body) */}
        {isExamsOpen && (
          <div className="p-3.5 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">
                Kayıtlı sınavlar arasında geçiş yapabilir, yeni sınav ekleyebilir veya verilerinizi yedekleyebilirsiniz:
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCloneExam?.(exam.id)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Mevcut sınavın ders yapısını ve cevap anahtarını kopyalayarak yeni bir sınav oluştur"
                >
                  <Icons.Copy /> <span>Sınavı Klonla</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateExam}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs shadow-blue-500/20 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <Icons.Plus /> <span>Yeni Sınav</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Kayıtlı Sınavlar ({exams.length} / 50)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Hafıza: {storageUsedKb} KB
                  </span>
                </div>

                {/* Sınav Arama Kutusu */}
                {exams.length > 2 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={examSearch}
                      onChange={e => setExamSearch(e.target.value)}
                      placeholder="Sınav adına göre ara..."
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 text-slate-800 transition-all"
                    />
                    {examSearch && (
                      <button
                        onClick={() => setExamSearch('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                <div className="relative">
                  <select
                    value={activeExamId}
                    onChange={(e) => setActiveExamId(Number(e.target.value))}
                    className="w-full appearance-none px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer pr-10 transition-all shadow-2xs"
                  >
                    {exams.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} • {e.results.length} Okunmuş Form {e.id === activeExamId ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3.5 pointer-events-none text-slate-400">
                    <Icons.ChevronDown />
                  </div>
                </div>

                {/* Sınav Kartları Hızlı Listesi */}
                <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  {exams
                    .filter(e => !examSearch || e.name.toLowerCase().includes(examSearch.toLowerCase()))
                    .map(e => {
                      const isActive = e.id === activeExamId;
                      return (
                        <div
                          key={e.id}
                          onClick={() => setActiveExamId(e.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                            isActive
                              ? 'bg-blue-50/90 border-blue-400 font-bold text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200/80 hover:bg-slate-100/60 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`} />
                            <span className="truncate font-semibold">{e.name}</span>
                            {isActive && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-200/70 text-blue-800 font-bold shrink-0">
                                Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] text-slate-500 font-mono mr-1">
                              {e.results.length} Form
                            </span>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (handleCloneExam) handleCloneExam(e.id);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Bu sınavı klonla"
                            >
                              <Icons.Copy />
                            </button>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (handleExportSingleExam) handleExportSingleExam(e.id);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Bu sınavı JSON olarak indir"
                            >
                              <Icons.Download />
                            </button>
                            {exams.length > 1 && (
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleDeleteExam(e.id);
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Bu sınavı sil"
                              >
                                <Icons.Trash />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Veri Yedekleme & İçe Aktarma
                    </label>
                    <p className="text-xs text-slate-500 mb-2.5">
                      Tekil sınavlarınızı veya tüm 50 sınavlık arşivinizi JSON formatında güvenle saklayın.
                    </p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleExportSingleExam?.(activeExamId)}
                        title="Sadece seçili aktif sınavın tüm ayarlarını ve sonuçlarını indir"
                        className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-blue-200 shadow-2xs active:scale-95"
                      >
                        <Icons.Download /> <span>Bu Sınavı Yedekle (JSON)</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleExportData}
                          title="Tüm kayıtlı sınavları ve sonuçları tek bir dosyada yedekle"
                          className="py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
                        >
                          <Icons.Download /> <span>Tümünü Yedekle</span>
                        </button>
                        <label
                          title="Önceden indirilmiş JSON sınav yedeğini sisteme aktar (Mevcutları silmez)"
                          className="py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95 select-none"
                        >
                          <Icons.Upload /> <span>Yedek Yükle</span>
                          <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Hafıza Durumu ve Kapasite Bilgisi */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>Hafıza: {storageUsedKb} KB / ~5,000 KB</span>
                      </span>
                      <span className="font-mono text-emerald-700 text-[11px] bg-emerald-100 px-1.5 py-0.5 rounded">
                        %{storagePercent} Dolu
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-snug">
                      50 sınava kadar tüm optik form şablonları, cevap anahtarları, öğrenci listeleri ve sonuç analizleri yerel hafızada güvenle saklanmaktadır.
                    </p>
                  </div>
                </div>

                {exams.length > 1 && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Aktif sınavı silmek için:</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExam(activeExamId)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-red-200/60 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Icons.Trash /> <span>Aktif Sınavı Sil</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Dialog (Pencerede Açıldığında) */}
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
                    <h3 className="text-base font-black text-slate-800 tracking-tight">Sınav Yönetimi</h3>
                    <p className="text-xs text-slate-500">Tüm kayıtlı sınavları görüntüleyin, geçiş yapın veya yenisini ekleyin</p>
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
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar bg-slate-50/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Kayıtlı Sınavlar ({exams.length} / 50)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Yerel Hafıza: {storageUsedKb} KB (%{storagePercent})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleCreateExam();
                      setShowExamsModal(false);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    <Icons.Plus /> <span>Yeni Sınav Ekle</span>
                  </button>
                </div>

                {/* Modal Arama Kutusu */}
                {exams.length > 2 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={examSearch}
                      onChange={e => setExamSearch(e.target.value)}
                      placeholder="Sınav adına göre ara..."
                      className="w-full text-xs px-3.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 text-slate-800 transition-all"
                    />
                    {examSearch && (
                      <button
                        onClick={() => setExamSearch('')}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {exams
                    .filter(e => !examSearch || e.name.toLowerCase().includes(examSearch.toLowerCase()))
                    .map(e => {
                    const isActive = e.id === activeExamId;
                    return (
                      <div
                        key={e.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-800">{e.name}</span>
                            {isActive ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                                ✓ Aktif Çalışılan Sınav
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveExamId(e.id)}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                Bu Sınava Geç
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>{e.subjects.length} Ders</span>
                            <span>•</span>
                            <span>{e.subjects.reduce((sum, s) => sum + s.count, 0)} Soru</span>
                            <span>•</span>
                            <span className="font-semibold text-blue-600">{e.results.length} Okunmuş Form</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleExportSingleExam?.(e.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95"
                            title="Bu sınavı JSON olarak indir"
                          >
                            <Icons.Download />
                          </button>
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
                </div>

                {/* Yedekleme Bölümü */}
                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <span>Yedekleme & Geri Yükleme (.JSON)</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleExportSingleExam?.(activeExamId)}
                      className="flex-1 sm:flex-none px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-blue-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Aktif sınavı JSON olarak indir"
                    >
                      <Icons.Download /> <span>Aktif Sınavı İndir</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="flex-1 sm:flex-none px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Tüm sınavları tek dosyada yedekle"
                    >
                      <Icons.Download /> <span>Tümünü Yedekle</span>
                    </button>
                    <label
                      className="flex-1 sm:flex-none px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95 select-none"
                    >
                      <Icons.Upload /> <span>Yedek Yükle</span>
                      <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExamsModal(false)}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer active:scale-95 shadow-sm"
                >
                  Tamamla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Hızlı Şablonlar / Sınav Sihirbazı */}
      <div id="quick-templates-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
        {/* Tıklanabilir Üst Çubuk (Trigger Header) */}
        <div 
          onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
          className="p-3.5 sm:p-4.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-blue-50/90 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-2xs shrink-0">
              <Icons.Sparkles />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-slate-800 tracking-tight">Pratik Sınav Şablonları</h4>
                {activeTemplate ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    Aktif: {activeTemplate.name}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    Özel Yapılandırma ({totalQ} Soru)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tek tıkla hazır ders dağılımı ve soru formatı uygulayın
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowTemplatesModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Şablonları modal pencerede aç"
            >
              <Icons.Layers />
              <span className="hidden sm:inline">Pencerede Aç</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95 ${
                isTemplatesOpen
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span>{isTemplatesOpen ? 'Şablonları Gizle' : 'Şablonları Listele'}</span>
              <span className={`transform transition-transform duration-200 ${isTemplatesOpen ? 'rotate-180' : 'rotate-0'}`}>
                <Icons.ChevronDown />
              </span>
            </button>
          </div>
        </div>

        {/* Tıklandığında Aşağı Listelenen Şablonlar (Accordion / Downward List) */}
        {isTemplatesOpen && (
          <div className="p-3 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-3 animate-in fade-in duration-150">
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between pb-1">
              <span>Aşağıdaki hazır şablonlardan birini seçerek sınavınızı anında yapılandırabilirsiniz:</span>
              <span className="text-[11px] text-slate-400 font-mono">{TEMPLATES.length} Hazır Şablon</span>
            </div>

            <div className="space-y-2.5">
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
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-800 tracking-tight">
                          {tpl.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          {tpl.badge}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {tpl.optionsCount} Şık ({tpl.penalty > 0 ? `${tpl.penalty} Yanlış 1 Doğru` : 'Net Düşmez'})
                        </span>
                        {tpl.layoutType === 'split' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            2 Bölümlü (Sözel/Sayısal)
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            ✓ Aktif Kullanımda
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        {tpl.desc}
                      </p>

                      {/* Ders ve Soru Dağılım Hapları */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Dersler:</span>
                        {tpl.subjects.map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/80 flex items-center gap-1 font-mono"
                          >
                            <span>{sub.name}:</span>
                            <b className="text-blue-600">{sub.count} Soru</b>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          handleApplyTemplate(tpl);
                          setIsTemplatesOpen(false);
                        }}
                        className={`w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs ${
                          isCurrent
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Dialog (Aşağı Doğru Sıralanan Modal Pencere) */}
        {showTemplatesModal && (
          <div
            className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setShowTemplatesModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <Icons.Sparkles />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight">Pratik Sınav Şablonları</h3>
                    <p className="text-xs text-slate-500">Sınavınız için uygun formatı seçip tek tıkla uygulayın</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <Icons.X />
                </button>
              </div>

              {/* Modal Body - Aşağı Doğru Listelenen Şablonlar */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
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
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                        isCurrent
                          ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-800">{tpl.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                            {tpl.badge}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                            {tpl.optionsCount} Şık
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              ✓ Mevcut Sınav Formatı
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{tpl.desc}</p>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Dağılım:</span>
                          {tpl.subjects.map((sub, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80 font-mono"
                            >
                              {sub.name}: <b className="text-blue-600">{sub.count}</b>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            handleApplyTemplate(tpl);
                            setShowTemplatesModal(false);
                          }}
                          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs ${
                            isCurrent
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <Icons.CheckCircle />
                          <span>{isCurrent ? 'Yeniden Uygula' : `Şablonu Seç (${tplTotalQ} Soru)`}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Sınav Genel Bilgileri */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 transition-all">
        <div className="pb-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Icons.BookOpen />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 tracking-tight">Sınav ve Kurum Bilgileri</h4>
              <p className="text-xs text-slate-500 font-medium">Optik form başlıklarında ve karnelerde görüntülenecek bilgiler</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          <div className="sm:col-span-2 md:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sınav Adı</label>
            <input
              type="text"
              value={exam.name}
              onChange={(e) => updateExam({ name: e.target.value })}
              placeholder="Örn: 8. Sınıf LGS Deneme 1"
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kurum / Okul Adı</label>
            <input
              type="text"
              value={exam.institution || ""}
              onChange={(e) => updateExam({ institution: e.target.value })}
              placeholder="Örn: Kırklareli Atatürk Ortaokulu"
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Uygulama Tarihi</label>
            <input
              type="text"
              value={exam.date || ""}
              onChange={(e) => updateExam({ date: e.target.value })}
              placeholder="GG.AA.YYYY"
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-2xs font-mono"
            />
          </div>
        </div>

        {/* Kurum Logosu Alanı */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {exam.logo ? (
              <div className="w-12 h-12 rounded-xl border border-slate-200 p-1 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                <img src={exam.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-400 flex items-center justify-center shrink-0">
                <Icons.Image />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Kurum Logosu</span>
                {exam.logo ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ Yüklendi
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    İsteğe Bağlı
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                Optik form üst başlığında ve karne raporlarında görüntülenir (PNG / JPG)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              <Icons.Image /> <span>{exam.logo ? "Logoyu Değiştir" : "Logo Yükle"}</span>
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

      {/* 4. Sınav Kuralları & Formatı (Segmented Kontroller & Açılır / Modal Yapısı) */}
      <div id="exam-rules-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
        {/* Tıklanabilir Üst Çubuk (Trigger Header) */}
        <div
          onClick={() => setIsRulesOpen(!isRulesOpen)}
          className="p-3.5 sm:p-4.5 bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-amber-50/90 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Icons.Sliders />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-slate-800 tracking-tight">Puanlama ve Optik Form Kuralları</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  {exam.format === 'mebi' ? 'MEBİ (LGS)' : 'Standart'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                  {exam.optionsCount} Şık
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {exam.penalty === 0 ? 'Net Düşmez' : `${exam.penalty}Y 1D`}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {exam.layoutType === 'split' ? '2 Parça' : 'Tek Parça'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sınav tipi, yanlış götürme kuralı, seçenek sayısı ve sayfa düzenini yapılandırın
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Kuralları modal pencerede düzenle"
            >
              <Icons.Sliders />
              <span className="hidden sm:inline">Pencerede Aç</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRulesOpen(!isRulesOpen)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95 ${
                isRulesOpen
                  ? 'bg-amber-600 text-white shadow-amber-500/20'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>{isRulesOpen ? 'Kuralları Gizle' : 'Kuralları Düzenle'}</span>
              <span className={`transform transition-transform duration-200 ${isRulesOpen ? 'rotate-180' : 'rotate-0'}`}>
                <Icons.ChevronDown />
              </span>
            </button>
          </div>
        </div>

        {/* Tıklandığında Aşağı Listelenen Kurallar (Accordion Panel) */}
        {isRulesOpen && (
          <div className="p-3.5 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between pb-1">
              <span>Sınav puanlama kurallarını ve optik form yapısını aşağıdan belirleyin:</span>
              <span className="text-[11px] text-slate-400">Anında uygulanır</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Format */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Sınav Formatı</label>
                    <span className="text-[10px] font-bold text-blue-600 font-mono">
                      {exam.format === 'mebi' ? 'LGS' : 'Genel'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">Milli Eğitim veya genel test</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateExam({ format: 'standard' })}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      exam.format !== 'mebi' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Standart
                  </button>
                  <button
                    type="button"
                    onClick={() => updateExam({ format: 'mebi' })}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      exam.format === 'mebi' ? 'bg-blue-600 text-white shadow-2xs shadow-blue-500/30 font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    MEBİ (LGS)
                  </button>
                </div>
              </div>

              {/* Puanlama */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Yanlış Kuralı</label>
                    <span className="text-[10px] font-bold text-amber-600 font-mono">
                      {exam.penalty === 0 ? '0' : `${exam.penalty}Y=1D`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">Net hesaplama formülü</p>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateExam({ penalty: 0 })}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                      exam.penalty === 0 ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Götürmez
                  </button>
                  <button
                    type="button"
                    onClick={() => updateExam({ penalty: 3 })}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                      exam.penalty === 3 ? 'bg-blue-600 text-white shadow-2xs shadow-blue-500/30 font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    3Y 1D
                  </button>
                  <button
                    type="button"
                    onClick={() => updateExam({ penalty: 4 })}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                      exam.penalty === 4 ? 'bg-blue-600 text-white shadow-2xs shadow-blue-500/30 font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    4Y 1D
                  </button>
                </div>
              </div>

              {/* Şık Sayısı */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Seçenek Sayısı</label>
                    <span className="text-[10px] font-bold text-indigo-600 font-mono">
                      {exam.optionsCount === 5 ? 'A-E' : 'A-D'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">Optik form şık adedi</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateExam({ optionsCount: 4 })}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      exam.optionsCount === 4 ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    4 Şık (A-D)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateExam({ optionsCount: 5 })}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      exam.optionsCount === 5 ? 'bg-blue-600 text-white shadow-2xs shadow-blue-500/30 font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    5 Şık (A-E)
                  </button>
                </div>
              </div>

              {/* Form Düzeni */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Optik Düzeni</label>
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">
                      {exam.layoutType === 'split' ? '2 Bölüm' : '1 Blok'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">Sözel / Sayısal ayrımı</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateExam({ layoutType: 'standard' })}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      exam.layoutType !== 'split' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tek Parça
                  </button>
                  <button
                    type="button"
                    onClick={() => updateExam({ layoutType: 'split' })}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      exam.layoutType === 'split' ? 'bg-blue-600 text-white shadow-2xs shadow-blue-500/30 font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    İki Parça
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Dialog (Aşağı Doğru Sıralanan / Listelenen Modal Pencere) */}
        {showRulesModal && (
          <div
            className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setShowRulesModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <Icons.Sliders />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight">Puanlama ve Optik Form Kuralları</h3>
                    <p className="text-xs text-slate-500">Sınav tipi, yanlış kuralı, seçenek sayısı ve sayfa düzeni</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <Icons.X />
                </button>
              </div>

              {/* Modal Body - Aşağı Doğru Sıralanan Kural Kartları */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar bg-slate-50/40">
                {/* 1. Kural Kartı: Sınav Formatı */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">1</span>
                        <h4 className="text-sm font-black text-slate-800">Sınav Formatı</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Sınavın genel çoktan seçmeli mi yoksa MEB LGS formatında mı olduğunu belirleyin</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {exam.format === 'mebi' ? 'MEBİ (LGS)' : 'Standart'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => updateExam({ format: 'standard' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.format !== 'mebi'
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.format !== 'mebi' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}>
                        {exam.format !== 'mebi' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Standart Test Formatı</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Genel çoktan seçmeli sınavlar ve branş taramaları</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateExam({ format: 'mebi' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.format === 'mebi'
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.format === 'mebi' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}>
                        {exam.format === 'mebi' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">MEBİ / LGS Formatı</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">MEB LGS uyumlu sözel-sayısal ders ayrımı ve yerleşimi</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Kural Kartı: Yanlış Götürme (Ceza) Kuralı */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center">2</span>
                        <h4 className="text-sm font-black text-slate-800">Yanlış Götürme & Net Hesaplama</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Öğrencinin yanlış cevaplarının doğru cevaplarını hangi oranda eksilteceğini belirler</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {exam.penalty === 0 ? 'Ceza Yok' : `${exam.penalty}Y = 1D`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => updateExam({ penalty: 0 })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.penalty === 0
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.penalty === 0 ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                      }`}>
                        {exam.penalty === 0 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Net Düşmez</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Yanlışlar neti etkilemez (Net = Doğru)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateExam({ penalty: 3 })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.penalty === 3
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.penalty === 3 ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                      }`}>
                        {exam.penalty === 3 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">3 Yanlış 1 Doğru</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Ortaokul ve LGS standardı (Net = D - Y/3)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateExam({ penalty: 4 })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.penalty === 4
                          ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.penalty === 4 ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                      }`}>
                        {exam.penalty === 4 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">4 Yanlış 1 Doğru</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Lise, YKS ve KPSS standardı (Net = D - Y/4)</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Kural Kartı: Seçenek (Şık) Sayısı */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">3</span>
                        <h4 className="text-sm font-black text-slate-800">Seçenek (Şık) Sayısı</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Optik form üzerinde her bir soru için basılacak seçenek kodlama daireleri</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                      {exam.optionsCount} Seçenek
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => updateExam({ optionsCount: 4 })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.optionsCount === 4
                          ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.optionsCount === 4 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}>
                        {exam.optionsCount === 4 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">4 Şık (A, B, C, D)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">İlkokul, ortaokul ve LGS sınavları için uygundur</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateExam({ optionsCount: 5 })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.optionsCount === 5
                          ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.optionsCount === 5 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}>
                        {exam.optionsCount === 5 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">5 Şık (A, B, C, D, E)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Lise, YKS, TYT/AYT ve KPSS denemeleri için uygundur</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 4. Kural Kartı: Optik Sayfa Düzeni */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">4</span>
                        <h4 className="text-sm font-black text-slate-800">Optik Sayfa Düzeni</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Form çıktısında derslerin sıralı tek parça mı yoksa sözel/sayısal olarak iki ayrı oturumda mı yer alacağı</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {exam.layoutType === 'split' ? 'İki Parça' : 'Tek Parça'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => updateExam({ layoutType: 'standard' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.layoutType !== 'split'
                          ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.layoutType !== 'split' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}>
                        {exam.layoutType !== 'split' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Tek Parça (Standart Düzen)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Tüm dersler tek bir optik sütun yapısında sıralanır</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateExam({ layoutType: 'split' })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        exam.layoutType === 'split'
                          ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        exam.layoutType === 'split' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}>
                        {exam.layoutType === 'split' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">İki Parça (Bölümlü / Sözel & Sayısal)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Optik form 1. Bölüm (Sözel) ve 2. Bölüm (Sayısal) olarak ikiye ayrılır</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400">Seçilen kurallar sınava anında uygulanır.</span>
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer active:scale-95 shadow-sm"
                >
                  Tamamla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Dersler ve Soru Sayıları Kartı */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Icons.List />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-slate-800 tracking-tight">Ders Dağılımı ve Soru Sayıları</h4>
                <span
                  className={`text-xs font-black font-mono px-2.5 py-0.5 rounded-full border ${
                    totalQ === 100
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : totalQ > 100
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {totalQ} / 100 Soru
                </span>
                {100 - totalQ > 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">({100 - totalQ} soru boşta)</span>
                ) : totalQ === 100 ? (
                  <span className="text-[11px] font-bold text-amber-600">(Kota Tamamen Dolu)</span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Sınavdaki dersleri adlandırın ve soru sayılarını ayarlayın</p>
            </div>
          </div>

          <button
            onClick={handleAddSubject}
            disabled={totalQ >= 100}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              totalQ >= 100
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
            }`}
          >
            <Icons.Plus /> <span>Yeni Ders Ekle</span>
          </button>
        </div>

        {/* Görsel Soru Kotası İlerleme Çubuğu */}
        <div className="my-3.5 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              totalQ > 90 ? 'bg-amber-500' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(100, (totalQ / 100) * 100)}%` }}
          />
        </div>

        {/* Ders Listesi */}
        <div className="space-y-2.5">
          {exam.subjects.map((sub, idx) => (
            <div
              key={sub.id}
              className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs font-mono">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => handleUpdateSubject(sub.id, 'name', e.target.value)}
                  placeholder="Ders Adı"
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center gap-2.5 justify-between sm:justify-end">
                {/* İki Parçalı Sınavlar İçin Sözel/Sayısal Bölüm Seçici */}
                {exam.layoutType === 'split' && (
                  <div className="flex items-center bg-slate-200/70 rounded-lg p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleUpdateSubject(sub.id, 'section', 1)}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer text-xs font-bold ${
                        sub.section === 1 ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sözel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateSubject(sub.id, 'section', 2)}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer text-xs font-bold ${
                        sub.section === 2 ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sayısal
                    </button>
                  </div>
                )}

                {/* Soru Sayısı Stepper (+ / -) Dokunmatik Kontrolü */}
                <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => adjustSubjectCount(sub.id, -1)}
                    disabled={sub.count <= 1}
                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-30 cursor-pointer active:scale-90"
                    title="1 Soru Azalt"
                  >
                    <Icons.Minus />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={sub.count}
                    onChange={(e) => handleUpdateSubject(sub.id, 'count', e.target.value)}
                    className="w-12 text-center text-sm font-black font-mono text-blue-600 focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => adjustSubjectCount(sub.id, 1)}
                    disabled={totalQ >= 100}
                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-30 cursor-pointer active:scale-90"
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
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 border ${
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
    </div>
  );
}
