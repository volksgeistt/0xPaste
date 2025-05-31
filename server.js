const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

const dbPath = path.join(__dirname, 'pastes.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});

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
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Pastes table ready');
        }
    });
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
        case '1day':
            return diffInMs > 24 * 60 * 60 * 1000;
        case '1week':
            return diffInMs > 7 * 24 * 60 * 60 * 1000;
        case '1month':
            return diffInMs > 30 * 24 * 60 * 60 * 1000;
        case '3months':
            return diffInMs > 90 * 24 * 60 * 60 * 1000;
        default:
            return false;
    }
}

function cleanupExpiredPastes() {
    db.all("SELECT * FROM pastes WHERE expiration != 'never'", (err, rows) => {
        if (err) {
            console.error('Error fetching pastes for cleanup:', err);
            return;
        }
        
        if (rows && rows.length > 0) {
            rows.forEach(paste => {
                if (isPasteExpired(paste.createdAt, paste.expiration)) {
                    db.run("DELETE FROM pastes WHERE id = ?", [paste.id], (err) => {
                        if (err) {
                            console.error('Error deleting expired paste:', err);
                        } else {
                            console.log(`Deleted expired paste: ${paste.url}`);
                        }
                    });
                }
            });
        }
    });
}

setInterval(cleanupExpiredPastes, 60 * 60 * 1000);


app.post('/api/pastes', (req, res) => {
    const { title, content, expiration, isPrivate } = req.body;
    
    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Content is required' });
    }
    
    const url = generatePasteId();
    const pasteTitle = title?.trim() || 'Untitled';
    
    db.run(
        "INSERT INTO pastes (url, title, content, expiration, isPrivate) VALUES (?, ?, ?, ?, ?)",
        [url, pasteTitle, content, expiration || '1day', isPrivate ? 1 : 0],
        function(err) {
            if (err) {
                console.error('Error creating paste:', err);
                return res.status(500).json({ error: 'Failed to create paste' });
            }
            
            console.log(`Created paste: ${url} (ID: ${this.lastID})`);
            
            res.json({
                success: true,
                url: url,
                shareUrl: `${req.protocol}://${req.get('host')}/#/${url}`
            });
        }
    );
});

app.get('/api/pastes/:url', (req, res) => {
    const { url } = req.params;
    
    console.log(`Fetching paste: ${url}`);
    
    db.get("SELECT * FROM pastes WHERE url = ?", [url], (err, paste) => {
        if (err) {
            console.error('Error fetching paste:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!paste) {
            console.log(`Paste not found: ${url}`);
            return res.status(404).json({ error: 'Paste not found' });
        }
        
        if (isPasteExpired(paste.createdAt, paste.expiration)) {
            console.log(`Paste expired: ${url}`);
            db.run("DELETE FROM pastes WHERE id = ?", [paste.id]);
            return res.status(404).json({ error: 'Paste has expired' });
        }
        
        db.run("UPDATE pastes SET views = views + 1 WHERE id = ?", [paste.id], (updateErr) => {
            if (updateErr) {
                console.error('Error updating view count:', updateErr);
            }
        });
        
        console.log(`Serving paste: ${url} (views: ${paste.views + 1})`);
        
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
});

app.get('/api/pastes', (req, res) => {
    const limit = parseInt(req.query.limit) || 6;
    
    console.log(`Fetching recent pastes (limit: ${limit})`);
    
    db.all(
        "SELECT url, title, content, createdAt, views, expiration FROM pastes WHERE isPrivate = 0 ORDER BY createdAt DESC LIMIT ?",
        [limit],
        (err, pastes) => {
            if (err) {
                console.error('Error fetching recent pastes:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            const validPastes = (pastes || []).filter(paste => 
                !isPasteExpired(paste.createdAt, paste.expiration)
            );
            
            console.log(`Returning ${validPastes.length} recent pastes`);
            
            res.json(validPastes);
        }
    );
});

app.get('/api/debug/pastes', (req, res) => {
    db.all("SELECT * FROM pastes ORDER BY createdAt DESC", (err, pastes) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ 
            total: pastes ? pastes.length : 0,
            pastes: pastes || []
        });
    });
});

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
