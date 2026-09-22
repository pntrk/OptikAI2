import React, { useState, useMemo } from 'react';
import { Exam, Student } from '../types';
import { Icons } from './Icons';
import { formatClassSec, handleDownloadTemplate } from '../constants';

interface StudentsTabProps {
  exam: Exam;
  updateExam: (updates: Partial<Exam>) => void;
  showAlert: (msg: string) => void;
  showConfirm: (msg: string, onConfirm: () => void) => void;
}

export function StudentsTab({ exam, updateExam, showAlert, showConfirm }: StudentsTabProps) {
  // Form state
  const [no, setNo] = useState("");
  const [name, setName] = useState("");
  const [classStr, setClassStr] = useState("");
  const [sectionStr, setSectionStr] = useState("");
  const [editingStudentNo, setEditingStudentNo] = useState<string | null>(null);

  // Bulk upload class/sec override
  const [uploadCls, setUploadCls] = useState("");
  const [uploadSec, setUploadSec] = useState("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");

  // Mobile active panel toggle: 'list' | 'add' | 'upload'
  const [activeMobileView, setActiveMobileView] = useState<'list' | 'add' | 'upload'>('list');

  // Student list safely
  const studentList = useMemo(() => exam.studentList || [], [exam.studentList]);

  // Unique classes for filter chips
  const classList = useMemo(() => {
    const set = new Set<string>();
    studentList.forEach(s => {
      const c = (s.classStr || "").trim();
      const sec = (s.sectionStr || "").trim().toUpperCase();
      if (c && sec) set.add(`${c}/${sec}`);
      else if (c) set.add(`${c}. Sınıf`);
    });
    return Array.from(set).sort();
  }, [studentList]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return studentList.filter(s => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        s.no.toString().includes(q);

      if (!matchesSearch) return false;

      if (selectedClassFilter === 'all') return true;

      const c = (s.classStr || "").trim();
      const sec = (s.sectionStr || "").trim().toUpperCase();
      const full = (c && sec) ? `${c}/${sec}` : (c ? `${c}. Sınıf` : '');
      return full === selectedClassFilter;
    });
  }, [studentList, searchQuery, selectedClassFilter]);

  const handleSave = () => {
    if (!no.trim() || !name.trim()) {
      return showAlert("Öğrenci Numarası ve Adı Soyadı alanları zorunludur.");
    }

    const { cls, sec } = formatClassSec(classStr, sectionStr);
    const newList = [...studentList];
    const existingIdx = newList.findIndex(s => s.no.toString() === no.toString());

    if (existingIdx >= 0) {
      newList[existingIdx] = {
        no: no.trim(),
        name: name.trim().toUpperCase(),
        classStr: cls,
        sectionStr: sec
      };
      showAlert(`${name.trim().toUpperCase()} isimli öğrencinin bilgileri güncellendi.`);
    } else {
      newList.push({
        no: no.trim(),
        name: name.trim().toUpperCase(),
        classStr: cls,
        sectionStr: sec
      });
      showAlert(`${name.trim().toUpperCase()} sisteme eklendi.`);
    }

    updateExam({ studentList: newList });
    resetForm();
    setActiveMobileView('list');
  };

  const resetForm = () => {
    setNo("");
    setName("");
    setClassStr("");
    setSectionStr("");
    setEditingStudentNo(null);
  };

  const startEdit = (student: Student) => {
    setNo(student.no);
    setName(student.name);
    setClassStr(student.classStr || "");
    setSectionStr(student.sectionStr || "");
    setEditingStudentNo(student.no);
    setActiveMobileView('add');
  };

  const handleDelete = (studentNo: string, studentName: string) => {
    showConfirm(`${studentName} (${studentNo}) sistemden silinsin mi?`, () => {
      updateExam({ studentList: studentList.filter(s => s.no.toString() !== studentNo.toString()) });
      if (editingStudentNo === studentNo) resetForm();
    });
  };

  const confirmDeleteAllStudents = () => {
    showConfirm("Sistem hafızasındaki TÜM öğrenciler silinecektir. Bu işlem geri alınamaz. Devam edilsin mi?", () => {
      updateExam({ studentList: [] });
      resetForm();
    });
  };

  const handleStudentListUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || "";
      const lines = text.split('\n');
      const list: Student[] = [];

      let isEokul = false;
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const lowerLine = lines[i].toLowerCase();
        if (lowerLine.includes('öğrenci no') || lowerLine.includes('cinsiyet')) {
          isEokul = true;
          break;
        }
      }

      let colNo = 0, colName = 1, colClass = 2, colSec = 3, colSurname = -1;

      lines.forEach((line, index) => {
        if (line.trim() === "") return;
        const parts = line.split(/[,;\t]/);
        const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

        if (isEokul) {
          const snoStr = cleanParts[0];
          const noStr = cleanParts[1];
          if (snoStr && !isNaN(parseFloat(snoStr)) && noStr && !isNaN(parseFloat(noStr))) {
            const noVal = parseInt(parseFloat(noStr).toString(), 10).toString();
            const nameParts: string[] = [];
            for (let i = 2; i < cleanParts.length; i++) {
              const p = cleanParts[i];
              if (p !== "" && p.toLowerCase() !== "kız" && p.toLowerCase() !== "erkek") {
                nameParts.push(p);
              }
            }
            const nameVal = nameParts.join(" ").toUpperCase();
            const { cls, sec } = formatClassSec(uploadCls, uploadSec);
            list.push({ no: noVal, name: nameVal, classStr: cls, sectionStr: sec });
          }
        } else {
          if (index === 0) {
            const headerStr = cleanParts.join(' ').toLowerCase();
            if (headerStr.includes('numara') || headerStr.includes('no') || headerStr.includes('ad')) {
              colNo = cleanParts.findIndex(p => p.toLowerCase().includes('numara') || p.toLowerCase() === 'no');
              colName = cleanParts.findIndex(p => p.toLowerCase() === 'ad' || p.toLowerCase() === 'adı' || p.toLowerCase().includes('isim'));
              if (colName === -1) colName = cleanParts.findIndex(p => p.toLowerCase().includes('ad'));
              colSurname = cleanParts.findIndex(p => p.toLowerCase().includes('soyad'));
              colClass = cleanParts.findIndex(p => p.toLowerCase().includes('sınıf') || p.toLowerCase().includes('sinif'));
              colSec = cleanParts.findIndex(p => p.toLowerCase().includes('şube') || p.toLowerCase().includes('sube'));

              if (colNo === -1) colNo = 0;
              if (colName === -1) colName = 1;
              if (colClass === -1) colClass = 2;
              if (colSec === -1) colSec = 3;
              return;
            }
          }

          const noStr = cleanParts[colNo];
          if (noStr && !isNaN(parseInt(noStr, 10))) {
            let nameStr = cleanParts[colName] || "";
            if (colSurname !== -1 && cleanParts[colSurname]) {
              if (!nameStr.toLowerCase().includes(cleanParts[colSurname].toLowerCase())) {
                nameStr += " " + cleanParts[colSurname];
              }
            }

            const tempCls = cleanParts[colClass] ? cleanParts[colClass] : uploadCls;
            const tempSec = cleanParts[colSec] ? cleanParts[colSec] : uploadSec;
            const { cls, sec } = formatClassSec(tempCls, tempSec);

            list.push({
              no: parseInt(noStr, 10).toString(),
              name: nameStr.toUpperCase(),
              classStr: cls,
              sectionStr: sec
            });
          }
        }
      });

      if (list.length > 0) {
        const currentList = [...studentList];
        let added = 0;
        let updated = 0;

        list.forEach(newStudent => {
          const existingIdx = currentList.findIndex(s => s.no.toString() === newStudent.no.toString());
          if (existingIdx >= 0) {
            currentList[existingIdx] = { ...currentList[existingIdx], ...newStudent };
            updated++;
          } else {
            currentList.push(newStudent);
            added++;
          }
        });

        updateExam({ studentList: currentList });
        showAlert(`Toplu işlem başarılı! ${added} yeni öğrenci eklendi, ${updated} kayıt güncellendi.`);
        setActiveMobileView('list');
      } else {
        showAlert("Listeden öğrenci okunamadı. Lütfen CSV formatını kontrol edin.");
      }
    };

    reader.readAsText(file, 'windows-1254');
    if (e.target) e.target.value = "";
  };

  return (
    <div className="bg-slate-50 min-h-full flex flex-col gap-3 pb-8">
      {/* Header Summary Card */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
              <Icons.Users />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                  Öğrenci Listesi Yönetimi
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {studentList.length} Öğrenci Kayıtlı
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kişiye özel optik formlar ve optik taramada isim eşleştirme için kullanılır
              </p>
            </div>
          </div>

          {/* Quick Actions (Boş Şablon & Tümünü Sil) */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={handleDownloadTemplate}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg border border-slate-200 transition-all cursor-pointer"
              title="Örnek CSV Şablonunu İndir"
            >
              <Icons.Download />
              <span>Şablon İndir</span>
            </button>
            <button
              onClick={confirmDeleteAllStudents}
              disabled={studentList.length === 0}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                studentList.length === 0
                  ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                  : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200 active:scale-95'
              }`}
              title="Tüm öğrenci listesini temizle"
            >
              <Icons.Trash />
              <span>Tümünü Sil</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Segmented Tabs (Visible on small screens) */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 mt-3 sm:hidden">
          <button
            type="button"
            onClick={() => setActiveMobileView('list')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
              activeMobileView === 'list'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <Icons.List />
            <span>Liste ({studentList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileView('add')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
              activeMobileView === 'add'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <Icons.UserPlus />
            <span>{editingStudentNo ? 'Düzenle' : 'Yeni Ekle'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileView('upload')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
              activeMobileView === 'upload'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <Icons.Upload />
            <span>Toplu Yükle</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Forms and List */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* Left Forms Sidebar: Add & Upload (Desktop always visible, Mobile tab-controlled) */}
        <div className={`w-full lg:w-96 flex-col gap-4 shrink-0 ${
          activeMobileView === 'list' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Manual Student Add / Edit Card */}
          {(activeMobileView === 'add' || typeof window !== 'undefined') && (
            <div className={`bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 transition-all ${
              activeMobileView === 'upload' ? 'hidden lg:block' : 'block'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3.5">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {editingStudentNo ? 'Öğrenci Bilgisini Güncelle' : 'Manuel Öğrenci Ekle'}
                </h4>
                {editingStudentNo && (
                  <button
                    onClick={resetForm}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                  >
                    Vazgeç
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Öğrenci No *
                  </label>
                  <input
                    type="number"
                    value={no}
                    onChange={e => setNo(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner"
                    placeholder="Örn: 104"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold uppercase text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner"
                    placeholder="Örn: AHMET YILMAZ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      Sınıf
                    </label>
                    <input
                      type="text"
                      value={classStr}
                      onChange={e => setClassStr(e.target.value)}
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner"
                      placeholder="Örn: 8"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      Şube
                    </label>
                    <input
                      type="text"
                      value={sectionStr}
                      onChange={e => setSectionStr(e.target.value)}
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold uppercase text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner"
                      placeholder="Örn: B"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full mt-1 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold py-2.5 rounded-xl shadow-xs shadow-blue-500/20 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
                >
                  <Icons.CheckCircle />
                  <span>{editingStudentNo ? 'Değişiklikleri Kaydet' : 'Öğrenciyi Kaydet'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Bulk Upload Card */}
          {(activeMobileView === 'upload' || typeof window !== 'undefined') && (
            <div className={`bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 transition-all ${
              activeMobileView === 'add' ? 'hidden lg:block' : 'block'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3.5">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Toplu Liste / E-Okul Yükleme
                </h4>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                E-Okul öğrenci listesini veya hazırladığınız CSV dosyasını doğrudan aktarabilirsiniz.
              </p>

              {/* Optional Class & Section override */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 mb-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-600">
                  Dosyada Sınıf/Şube Yoksa Varsayılan Ata:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={uploadCls}
                    onChange={e => setUploadCls(e.target.value)}
                    placeholder="Sınıf (Örn: 8)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={uploadSec}
                    onChange={e => setUploadSec(e.target.value)}
                    placeholder="Şube (Örn: A)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold uppercase outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* File upload drag/click box */}
              <label className="w-full group flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl cursor-pointer transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-2xs">
                  <Icons.Upload />
                </div>
                <span className="text-xs font-bold text-emerald-800">
                  CSV veya TXT Dosyası Seçin
                </span>
                <span className="text-[11px] text-emerald-600/80 mt-0.5">
                  E-Okul veya Standart Excel CSV
                </span>
                <input
                  type="file"
                  accept=".csv, .txt"
                  onChange={handleStudentListUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Right Student List (Desktop & Mobile) */}
        <div className={`flex-1 flex-col gap-3 min-w-0 ${
          activeMobileView !== 'list' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Search, Filter Bar & Quick Stats */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Search input with clear button */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="İsim veya numara ile ara..."
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

              {/* Add Student Button on Mobile/Desktop */}
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveMobileView('add');
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Icons.Plus />
                <span>Yeni Öğrenci Ekle</span>
              </button>
            </div>

            {/* Sınıf / Şube Filtreleme Hapları */}
            {classList.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                  <Icons.Filter /> Filtre:
                </span>
                <button
                  onClick={() => setSelectedClassFilter('all')}
                  className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    selectedClassFilter === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tümü ({studentList.length})
                </button>
                {classList.map(clsName => {
                  const count = studentList.filter(s => {
                    const c = (s.classStr || "").trim();
                    const sec = (s.sectionStr || "").trim().toUpperCase();
                    const full = (c && sec) ? `${c}/${sec}` : (c ? `${c}. Sınıf` : '');
                    return full === clsName;
                  }).length;

                  return (
                    <button
                      key={clsName}
                      onClick={() => setSelectedClassFilter(clsName)}
                      className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                        selectedClassFilter === clsName
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{clsName}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        selectedClassFilter === clsName ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Students Virtual / Flow Card List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Listelenen Öğrenciler ({filteredStudents.length})</span>
              {searchQuery && (
                <span className="text-indigo-600 font-semibold lowercase">
                  "{searchQuery}" araması
                </span>
              )}
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 shadow-2xs">
                    <Icons.Users />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-700 text-sm">
                      {searchQuery || selectedClassFilter !== 'all'
                        ? 'Aramaya uygun öğrenci bulunamadı'
                        : 'Sistem hafızasında kayıtlı öğrenci yok'}
                    </h5>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      {searchQuery || selectedClassFilter !== 'all'
                        ? 'Arama terimini veya sınıf filtresini temizlemeyi deneyin.'
                        : 'Sol taraftaki formdan tek tek ekleyebilir veya toplu CSV yükleyebilirsiniz.'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredStudents.map((s, idx) => (
                  <div
                    key={s.no}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 bg-white hover:border-indigo-300 hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar / Number Badge */}
                      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-50 border border-slate-200 group-hover:border-indigo-200 flex flex-col items-center justify-center text-slate-700 group-hover:text-indigo-700 shrink-0 transition-colors">
                        <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">NO</span>
                        <span className="font-mono font-black text-xs leading-tight">{s.no}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">
                          {s.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="font-semibold text-slate-600">
                            {s.classStr ? `${s.classStr}. Sınıf` : 'Sınıf Yok'}
                            {s.sectionStr ? ` / ${s.sectionStr} Şubesi` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-lg transition-all border border-indigo-200/80 cursor-pointer"
                        title="Öğrenciyi Düzenle"
                      >
                        <Icons.Edit />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.no, s.name)}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 rounded-lg transition-all border border-red-200/80 cursor-pointer"
                        title="Öğrenciyi Sil"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
