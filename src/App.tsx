/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Exam, DialogState, Student } from './types';
import { initialExam, getTotalQuestions } from './constants';
import { Icons } from './components/Icons';
import { SettingsTab } from './components/SettingsTab';
import { StudentsTab } from './components/StudentsTab';
import { KeysTab } from './components/KeysTab';
import { PrintTab } from './components/PrintTab';
import { ReadTab } from './components/ReadTab';
import { ResultsTab } from './components/ResultsTab';
import { AnalysisTab } from './components/AnalysisTab';

export default function App() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (msg: string) => {
    setDialog({ type: 'alert', msg });
  };

  const showConfirm = (msg: string, onConfirm: () => void) => {
    setDialog({ type: 'confirm', msg, onConfirm });
  };

  const loadSavedExams = (): Exam[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omr_exams_v54_unified');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.warn("Storage parse error:", e);
        }
      }
    }
    return [initialExam];
  };

  const loadSavedSchoolStudents = (savedExams: Exam[]): Student[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omr_school_students_master');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.warn("Storage master students parse error:", e);
        }
      }
      // Otomatik Aktarım: Mevcut kayıtlarda öğrenci varsa merkezi kütüğe aktar
      for (const ex of savedExams) {
        if (ex.studentList && ex.studentList.length > 0) {
          return ex.studentList;
        }
      }
    }
    return [];
  };

  const [exams, setExams] = useState<Exam[]>(loadSavedExams);
  const [schoolStudents, setSchoolStudents] = useState<Student[]>(() => loadSavedSchoolStudents(exams));
  const [activeExamId, setActiveExamId] = useState<number>(() => exams[0]?.id || initialExam.id);
  const [activeTab, setActiveTab] = useState<string>("read");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showExamPicker, setShowExamPicker] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState<boolean>(false);
  const [examDropdownSearch, setExamDropdownSearch] = useState<string>('');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Yerel hafızaya (LocalStorage) güvenli kayıt ve kota kontrolü
  useEffect(() => {
    try {
      localStorage.setItem('omr_exams_v54_unified', JSON.stringify(exams));
    } catch (err: any) {
      console.error("LocalStorage save error:", err);
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        showAlert("Hafıza Uyarısı: Tarayıcınızın yerel depolama alanı doldu. Lütfen eski sınavlarınızı yedekleyip silerek yer açın.");
      }
    }
  }, [exams]);

  // Sabit Okul Öğrenci Kütüğü (Master Roster) Yerel Hafıza Kaydı
  useEffect(() => {
    try {
      localStorage.setItem('omr_school_students_master', JSON.stringify(schoolStudents));
    } catch (err: any) {
      console.error("Master students save error:", err);
    }
  }, [schoolStudents]);

  // Okul Öğrenci Kütüğünü güncelleme ve tüm sınavlarla senkron tutma
  const updateSchoolStudents = (newList: Student[]) => {
    setSchoolStudents(newList);
    setExams(prev => prev.map(e => ({ ...e, studentList: newList })));
  };

  const currentExamRaw = exams.find(e => e.id === activeExamId) || exams[0] || initialExam;
  // Sınav nesnesinin öğrenci listesi daima merkezi okul kütüğünü yansıtır
  const currentExam = useMemo(() => ({
    ...currentExamRaw,
    studentList: schoolStudents.length > 0 ? schoolStudents : (currentExamRaw.studentList || [])
  }), [currentExamRaw, schoolStudents]);

  const totalQ = getTotalQuestions(currentExam.subjects);

  // Hafıza kullanım hesabı
  const storageUsedBytes = typeof window !== 'undefined' ? (localStorage.getItem('omr_exams_v54_unified')?.length || 0) * 2 : 0;
  const storageUsedKb = (storageUsedBytes / 1024).toFixed(1);
  const storagePercent = Math.min(100, (storageUsedBytes / (5 * 1024 * 1024)) * 100).toFixed(1);

  const updateCurrentExam = (updates: Partial<Exam>) => {
    // Eğer sınav üzerinden studentList güncelleniyorsa, okul kütüğünü de otomatik senkronize et
    if (updates.studentList) {
      setSchoolStudents(updates.studentList);
      try {
        localStorage.setItem('omr_school_students_master', JSON.stringify(updates.studentList));
      } catch (e) {
        console.error("Master students sync error:", e);
      }
    }
    setExams(prev => prev.map(e => (e.id === activeExamId ? { ...e, ...updates } : e)));
  };

  const handleCreateExam = () => {
    const newExam: Exam = {
      id: Date.now(),
      name: `Yeni Sınav ${exams.length + 1}`,
      institution: currentExam.institution || "EĞİTİM KURUMU",
      date: new Date().toLocaleDateString('tr-TR'),
      logo: currentExam.logo || null,
      studentList: schoolStudents, // Okul öğrenci kütüğü otomatik olarak bu sınava bağlanır
      layoutType: 'split',
      subjects: [
        { id: Date.now(), name: "Türkçe", count: 20, section: 1 },
        { id: Date.now() + 1, name: "Matematik", count: 20, section: 2 }
      ],
      optionsCount: 4,
      penalty: 3,
      keys: { A: [], B: [], C: [], D: [] },
      results: []
    };
    setExams([newExam, ...exams]);
    setActiveExamId(newExam.id);
    setShowExamPicker(false);
    showAlert(`"${newExam.name}" başarıyla oluşturuldu! Okul öğrenci kütüğünüz (${schoolStudents.length} öğrenci) otomatik olarak hazır.`);
  };

  const handleDeleteExam = (id: number) => {
    if (exams.length <= 1) return showAlert("Sistemde en az 1 sınav kalmak zorundadır.");
    const target = exams.find(e => e.id === id);
    showConfirm(`"${target?.name || 'Sınav'}" kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`, () => {
      const filtered = exams.filter(e => e.id !== id);
      setExams(filtered);
      if (activeExamId === id) setActiveExamId(filtered[0].id);
      setDialog(null);
      setShowExamPicker(false);
      showAlert("Sınav başarıyla silindi.");
    });
  };

  // Mevcut sınavı kopyalayıp yeni bir sınav olarak ekleme (Sınavı Klonla)
  const handleCloneExam = (examId?: number) => {
    const target = exams.find(e => e.id === (examId || activeExamId)) || currentExam;
    const clonedExam: Exam = {
      ...target,
      id: Date.now(),
      name: `${target.name} (Kopya)`,
      date: new Date().toLocaleDateString('tr-TR'),
      subjects: target.subjects.map((sub, idx) => ({
        ...sub,
        id: Date.now() + idx + 1
      })),
      keys: JSON.parse(JSON.stringify(target.keys || { A: [], B: [], C: [], D: [] })),
      studentList: schoolStudents.length > 0 ? schoolStudents : (target.studentList || []),
      results: [] // Temiz yeni taranacak sınav olarak klonlanır
    };

    setExams([clonedExam, ...exams]);
    setActiveExamId(clonedExam.id);
    setShowExamPicker(false);
    showAlert(`"${target.name}" sınavı kopyalandı! Yeni sınav "${clonedExam.name}" oluşturuldu ve aktif yapıldı.`);
  };

  // Tekil Sınavı JSON olarak yedekleme (Aktif veya seçilen sınav)
  const handleExportSingleExam = (examId?: number) => {
    const target = exams.find(e => e.id === (examId || activeExamId)) || currentExam;
    const safeName = (target.name || "sinav").toLowerCase().replace(/[^a-z0-9ğüşıöç]/gi, '_');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(target, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `sinav_${safeName}_yedek.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showAlert(`"${target.name}" sınavının tüm ayarları, cevap anahtarı, öğrenci listesi ve okunan sonuçları JSON dosyası olarak indirildi.`);
  };

  // Tüm Sınavları Toplu JSON olarak yedekleme
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exams, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `tum_sinavlar_toplu_yedek_${exams.length}_adet.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showAlert(`Tüm kayıtlı ${exams.length} sınavın verileri JSON formatında yedeklendi.`);
  };

  // Akıllı JSON Yedek Yükleme (Hem tekil hem toplu sınav yedeklerini tanır ve mevcutları silmeden ekler)
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const imported = JSON.parse(raw);

        // Durum 1: Tekil Sınav Yedeği
        if (imported && typeof imported === 'object' && !Array.isArray(imported) && imported.subjects && Array.isArray(imported.subjects)) {
          const singleExam: Exam = {
            id: imported.id || Date.now(),
            name: imported.name || `Yüklenen Sınav ${exams.length + 1}`,
            institution: imported.institution || "EĞİTİM KURUMU",
            date: imported.date || new Date().toLocaleDateString('tr-TR'),
            logo: imported.logo || null,
            studentList: Array.isArray(imported.studentList) ? imported.studentList : [],
            layoutType: imported.layoutType === 'standard' ? 'standard' : 'split',
            format: imported.format || 'standard',
            subjects: imported.subjects || [],
            optionsCount: imported.optionsCount || 4,
            penalty: typeof imported.penalty === 'number' ? imported.penalty : 3,
            keys: imported.keys || { A: [], B: [], C: [], D: [] },
            results: Array.isArray(imported.results) ? imported.results : []
          };

          // Aynı ID varsa çakışmayı önlemek için yeni benzersiz ID ata
          const existingIdx = exams.findIndex(x => x.id === singleExam.id);
          let newExams: Exam[];
          if (existingIdx >= 0) {
            singleExam.id = Date.now();
            singleExam.name = `${singleExam.name} (Yüklendi)`;
            newExams = [singleExam, ...exams];
          } else {
            newExams = [singleExam, ...exams];
          }

          setExams(newExams);
          setActiveExamId(singleExam.id);
          showAlert(`"${singleExam.name}" adlı sınav yedeği başarıyla yüklendi ve listenize eklendi! (Toplam ${newExams.length} kayıtlı sınav)`);
          return;
        }

        // Durum 2: Toplu Sınav Yedeği (Dizi)
        if (Array.isArray(imported) && imported.length > 0 && imported[0]?.subjects) {
          const validExams: Exam[] = imported.map((item, idx) => ({
            id: item.id || (Date.now() + idx),
            name: item.name || `Sınav ${idx + 1}`,
            institution: item.institution || "EĞİTİM KURUMU",
            date: item.date || new Date().toLocaleDateString('tr-TR'),
            logo: item.logo || null,
            studentList: Array.isArray(item.studentList) ? item.studentList : [],
            layoutType: item.layoutType === 'standard' ? 'standard' : 'split',
            format: item.format || 'standard',
            subjects: Array.isArray(item.subjects) ? item.subjects : [],
            optionsCount: item.optionsCount || 4,
            penalty: typeof item.penalty === 'number' ? item.penalty : 3,
            keys: item.keys || { A: [], B: [], C: [], D: [] },
            results: Array.isArray(item.results) ? item.results : []
          }));

          // Var olan sınavları koruyarak üzerine ekle (akıllı birleştirme)
          const existingIds = new Set(exams.map(e => e.id));
          const merged: Exam[] = [...exams];
          let addedCount = 0;

          for (const item of validExams) {
            if (existingIds.has(item.id)) {
              item.id = Date.now() + Math.floor(Math.random() * 100000) + addedCount;
            }
            existingIds.add(item.id);
            merged.push(item);
            addedCount++;
          }

          setExams(merged);
          setActiveExamId(validExams[0].id);
          showAlert(`${addedCount} adet sınav yedeği başarıyla hafızaya aktarıldı ve listenize eklendi! (Toplam ${merged.length} kayıtlı sınav)`);
          return;
        }

        showAlert("Geçersiz yedek dosyası formatı. Lütfen geçerli bir .json sınav yedek dosyası seçin.");
      } catch (err) {
        console.error("Yedek yükleme hatası:", err);
        showAlert("Dosya okunamadı veya bozuk bir JSON formatında.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const tabs = [
    { id: "read", label: "Canlı Tarama", shortLabel: "Tara", icon: <Icons.Camera />, isPrimary: true },
    { id: "students", label: "Okul Öğrenci Kütüğü", shortLabel: "Öğrenciler", icon: <Icons.Users />, count: schoolStudents.length, isMaster: true },
    { id: "settings", label: "Sınav Ayarları", shortLabel: "Ayarlar", icon: <Icons.BookOpen /> },
    { id: "keys", label: "Cevap Anahtarı", shortLabel: "Cevaplar", icon: <Icons.CheckCircle /> },
    { id: "print", label: "Optik Form Bas", shortLabel: "Form Bas", icon: <Icons.Printer /> },
    { id: "results", label: "Sonuç Listesi", shortLabel: "Sonuçlar", icon: <Icons.List />, count: currentExam.results.length },
    { id: "analysis", label: "Soru Analizi", shortLabel: "Analiz", icon: <Icons.BarChart /> }
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden print-override bg-slate-100 touch-manipulation font-sans">
      {/* Genel Bilgi / Onay Modalı */}
      {dialog && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative z-50 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              {dialog.type === 'confirm' ? (
                <span className="text-amber-500"><Icons.CheckCircle /></span>
              ) : (
                <span className="text-blue-500"><Icons.BookOpen /></span>
              )}
              {dialog.type === 'confirm' ? 'Onay Gerekiyor' : 'Bilgilendirme'}
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{dialog.msg}</p>
            <div className="flex justify-end gap-2.5">
              {dialog.type === 'confirm' && (
                <button
                  onClick={() => setDialog(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  setDialog(null);
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-white text-xs transition-colors shadow-sm cursor-pointer ${
                  dialog.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialog.type === 'confirm' ? 'Onayla' : 'Tamam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hızlı Sınav Değiştirme Modalı (Mobil & Desktop Hızlı Seçici) */}
      {showExamPicker && (
        <div
          className="fixed inset-0 z-[9990] bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs"
          onClick={() => setShowExamPicker(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-5 pb-7 sm:pb-5 max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-600"><Icons.Folder /></span>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-tight">Sınav Seçimi & Yönetimi</h3>
                  <p className="text-[11px] text-slate-400">Kayıtlı Sınavlar ({exams.length} / 50)</p>
                </div>
              </div>
              <button
                onClick={() => setShowExamPicker(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icons.X />
              </button>
            </div>

            {/* Hızlı Arama Kutusu */}
            {exams.length > 2 && (
              <div className="relative mb-2.5">
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Sınav adına göre ara..."
                  className="w-full text-xs px-3.5 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs pointer-events-none">
                  🔍
                </span>
                {pickerSearch && (
                  <button
                    onClick={() => setPickerSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs p-0.5"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Sınav Listesi */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1 my-1 custom-scrollbar max-h-72">
              {exams
                .filter(e => !pickerSearch || e.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map(e => {
                  const isActive = e.id === activeExamId;
                  return (
                    <div
                      key={e.id}
                      onClick={() => {
                        setActiveExamId(e.id);
                        setShowExamPicker(false);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-blue-50/90 border-blue-500/80 shadow-xs ring-1 ring-blue-400/30'
                          : 'bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`} />
                          <span className={`font-bold text-xs truncate ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                            {e.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white shrink-0">
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 pl-4">
                          <span>{e.subjects.length} Ders</span>
                          <span>•</span>
                          <span>{getTotalQuestions(e.subjects)} Soru</span>
                          <span>•</span>
                          <span>{e.date || 'Tarih yok'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${
                            isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {e.results.length} Form
                        </span>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleCloneExam(e.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Bu sınavı klonla"
                        >
                          <Icons.Copy />
                        </button>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleExportSingleExam(e.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Bu sınavı JSON olarak indir"
                        >
                          <Icons.Download />
                        </button>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleDeleteExam(e.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Bu sınavı hafızadan sil"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              {exams.filter(e => !pickerSearch || e.name.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  Aramanıza uygun sınav bulunamadı.
                </div>
              )}
            </div>

            {/* Hafıza Durumu Göstergesi */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 mt-2 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-600">Yerel Hafıza:</span>
                <span className="font-mono text-slate-800 font-bold">{storageUsedKb} KB / ~5,000 KB (%{storagePercent})</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                50 Sınav Kapasitesi Yeterli
              </span>
            </div>

            {/* Alt İşlem Butonları */}
            <div className="pt-3 border-t border-slate-100 mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={handleCreateExam}
                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer active:scale-95"
              >
                <Icons.Plus /> Yeni Sınav
              </button>
              <button
                onClick={() => {
                  globalFileInputRef.current?.click();
                  setShowExamPicker(false);
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              >
                <Icons.Upload /> Yedek Yükle (.JSON)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gizli Dosya Girişi (Her yerden yedek yükleme tetikleyebilir) */}
      <input
        ref={globalFileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportData}
        className="hidden"
      />

      {/* MASAÜSTÜ SIDEBAR (md ve üzeri ekranlar) - Sade, Ergonomik ve Kullanışlı */}
      <aside className="hidden md:flex md:w-68 bg-slate-900 text-white flex-col no-print shrink-0 z-20 shadow-xl border-r border-slate-800 select-none">
        {/* Logo & Marka Başlığı */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="OptikAI Icon"
              className="w-9 h-9 rounded-xl shadow-md object-contain border border-slate-700/50"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-base font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                OptikAI <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">PRO</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-1">Sınav Değerlendirme</p>
            </div>
          </div>
        </div>

        {/* Aktif Sınav & Açılır Sınav Listesi */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-900/90">
          <div className="rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900/95 border border-slate-700/70 transition-all overflow-hidden shadow-md shadow-slate-950/40">
            {/* Tıklanabilir Başlık / Aktif Sınav Özeti */}
            <div
              onClick={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/40 transition-all duration-150 group select-none relative"
              title="Kayıtlı sınavlar listesini aç / kapat"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block ring-2 ring-emerald-500/30 animate-pulse" />
                  <span>Aktif Sınav</span>
                  <span className="text-[9px] bg-slate-800/80 text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-700/60 ml-auto">
                    {exams.length} Kayıtlı Sınav
                  </span>
                </div>
                <div className="text-xs font-black text-slate-100 truncate mt-1 tracking-tight" title={currentExam.name}>
                  {currentExam.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="bg-slate-800/90 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700/50 font-mono">
                    {currentExam.subjects.length} Ders
                  </span>
                  <span className="bg-slate-800/90 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700/50 font-mono">
                    {totalQ} Soru
                  </span>
                  <span className="bg-blue-950/60 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-800/50 font-mono">
                    {currentExam.results.length} Form
                  </span>
                </div>
              </div>

              {/* Sağ Aksiyonlar & Açılır İkon */}
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleCloneExam(currentExam.id)}
                  title="Aktif sınavı kopyala ve klonla"
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
                >
                  <Icons.Copy />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSingleExam()}
                  title="Aktif sınavı JSON olarak indir"
                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
                >
                  <Icons.Download />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteExam(currentExam.id)}
                  title="Aktif sınavı hafızadan sil"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
                >
                  <Icons.Trash />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
                  title={isExamDropdownOpen ? "Listeyi Kapat" : "Sınav Listesini Aç"}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
                >
                  <span className={`inline-block transition-transform duration-200 ${isExamDropdownOpen ? 'rotate-180 text-blue-400' : ''}`}>
                    <Icons.ChevronDown />
                  </span>
                </button>
              </div>
            </div>

            {/* Aşağı Açılan Sınav Listesi (Açılır Format) */}
            {isExamDropdownOpen && (
              <div className="border-t border-slate-700/80 bg-slate-950/90 p-2.5 animate-in slide-in-from-top-2 duration-150 backdrop-blur-md">
                {/* Arama Kutusu */}
                {exams.length > 2 && (
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={examDropdownSearch}
                      onChange={e => setExamDropdownSearch(e.target.value)}
                      placeholder="Sınav filtrele..."
                      className="w-full text-[11px] px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 placeholder-slate-500"
                    />
                    {examDropdownSearch && (
                      <button
                        onClick={() => setExamDropdownSearch('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* Sınav Özet Bilgi Kartları */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                  {exams
                    .filter(e => !examDropdownSearch || e.name.toLowerCase().includes(examDropdownSearch.toLowerCase()))
                    .map(e => {
                      const isActive = e.id === activeExamId;
                      return (
                        <div
                          key={e.id}
                          onClick={() => {
                            setActiveExamId(e.id);
                            setIsExamDropdownOpen(false);
                          }}
                          className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 border-blue-400/80 text-white shadow-md shadow-blue-950/50 ring-1 ring-blue-400/30'
                              : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700/80 text-slate-200 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between min-w-0">
                            <div className="truncate font-bold text-xs flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-white shadow-xs' : 'bg-slate-600'}`} />
                              <span className="truncate">{e.name}</span>
                            </div>
                            {isActive && (
                              <span className="text-[9px] bg-white/20 backdrop-blur-xs text-white px-2 py-0.5 rounded-full font-black tracking-wider uppercase shrink-0 border border-white/20">
                                Aktif
                              </span>
                            )}
                          </div>

                          <div className={`text-[10px] mt-2 flex items-center justify-between ${
                            isActive ? 'text-blue-100' : 'text-slate-400'
                          }`}>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${
                                isActive ? 'bg-white/15 text-white' : 'bg-slate-800/80 text-slate-300 border border-slate-700/40'
                              }`}>
                                {e.subjects.length} Ders
                              </span>
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${
                                isActive ? 'bg-white/15 text-white' : 'bg-slate-800/80 text-slate-300 border border-slate-700/40'
                              }`}>
                                {getTotalQuestions(e.subjects)} Soru
                              </span>
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                isActive ? 'bg-white/25 text-white' : 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                              }`}>
                                {e.results.length} Form
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0" onClick={ev => ev.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleCloneExam(e.id)}
                                className={`p-1 rounded-lg hover:bg-black/20 transition-colors ${
                                  isActive ? 'text-white hover:text-indigo-100' : 'text-slate-400 hover:text-indigo-400'
                                }`}
                                title="Sınavı Klonla"
                              >
                                <Icons.Copy />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportSingleExam(e.id)}
                                className={`p-1 rounded-lg hover:bg-black/20 transition-colors ${
                                  isActive ? 'text-white hover:text-blue-100' : 'text-slate-400 hover:text-blue-400'
                                }`}
                                title="JSON İndir"
                              >
                                <Icons.Download />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExam(e.id)}
                                className={`p-1 rounded-lg hover:bg-black/20 transition-colors ${
                                  isActive ? 'text-white hover:text-red-200' : 'text-slate-400 hover:text-red-400'
                                }`}
                                title="Sınavı Sil"
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {exams.filter(e => !examDropdownSearch || e.name.toLowerCase().includes(examDropdownSearch.toLowerCase())).length === 0 && (
                    <div className="text-center py-4 text-[11px] text-slate-500 font-medium">
                      Aramanıza uygun sınav bulunamadı
                    </div>
                  )}
                </div>

                {/* Alt Hızlı Butonlar */}
                <div className="pt-2.5 mt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      handleCreateExam();
                      setIsExamDropdownOpen(false);
                    }}
                    className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Icons.Plus /> Yeni Sınav
                  </button>
                  <button
                    onClick={() => {
                      globalFileInputRef.current?.click();
                      setIsExamDropdownOpen(false);
                    }}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-700/60 active:scale-95"
                  >
                    <Icons.Upload /> Yedek Yükle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigasyon Menü Grupları */}
        <div className="overflow-y-auto py-3 px-3 flex-1 space-y-4 custom-scrollbar">
          {/* Tarama & Okuma */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Hızlı İşlem
            </div>
            <button
              onClick={() => setActiveTab('read')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs cursor-pointer ${
                activeTab === 'read'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40'
                  : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/60 border border-emerald-800/30'
              }`}
            >
              <span className={activeTab === 'read' ? 'text-white' : 'text-emerald-400'}>
                <Icons.Camera />
              </span>
              <span>Canlı Tarama</span>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                AI
              </span>
            </button>
          </div>

          {/* Okul Öğrenci Kütüğü (Tüm Sınavlarda Sabit & Ortak) */}
          <div>
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
              <span>Merkezi Kütük</span>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-bold">Sabit</span>
            </div>
            <button
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-xs cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40'
                  : 'text-indigo-200 hover:bg-indigo-950/40 hover:text-white border border-indigo-900/30'
              }`}
            >
              <span className={activeTab === 'students' ? 'text-white' : 'text-indigo-400'}><Icons.Users /></span>
              <div className="text-left flex-1 min-w-0">
                <div className="truncate font-bold">Okul Öğrenci Kütüğü</div>
                <div className="text-[10px] text-indigo-300/70 font-normal">Tüm sınavlarda ortak</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                activeTab === 'students' ? 'bg-indigo-800 text-white' : 'bg-indigo-950 text-indigo-300 border border-indigo-800/50'
              }`}>
                {schoolStudents.length}
              </span>
            </button>
          </div>

          {/* Aktif Sınav Hazırlığı */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Aktif Sınav Hazırlığı
            </div>
            <div className="space-y-1">
              {[
                { id: "settings", label: "Sınav Ayarları", icon: <Icons.BookOpen /> },
                { id: "keys", label: "Cevap Anahtarı", icon: <Icons.CheckCircle /> },
                { id: "print", label: "Optik Form Bas", icon: <Icons.Printer /> }
              ].map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-xs cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Raporlar & İstatistik */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Raporlar & Analiz
            </div>
            <div className="space-y-1">
              {[
                { id: "results", label: "Sonuç Listesi", icon: <Icons.List />, count: currentExam.results.length },
                { id: "analysis", label: "Soru Analizi", icon: <Icons.BarChart /> }
              ].map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-xs cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-blue-800 text-white' : 'bg-slate-800 text-blue-400'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alt Bilgi & Powered By Kumcu */}
        <div className="p-3 border-t border-slate-800/80 flex flex-col gap-2">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs shadow-md cursor-pointer"
            >
              <Icons.Smartphone /> Uygulamayı Yükle
            </button>
          )}

          <div id="powered-by-kumcu" className="text-center flex items-center justify-between px-2 pt-1">
            <span className="text-[10px] text-slate-500">v5.4 • Çevrimdışı</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-xs">
              <span className="text-[9px] font-medium text-slate-400">Powered by</span>
              <span className="text-[10px] font-black text-blue-400 tracking-wider">Kumcu</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBİL ÇEKMECE MENÜSÜ (Drawer / Bottom Sheet) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[9980] bg-slate-950/70 backdrop-blur-xs md:hidden flex justify-start animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-slate-900 text-white flex flex-col shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Çekmece Başlığı */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/icon.svg"
                  alt="OptikAI Icon"
                  className="w-8 h-8 rounded-lg shadow object-contain border border-slate-700/50"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-black text-sm text-white">OptikAI Menü</h3>
                  <p className="text-[10px] text-slate-400">Hızlı Navigasyon</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            {/* Sınav Değiştirme Butonu */}
            <div className="p-3 border-b border-slate-800/60">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowExamPicker(true);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="text-[9px] uppercase font-bold text-blue-400">Aktif Sınav</div>
                  <div className="text-xs font-bold text-slate-100 truncate">{currentExam.name}</div>
                </div>
                <Icons.ChevronDown />
              </button>
            </div>

            {/* Menü Sekmeleri */}
            <div className="overflow-y-auto p-3 flex-1 space-y-1">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.id === 'results' && currentExam.results.length > 0 && (
                      <span className="ml-auto bg-slate-800 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {currentExam.results.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Çekmece Altı */}
            <div className="p-3 border-t border-slate-800 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700/80">
                <span className="text-[9px] text-slate-400">Powered by</span>
                <span className="text-[10px] font-black text-blue-400 tracking-wider">Kumcu</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBİL VE MASAÜSTÜ ANA İÇERİK ALANI */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative no-print">
        {/* MOBİL ÜST ÇUBUK (md altı ekranlar) - Ergonomik & Modern */}
        <header className="md:hidden bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0 z-30 shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger Menü Butonu */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0"
              title="Menüyü Aç"
            >
              <Icons.Menu />
            </button>

            <img
              src="/icon.svg"
              alt="OptikAI"
              className="w-7 h-7 rounded-lg shadow-sm object-contain shrink-0 border border-slate-700/50"
              referrerPolicy="no-referrer"
            />

            {/* Sınav Adı ve Hızlı Seçici */}
            <button
              onClick={() => setShowExamPicker(true)}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-left max-w-[170px] sm:max-w-xs transition-colors active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-slate-100 truncate">{currentExam.name}</span>
              <span className="text-slate-400 shrink-0"><Icons.ChevronDown /></span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('results')}
              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
            >
              <span>{currentExam.results.length}</span>
              <span className="text-[10px] text-blue-400 font-normal">Form</span>
            </button>
          </div>
        </header>

        {/* MASAÜSTÜ HEADER (md ve üzeri) - Profesyonel & Ergonomik */}
        <header className="hidden md:flex bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 py-3 justify-between items-center shadow-xs z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-4 min-w-0">
            {/* Sınav Adı ve Hızlı Seçim Butonu */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExamPicker(true)}
                  className="flex items-center gap-2 text-left group hover:bg-slate-50 p-1 -ml-1 rounded-xl transition-all cursor-pointer"
                  title="Sınavı Değiştir veya Yönet"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 shrink-0 ring-2 ring-emerald-100 animate-pulse" />
                  <h2 className="text-base font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors truncate max-w-md">
                    {currentExam.name}
                  </h2>
                  <span className="text-slate-400 group-hover:text-blue-500 transition-transform group-hover:translate-y-0.5 shrink-0">
                    <Icons.ChevronDown />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCloneExam(currentExam.id)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  title="Seçili sınavı kopyala / klonla"
                >
                  <Icons.Copy />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteExam(currentExam.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Seçili sınavı hafızadan sil"
                >
                  <Icons.Trash />
                </button>
              </div>

              {/* Sınav Meta Bilgileri Çipleri */}
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 mt-0.5">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60">
                  {currentExam.institution || 'Genel Değerlendirme'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">
                  {currentExam.subjects.length} Ders
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-blue-600">
                  {totalQ} Soru ({currentExam.optionsCount || 4} Şıklı)
                </span>
                {currentExam.date && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{currentExam.date}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sağ Aksiyon Araç Çubuğu */}
          <div className="flex items-center gap-2.5">
            {/* Hızlı Optik Okuma Butonu (Okuma sekmesinde değilse göster) */}
            {activeTab !== 'read' && (
              <button
                type="button"
                onClick={() => setActiveTab('read')}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm shadow-emerald-600/20 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                title="Canlı Optik Okuma Kamerasını Başlat"
              >
                <Icons.Camera />
                <span>Canlı Tarama</span>
                <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded font-mono">AI</span>
              </button>
            )}

            {/* Kayıtlı Form Sayacı / Sonuçlara Git */}
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeTab === 'results'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Okunmuş Sonuç Listesini Görüntüle"
            >
              <Icons.List />
              <span>Kayıtlı Form:</span>
              <span className={`font-black font-mono text-xs px-1.5 py-0.2 rounded-md ${
                activeTab === 'results' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'
              }`}>
                {currentExam.results.length}
              </span>
            </button>
          </div>
        </header>

        {/* ANA İÇERİK BİLEŞENLERİ */}
        <main
          className={`flex-1 overflow-y-auto relative custom-scrollbar ${
            activeTab === 'print'
              ? 'bg-slate-300/90 p-0 pb-16 md:pb-0'
              : activeTab === 'read'
              ? 'p-0 bg-slate-950 pb-16 md:pb-0'
              : 'p-3.5 sm:p-5 md:p-6 pb-20 md:pb-8 bg-gradient-to-b from-slate-50 to-slate-100/60'
          }`}
        >
          {activeTab === "settings" && (
            <SettingsTab
              exam={currentExam}
              updateExam={updateCurrentExam}
              exams={exams}
              activeExamId={activeExamId}
              setActiveExamId={setActiveExamId}
              handleCreateExam={handleCreateExam}
              handleDeleteExam={handleDeleteExam}
              handleCloneExam={handleCloneExam}
              handleExportSingleExam={handleExportSingleExam}
              handleExportData={handleExportData}
              handleImportData={handleImportData}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
          {activeTab === "students" && (
            <StudentsTab
              exam={currentExam}
              updateExam={updateCurrentExam}
              schoolStudents={schoolStudents}
              updateSchoolStudents={updateSchoolStudents}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
          {activeTab === "keys" && (
            <KeysTab
              exam={currentExam}
              updateExam={updateCurrentExam}
              totalQ={totalQ}
            />
          )}
          {activeTab === "print" && (
            <PrintTab
              exam={currentExam}
              updateExam={updateCurrentExam}
              schoolStudents={schoolStudents}
              showAlert={showAlert}
            />
          )}
          {activeTab === "read" && (
            <ReadTab
              exam={currentExam}
              updateExam={updateCurrentExam}
              setActiveTab={setActiveTab}
              totalQ={totalQ}
              activeTab={activeTab}
              schoolStudents={schoolStudents}
              showAlert={showAlert}
            />
          )}
          {activeTab === "results" && (
            <ResultsTab
              exam={currentExam}
              updateExam={updateCurrentExam}
              schoolStudents={schoolStudents}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
          {activeTab === "analysis" && (
            <AnalysisTab
              exam={currentExam}
              totalQ={totalQ}
              showAlert={showAlert}
            />
          )}
        </main>

        {/* MOBİL ERGONOMİK ALT BAR (Bottom Navigation Bar - md altı cihazlar için) */}
        <nav
          aria-label="Mobil Alt Navigasyon"
          className="md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1 flex items-center justify-around shrink-0 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] safe-area-bottom select-none"
        >
          {/* 1. Canlı Tara (Öne Çıkan Orta/Ana Eylem) */}
          <button
            onClick={() => setActiveTab('read')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'read'
                ? 'text-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'read'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 -translate-y-1'
                : 'text-slate-600'
            }`}>
              <Icons.Camera />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Tarama</span>
          </button>

          {/* 2. Cevaplar */}
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'keys'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'keys' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <Icons.CheckCircle />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Cevaplar</span>
          </button>

          {/* 3. Sonuçlar */}
          <button
            onClick={() => setActiveTab('results')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
              activeTab === 'results'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg relative ${activeTab === 'results' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <Icons.List />
              {currentExam.results.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {currentExam.results.length > 99 ? '99+' : currentExam.results.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Sonuçlar</span>
          </button>

          {/* 4. Analiz */}
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'analysis' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <Icons.BarChart />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Analiz</span>
          </button>

          {/* 5. Tümü / Menü */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          >
            <div className="p-1 rounded-lg">
              <Icons.Menu />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Menü</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
