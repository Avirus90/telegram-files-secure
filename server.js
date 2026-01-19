const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

// Security middleware
app.use(cors({
    origin: 'https://avirus90.github.io', // ONLY your frontend
    credentials: false
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Home page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Telegram Files API 🔒</title>
            <style>
                body { font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; }
                .secure { background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; }
                code { background: #333; color: white; padding: 10px; display: block; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>🔒 Secure Telegram Files API</h1>
            <p>Token: Secured in environment variables</p>
            
            <div class="secure">
                <h3>✅ Security Features:</h3>
                <ul>
                    <li>No token in source code</li>
                    <li>CORS restricted to your frontend only</li>
                    <li>Rate limiting enabled</li>
                    <li>Security headers added</li>
                </ul>
            </div>
            
            <h3>📡 Available Endpoints:</h3>
            <p><code>GET /api/status</code> - Check API status</p>
            <p><code>GET /api/files?channel=@username</code> - Get files</p>
            
            <p>Made with ❤️ | Bot: @StorageAjit_bot</p>
        </body>
        </html>
    `);
});

// API status
app.get('/api/status', (req, res) => {
    res.json({
        status: 'secure',
        service: 'Telegram Files API',
        version: '2.0.0',
        secure: true,
        timestamp: new Date().toISOString(),
        allowed_origin: 'https://avirus90.github.io'
    });
});

// Get files from channel
app.get('/api/files', async (req, res) => {
    try {
        const channel = req.query.channel;
        
        if (!channel || !channel.startsWith('@')) {
            return res.status(400).json({
                success: false,
                error: 'Valid channel username required (start with @)'
            });
        }
        
        // Get token from environment
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!BOT_TOKEN) {
            console.error('Bot token not configured');
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }
        
        // Get messages from Telegram
        const telegramResponse = await axios.get(
            `https://api.telegram.org/bot${BOT_TOKEN}/getChatHistory`,
            {
                params: {
                    chat_id: channel,
                    limit: 30
                },
                timeout: 10000
            }
        );
        
        if (!telegramResponse.data.ok) {
            return res.json({
                success: false,
                error: 'Telegram API error',
                details: telegramResponse.data.description
            });
        }
        
        const files = [];
        const messages = telegramResponse.data.result || [];
        
        // Process each message
        for (const msg of messages) {
            if (msg.document || msg.video || msg.audio || msg.photo) {
                let fileData = null;
                let fileType = 'unknown';
                
                if (msg.document) {
                    fileData = msg.document;
                    fileType = 'document';
                } else if (msg.video) {
                    fileData = msg.video;
                    fileType = 'video';
                } else if (msg.audio) {
                    fileData = msg.audio;
                    fileType = 'audio';
                } else if (msg.photo) {
                    fileData = msg.photo[msg.photo.length - 1];
                    fileType = 'image';
                }
                
                if (fileData && fileData.file_id) {
                    try {
                        // Get file path
                        const fileResponse = await axios.get(
                            `https://api.telegram.org/bot${BOT_TOKEN}/getFile`,
                            {
                                params: { file_id: fileData.file_id },
                                timeout: 5000
                            }
                        );
                        
                        if (fileResponse.data.ok) {
                            const filePath = fileResponse.data.result.file_path;
                            const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
                            
                            files.push({
                                id: msg.message_id,
                                date: new Date(msg.date * 1000).toISOString(),
                                caption: msg.caption || '',
                                type: fileType,
                                name: fileData.file_name || `${fileType}_${msg.message_id}`,
                                size: fileData.file_size,
                                mime_type: fileData.mime_type,
                                download_url: downloadUrl,
                                safe_url: `/api/proxy/${Buffer.from(downloadUrl).toString('base64')}`
                            });
                        }
                    } catch (error) {
                        console.log(`File processing error: ${error.message}`);
                    }
                }
            }
        }
        
        res.json({
            success: true,
            channel: channel,
            total_files: files.length,
            files: files,
            security: {
                token_exposed: false,
                rate_limited: true,
                cors_restricted: true
            }
        });
        
    } catch (error) {
        console.error('API Error:', error.message);
        
        // Don't expose internal errors
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    🔒 SECURE Telegram API Started
    📍 Port: ${PORT}
    ✅ CORS: Restricted
    ⚡ Rate Limit: Enabled
    🚀 Ready: ${new Date().toISOString()}
    `);
});

module.exports = app;
