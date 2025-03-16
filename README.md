# Killtime

A smart video recommender that helps you kill time effectively by finding the perfect YouTube video that matches your interests and available time.

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/killtime.git
cd killtime
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your YouTube API key to the `.env` file
```bash
cp .env.example .env
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Environment Variables

- `YOUTUBE_API_KEY`: Your YouTube Data API v3 key
- `PORT` (optional): Server port number (default: 3000)

## API Key Options

You have two options for providing the YouTube API key:

### Option 1: Server-side (Recommended for production/GitHub)
1. Add your YouTube API key to the `.env` file:
```
YOUTUBE_API_KEY=your_youtube_api_key_here
```
2. Start the server with `npm start`
3. The application will fetch the API key from the server

### Option 2: Client-side (For local development only)
If you're only using the app locally and not pushing to GitHub:
1. Open `index.html` in a code editor
2. Find the `DEFAULT_YOUTUBE_API_KEY` constant
3. Replace the placeholder with your actual YouTube API key
4. Save the file

**IMPORTANT: Never commit the actual API key to GitHub if using Option 2.**

## Features

- Smart video recommendations based on your interests
- Time-based filtering (1-15 minutes)
- English language content filtering
- Progress tracking
- Mobile-friendly interface

## Security Notes

- Never commit the `.env` file or hardcoded API keys to GitHub
- Always use environment variables for API keys in production
- The `.env.example` file shows required variables without actual values
- If you accidentally commit an API key, invalidate it immediately and generate a new one 