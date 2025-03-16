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

// Cache for YouTube API responses to reduce quota usage
const apiCache = {
    searches: {},
    videoDetails: {}
};

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

// Endpoint to provide OpenAI API key to client
app.get('/api/openai-key', (req, res) => {
    // Only provide the key if it exists in environment variables
    if (process.env.OPENAI_API_KEY) {
        res.json({ key: process.env.OPENAI_API_KEY });
    } else {
        res.status(404).json({ error: 'OpenAI API key not configured on server' });
    }
});

// Rate limiting variables
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_HOUR = 50; // Limit to 50 requests per hour

// Middleware for rate limiting
function rateLimiter(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    
    // Initialize or clean up old entries
    if (!requestCounts[ip] || now - requestCounts[ip].timestamp > RATE_LIMIT_WINDOW) {
        requestCounts[ip] = {
            count: 0,
            timestamp: now
        };
    }
    
    // Increment count
    requestCounts[ip].count++;
    
    // Check if over limit
    if (requestCounts[ip].count > MAX_REQUESTS_PER_HOUR) {
        return res.status(429).json({ 
            error: 'Rate limit exceeded. Please try again later.',
            message: 'To prevent API quota exhaustion, we limit requests to 50 per hour.'
        });
    }
    
    next();
}

app.post('/search', rateLimiter, async (req, res) => {
    try {
        const { query, duration } = req.body;
        
        // Check cache first
        const cacheKey = `${query}-${duration}`;
        if (apiCache.searches[cacheKey]) {
            console.log('Cache hit for search:', cacheKey);
            return res.json(apiCache.searches[cacheKey]);
        }
        
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
        
        // Check cache for video details
        let videosToFetch = [];
        let cachedVideos = [];
        
        videoIds.forEach(id => {
            if (apiCache.videoDetails[id]) {
                cachedVideos.push(apiCache.videoDetails[id]);
            } else {
                videosToFetch.push(id);
            }
        });
        
        let fetchedVideos = [];
        if (videosToFetch.length > 0) {
            const videosResponse = await youtube.videos.list({
                part: 'contentDetails,statistics,status,snippet',
                id: videosToFetch.join(',')
            });
            
            // Cache the fetched videos
            videosResponse.data.items.forEach(video => {
                apiCache.videoDetails[video.id] = video;
            });
            
            fetchedVideos = videosResponse.data.items;
        }
        
        // Combine cached and fetched videos
        const allVideos = [...cachedVideos, ...fetchedVideos];

        // Filter and sort videos
        const videos = allVideos
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
        
        // Cache the result
        apiCache.searches[cacheKey] = selectedVideo;
        
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

// Clear cache periodically to prevent memory issues
setInterval(() => {
    console.log('Clearing API cache');
    apiCache.searches = {};
    // Keep video details cache as it's more valuable
}, 24 * 60 * 60 * 1000); // Clear search cache once a day

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 