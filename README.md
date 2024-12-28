# Real Estate Disclosure Analyzer

An AI-powered tool that analyzes real estate disclosure documents and provides detailed insights about potential issues and recommendations.

## Features

- Upload and analyze PDF or text disclosure documents
- AI-powered analysis using Claude
- Detailed breakdown of issues and recommendations
- Cost estimates for repairs
- Email-ready summary generation

## Tech Stack

- Next.js 13 with App Router
- TypeScript
- Tailwind CSS
- Claude AI API
- PDF.js for PDF parsing

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and add your Anthropic API key:
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

This project is deployed on Vercel. To deploy your own instance:

1. Fork this repository
2. Create a new project on Vercel
3. Connect your forked repository
4. Add your environment variables in the Vercel dashboard
5. Deploy!

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Claude API key from Anthropic

## Rate Limiting

The API is rate-limited to prevent abuse:
- 5 requests per minute per IP
- Maximum file size: 10MB
- Supported file types: PDF, TXT

## License

MIT
