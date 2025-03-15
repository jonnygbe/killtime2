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

## Features

- Smart video recommendations based on your interests
- Time-based filtering (1-15 minutes)
- English language content filtering
- Progress tracking
- Mobile-friendly interface

## Security Notes

- Never commit the `.env` file
- Always use environment variables for API keys
- The `.env.example` file shows required variables without actual values 