const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join('/tmp', 'pastes.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS pastes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        expiration TEXT NOT NULL,
        isPrivate BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INTEGER DEFAULT 0
    )`);
});

function generatePasteId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function isPasteExpired(createdAt, expiration) {
    if (expiration === 'never') return false;
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMs = now - created;
    
    switch (expiration) {
        case '1day': return diffInMs > 24 * 60 * 60 * 1000;
        case '1week': return diffInMs > 7 * 24 * 60 * 60 * 1000;
        case '1month': return diffInMs > 30 * 24 * 60 * 60 * 1000;
        default: return false;
    }
}

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, query, body } = req;
    
    if (method === 'POST') {
        const { title, content, expiration, isPrivate } = body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        const url = generatePasteId();
        const pasteTitle = title?.trim() || 'Untitled';
        
        db.run(
            "INSERT INTO pastes (url, title, content, expiration, isPrivate) VALUES (?, ?, ?, ?, ?)",
            [url, pasteTitle, content, expiration, isPrivate ? 1 : 0],
            function(err) {
                if (err) {
                    console.error('Error creating paste:', err);
                    return res.status(500).json({ error: 'Failed to create paste' });
                }
                
                res.json({
                    success: true,
                    url: url,
                    shareUrl: `${req.headers.origin || 'https://your-app.vercel.app'}/#/${url}`
                });
            }
        );
    }
    else if (method === 'GET' && query.url) {
        db.get("SELECT * FROM pastes WHERE url = ?", [query.url], (err, paste) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!paste || isPasteExpired(paste.createdAt, paste.expiration)) {
                return res.status(404).json({ error: 'Paste not found or expired' });
            }
            
            db.run("UPDATE pastes SET views = views + 1 WHERE id = ?", [paste.id]);
            
            res.json({
                url: paste.url,
                title: paste.title,
                content: paste.content,
                expiration: paste.expiration,
                isPrivate: paste.isPrivate === 1,
                createdAt: paste.createdAt,
                views: paste.views + 1
            });
        });
    }
    else if (method === 'GET') {
        const limit = query.limit || 6;
        
        db.all(
            "SELECT url, title, content, createdAt, views, expiration FROM pastes WHERE isPrivate = 0 ORDER BY createdAt DESC LIMIT ?",
            [limit],
            (err, pastes) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                
                const validPastes = pastes.filter(paste => 
                    !isPasteExpired(paste.createdAt, paste.expiration)
                );
                
                res.json(validPastes);
            }
        );
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
