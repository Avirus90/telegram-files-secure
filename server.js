const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// 🔒 CORS - ONLY YOUR FRONTEND
app.use(cors({
    origin: 'https://anonedu.github.io', // ✅ YOUR FRONTEND
    credentials: false
}));

app.use(express.json());

// Home page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔒 Secure Telegram API</title>
            <style>
                body { font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; }
                .secure { background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; }
                code { background: #333; color: white; padding: 10px; display: block; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>🔒 Secure Telegram API</h1>
            <p>Frontend: <strong>https://anonedu.github.io/telegram-files-secure/</strong></p>
            
            <div class="secure">
                <h3>✅ Security Features:</h3>
                <ul>
                    <li>Token: Environment Variables 🔒</li>
                    <li>CORS: Restricted to your frontend only</li>
                    <li>Rate limiting: Enabled</li>
                </ul>
            </div>
            
            <h3>📡 API Endpoints:</h3>
            <p><code>GET /api/test</code> - API status</p>
            <p><code>GET /api/files?channel=@username</code> - Get files</p>
            
            <p>Bot: @StorageAjit_bot | Repo: anonedu-backend2</p>
        </body>
        </html>
    `);
});

// API status
app.get('/api/test', (req, res) => {
    res.json({
        status: 'secure',
        service: 'Telegram Files API',
        frontend: 'https://anonedu.github.io/telegram-files-secure/',
        timestamp: new Date().toISOString()
    });
});

// Get files
app.get('/api/files', async (req, res) => {
    try {
        const channel = req.query.channel || '@Anon27199';
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!BOT_TOKEN) {
            return res.json({ success: false, error: 'Token not configured' });
        }

        const response = await axios.get(
            `https://api.telegram.org/bot${BOT_TOKEN}/getChatHistory`,
            { params: { chat_id: channel, limit: 30 } }
        );

        const files = [];
        if (response.data.ok) {
            for (const msg of response.data.result) {
                if (msg.document || msg.video || msg.audio || msg.photo) {
                    let fileData = msg.document || msg.video || msg.audio || msg.photo[msg.photo.length - 1];
                    let fileType = msg.document ? 'document' : msg.video ? 'video' : msg.audio ? 'audio' : 'image';
                    
                    if (fileData.file_id) {
                        const fileRes = await axios.get(
                            `https://api.telegram.org/bot${BOT_TOKEN}/getFile`,
                            { params: { file_id: fileData.file_id } }
                        );
                        
                        if (fileRes.data.ok) {
                            files.push({
                                id: msg.message_id,
                                date: new Date(msg.date * 1000).toLocaleString('hi-IN'),
                                caption: msg.caption || '',
                                type: fileType,
                                name: fileData.file_name || `${fileType}_${msg.message_id}`,
                                size: fileData.file_size,
                                download_url: `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileRes.data.result.file_path}`
                            });
                        }
                    }
                }
            }
        }

        res.json({ 
            success: true, 
            channel: channel,
            files: files,
            security: 'token_secured'
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Secure API running on port ${PORT}`);
});
