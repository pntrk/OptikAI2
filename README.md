# 🎯 OptikAI - Yapay Zeka Destekli Optik Okuma Sistemi

OptikAI; sınav kâğıtları, optik formlar ve testler için geliştirilmiş, kamera ve yapay zeka (Gemini Vision) tabanlı profesyonel bir optik form okuma, değerlendirme ve istatistik analiz platformudur.

---

## 🚀 GitHub'a Yükleme ve Vercel'de Yayınlama Rehberi

Bu proje **Vite + React (TypeScript)** mimarisinde geliştirilmiş olup Vercel için tam optimize edilmiştir (`vercel.json` SPA yönlendirmeleri, CDN önbellek başlıkları ve güvenlik ayarları hazır durumdadır).

### 1. GitHub Deposu (Repository) Oluşturma ve Kodu Yükleme

1. [GitHub](https://github.com)'a giriş yapın ve **New Repository** (Yeni Depo) oluşturun (örneğin: `optik-ai`).
2. Terminalinizde proje ana dizininde şu adımları izleyin:

```bash
# Git deposunu başlatın
git init

# Tüm dosyaları takibe ekleyin
git add .

# İlk commit'i oluşturun
git commit -m "feat: OptikAI ilk sürüm ve Vercel optimizasyonları"

# Ana dalı belirleyin
git branch -M main

# GitHub deponuzun adresini ekleyin (kendi depo adresinizle değiştirin)
git remote add origin https://github.com/KULLANICI_ADINIZ/optik-ai.git

# Kodu GitHub'a gönderin
git push -u origin main
```

---

### 2. Vercel'de Tek Tıkla Canlıya Alma (Deploy)

1. [Vercel](https://vercel.com) hesabınıza giriş yapın.
2. Dashboard'da **"Add New..."** -> **"Project"** butonuna tıklayın.
3. GitHub hesabınızı bağlayıp az önce yüklediğiniz `optik-ai` deposunu seçin (**Import**).
4. **Project Settings** otomatik algılanır:
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (veya `vite build`)
   - **Output Directory:** `dist`
5. *(İsteğe Bağlı)* Eğer yapay zeka analiz özelliğini kullanacaksanız **Environment Variables** bölümüne:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** *Google AI Studio API anahtarınız*
6. **"Deploy"** butonuna basın! 1-2 dakika içinde size özel `https://optik-ai-xxxx.vercel.app` canlı bağlantınız hazır olacaktır.

---

## 🛠️ Yerel Geliştirme (Local Development)

Projeyi kendi bilgisayarınızda yerel ortamda çalıştırmak için:

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Geliştirme sunucusunu başlatın
npm run dev

# 3. Üretim (Production) derlemesi oluşturun
npm run build

# 4. Derlemeyi yerel olarak önizleyin
npm run preview
```

---

## ⚙️ Vercel & Dağıtım Optimizasyonları

- **SPA Rewrites (`vercel.json`):** Sayfa yenilemelerinde veya alt sayfalarda 404 hatası almamak için tüm yollar `index.html`'e otomatik yönlendirilir.
- **Rollup Chunking:** `lucide-react`, `motion` ve `react` kütüphaneleri optimize edilmiş bağımsız parçalara (manual chunks) bölünerek CDN üzerinden yüksek hızda önbelleğe alınır.
- **Güvenlik Başlıkları:** `X-Content-Type-Options`, `X-Frame-Options` ve `Referrer-Policy` başlıkları entegre edilmiştir.
- **Kamera ve Mobil Uyumluluk:** PWA desteği, dokunmatik optimizasyonlar ve responsive tasarım ile hem mobil telefonlarda hem de masaüstünde tam uyumlu çalışır.
