const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const connectionOptions = {
    serverSelectionTimeoutMS: 5000, 
    socketTimeoutMS: 45000,
};

const MappingSchema = new mongoose.Schema({
    uuid: { type: String, unique: true },
    slug: String,
    type: String
});
const Mapping = mongoose.models.Mapping || mongoose.model('Mapping', MappingSchema);

async function connectToDatabase() {
    if (mongoose.connection.readyState === 1) return;
    
    console.log("Mencoba menyambung ke MongoDB...");
    try {
        await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
        console.log("✅ Database Terhubung!");
    } catch (err) {
        console.error("❌ Gagal menyambung ke DB:", err.message);
        throw err;
    }
}

app.post('/api/get-id', async (req, res) => {
    try {
        await connectToDatabase();
        
        const { slug, type } = req.body;
        if (!slug || !type) return res.status(400).json({ error: "Slug/Type kurang" });

        console.log(`Mencari mapping untuk: ${slug} (${type})`);
        
        let data = await Mapping.findOne({ slug, type });
        if (!data) {
            console.log("Mapping tidak ditemukan, membuat UUID baru...");
            data = await Mapping.create({ uuid: uuidv4(), slug, type });
        }
        
        return res.json({ uuid: data.uuid });
    } catch (e) {
        console.error("Internal Error @ get-id:", e.message);
        return res.status(500).json({ error: e.message });
    }
});

app.get('/api/get-slug/:uuid', async (req, res) => {
    try {
        await connectToDatabase();
        const data = await Mapping.findOne({ uuid: req.params.uuid });
        if (data) return res.json(data);
        return res.status(404).json({ error: "UUID tidak ada di database" });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        await connectToDatabase();
        res.json({ status: "OK", database: "Connected" });
    } catch (e) {
        res.status(500).json({ status: "Error", message: e.message });
    }
});

module.exports = app;

.env : 
MONGODB_URI=mongodb+srv://gu4rdian2021_db_user:mR0W9TGt1x6gr9Rq@cluster0.bfxgeuf.mongodb.net/?appName=Cluster0



#Semua Endpoint apinya : 
ini bagian  pencarian di atas atau di pojok untuk search komik :
apa yang user ketik dan di pencariannya otomatis ambil api search : https://www.sankavollerei.com/comic/komikindo/search/${text}/1, misalnya user nyari naruto akan otomatis get sesuai query: https://www.sankavollerei.com/comic/komikindo/search/naruto/1
${text} adalah bagian nama/ query yang di cari di fitur search komiknya 
/1 adalah pagenation selanjutnya atau halaman selanjutnya 

respon api : 
{
  "creator": "Sanka Vollerei",
  "success": true,
  "query": "naruto",
  "pagination": {
    "currentPage": 1,
    "hasNextPage": false,
    "nextPage": null
  },
  "komikList": [
    {
      "title": "Renge to Naruto!",
      "rating": "7.58",
      "slug": "renge-to-naruto",
      "image": "https://komikindo.ch/wp-content/uploads/2023/11/Komik-Renge-to-Naruto-226x319.png",
      "type": "Manga"
    },
    {
      "title": "Naruto: The Whorl within the Spiral",
      "rating": "8.34",
      "slug": "naruto-the-whorl-within-the-spiral",
      "image": "https://komikindo.ch/wp-content/uploads/2023/07/Komik-Naruto-The-Whorl-within-the-Spiral-236x285.jpg",
      "type": "Manga"
    },
    {
      "title": "Naruto: Konoha’s Story—The Steam Ninja Scrolls",
      "rating": "8.06",
      "slug": "naruto-konohas-story-the-steam-ninja-scrolls",
      "image": "https://komikindo.ch/wp-content/uploads/2022/10/Komik-Naruto-Konohas-StoryThe-Steam-Ninja-Scrolls-The-Manga-236x236.jpg",
      "type": "Manga"
    },
    {
      "title": "Naruto Sasuke’s Story The Uchiha And The Heavenly Stardust",
      "rating": "8.09",
      "slug": "893930-naruto-sasukes-story-the-uchiha-and-the-heavenly-stardust",
      "image": "https://komikindo.ch/wp-content/uploads/2022/10/Komik-Naruto-Sasukes-StoryThe-Uchiha-and-the-Heavenly-Stardust-The-Manga-202x319.jpg",
      "type": "Manga"
    },
    {
      "title": "Naruto Shippuden – Sai and Ino (Doujinshi)",
      "rating": "7",
      "slug": "naruto-shippuden-sai-and-ino-doujinshi",
      "image": "https://komikindo.ch/wp-content/uploads/2021/01/Komik-Naruto-Shippuden-Sai-and-Ino-Doujinshi-169x319.jpg",
      "type": "Manga"
    },
    {
      "title": "Naruto",
      "rating": "7.98",
      "slug": "naruto-id",
      "image": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Naruto-204x319.jpg",
      "type": "Manga"
    },
    {
      "title": "Boruto",
      "rating": "6.49",
      "slug": "boruto",
      "image": "https://komikindo.ch/wp-content/uploads/2023/08/Komik-Boruto-Naruto-Next-Generations-203x319.jpg",
      "type": "Manga"
    }
  ]
}
Note bagian fitur search jika hasil di temukan tampilkan semua hasilnya  yang berupa nama komik thumbanil/cover komik ratingnya dan type komiknya dan sesuaikan gimana nanti sistemnya untuk next pagenation yg /1 sampai mentok brp

jadi yang ada di situ hamepage / latest yang mengambil bagian  Data update terbaru komik. : 
https://www.sankavollerei.com/comic/komikindo/latest/1
respon api kira kira : 
{
  "creator": "Sanka Vollerei",
  "success": true,
  "pagination": {
    "currentPage": 1,
    "totalPages": 207,
    "hasNextPage": true,
    "nextPage": 2
  },
  "komikList": [
    {
      "title": "Nano Machine",
      "slug": "155895-nano-machine",
      "image": "https://komikindo.ch/wp-content/uploads/2020/12/Komik-Nano-Machine-223x319.jpg",
      "type": "Manhwa",
      "color": "Warna",
      "chapters": [
        {
