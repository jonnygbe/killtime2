require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// YouTube API setup
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Endpoint to provide YouTube API key to client
app.get('/api/youtube-key', (req, res) => {
    // Only provide the key if it exists in environment variables
    if (process.env.YOUTUBE_API_KEY) {
        res.json({ key: process.env.YOUTUBE_API_KEY });
    } else {
        res.status(404).json({ error: 'API key not configured on server' });
    }
});

app.post('/search', async (req, res) => {
    try {
        const { query, duration } = req.body;
        
        // Search for videos
        const searchResponse = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: 'video',
            videoEmbeddable: 'true',
            videoSyndicated: 'true',
            maxResults: 20,
            relevanceLanguage: 'en'
        });

        if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
            throw new Error('No videos found');
        }

        // Get video details
        const videoIds = searchResponse.data.items.map(item => item.id.videoId);
        const videosResponse = await youtube.videos.list({
            part: 'contentDetails,statistics,status,snippet',
            id: videoIds.join(',')
        });

        // Filter and sort videos
        const videos = videosResponse.data.items
            .filter(video => {
                if (!video.status.embeddable) return false;
                
                const videoDuration = parseDuration(video.contentDetails.duration);
                if (videoDuration > duration) return false;

                const language = video.snippet.defaultAudioLanguage || video.snippet.defaultLanguage || '';
                if (language && !language.startsWith('en')) return false;

                return true;
            })
            .map(video => ({
                id: video.id,
                title: video.snippet.title,
                channelTitle: video.snippet.channelTitle,
                duration: parseDuration(video.contentDetails.duration),
                viewCount: parseInt(video.statistics.viewCount || '0')
            }));

        if (videos.length === 0) {
            throw new Error('No suitable videos found');
        }

        // Sort by view count and pick a random one from top 5
        videos.sort((a, b) => b.viewCount - a.viewCount);
        const topVideos = videos.slice(0, Math.min(5, videos.length));
        const selectedVideo = topVideos[Math.floor(Math.random() * topVideos.length)];

        res.json(selectedVideo);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

function parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '0H').slice(0, -1);
    const minutes = (match[2] || '0M').slice(0, -1);
    const seconds = (match[3] || '0S').slice(0, -1);
    return (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(seconds);
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 