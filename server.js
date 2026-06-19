import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors()); 
app.use(express.json());

// 1. Validate link and get metadata
app.post('/api/validate', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        let targetUrl = url;
        if (url.includes('dropbox.com')) {
            targetUrl = url.replace('dl=0', 'dl=1');
        }

        const response = await fetch(targetUrl, { method: 'HEAD' });
        
        if (!response.ok) {
            return res.status(404).json({ valid: false, error: 'File not found or link broken' });
        }

        const contentType = response.headers.get('content-type') || 'unknown';
        const contentLength = response.headers.get('content-length') || 'unknown';
        
        res.json({
            valid: true,
            contentType,
            size: contentLength !== 'unknown' ? parseInt(contentLength) : 'unknown',
            downloadUrl: targetUrl
        });
    } catch (error) {
        res.status(500).json({ valid: false, error: 'Could not connect to the link' });
    }
});

// 2. Proxy download to bypass CORS
app.get('/api/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL is required');

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');

        res.setHeader('Content-Type', response.headers.get('content-type'));
        res.setHeader('Content-Disposition', `attachment; filename="downloaded_file"`);

        response.body.pipe(res);
    } catch (error) {
        res.status(500).send('Error downloading file via proxy');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
