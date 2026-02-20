# ⚡ QUICK START GUIDE

## 🚀 Deploy dalam 5 Menit!

### Step 1: Extract File
```bash
unzip FmcComic-Fixed-FINAL.zip
cd comic-fix
```

### Step 2: Setup MongoDB
```bash
# Copy .env example
cp .env.example .env

# Edit .env
nano .env
# Paste MongoDB URI Anda
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Deploy ke Vercel
```bash
# Login
vercel login

# Deploy
vercel --prod
```

### Step 5: Setup Environment di Vercel
1. Buka [vercel.com/dashboard](https://vercel.com/dashboard)
2. Pilih project Anda
3. Settings → Environment Variables
4. Add: `MONGODB_URI` = (paste MongoDB URI Anda)
5. Save

### Step 6: Test!
Buka URL deployment Anda dan test:
- ✅ Home page muncul
- ✅ Klik komik → Detail muncul
- ✅ Klik chapter → Reader berfungsi

---

## 🔑 MongoDB URI Format

```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority
```

**Contoh:**
```
mongodb+srv://admin:myP@ssw0rd@cluster0.abc123.mongodb.net/fmc-comic?retryWrites=true&w=majority
```

**Get MongoDB URI:**
1. Buka [MongoDB Atlas](https://cloud.mongodb.com)
2. Create Free Cluster
3. Database → Connect → Connect Your Application
4. Copy Connection String
5. Replace `<password>` dengan password Anda

---

## 📁 File yang Perlu Anda Tambahkan

### 1. Icon (Optional)
```bash
# Letakkan icon Anda di:
public/assets/icon.png

# Format: PNG, JPG, atau WebP
# Size: 40x40px atau lebih besar
```

Jika tidak ada, aplikasi akan menggunakan placeholder.

---

## 🧪 Test Lokal (Optional)

```bash
# Jalankan development server
vercel dev

# Buka browser
open http://localhost:3000
```

---

## ⚡ One-Liner Deploy

Untuk yang sudah familiar dengan Vercel:

```bash
unzip FmcComic-Fixed-FINAL.zip && cd comic-fix && cp .env.example .env && nano .env && npm install && vercel --prod
```

Jangan lupa setup `MONGODB_URI` di Vercel Dashboard!

---

## 🆘 Troubleshooting Cepat

### Problem: "Cannot find module..."
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problem: "MongoDB connection failed"
```bash
# Cek .env file
cat .env

# Pastikan format benar:
MONGODB_URI=mongodb+srv://...
```

### Problem: "404 Not Found" saat navigasi
```bash
# Pastikan vercel.json ada
cat vercel.json

# Re-deploy
vercel --prod --force
```

### Problem: Data tidak muncul
```bash
# Test API proxy
curl "https://api-proxy-eight-mu.vercel.app/api/tools/proxy?url=https://www.sankavollerei.com/comic/komikindo/home"

# Jika error, proxy mungkin mati. Cari alternatif.
```

---

## 📞 Need Help?

1. **Cek Browser Console**: F12 → Console tab
2. **Cek Network Tab**: F12 → Network tab → Cek request yang fail
3. **Cek Vercel Logs**: Dashboard → Deployments → Click deployment → Logs

---

## ✅ Success Indicators

Aplikasi berhasil jika:
- ✅ Home page menampilkan list komik
- ✅ Search berfungsi
- ✅ Detail komik muncul lengkap
- ✅ Reader menampilkan gambar chapter
- ✅ Bookmark tersimpan
- ✅ History tercatat

---

## 🎉 Selesai!

Aplikasi Anda sudah online dan siap digunakan!

**Share Link:**
Bagikan URL Vercel Anda ke teman:
```
https://your-project-name.vercel.app
```

---

**Total Time:** ~5 menit
**Difficulty:** ⭐ (Easy)
**Prerequisites:** Node.js, Vercel Account, MongoDB
