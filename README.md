# SEO Content Creator

A production-ready Next.js application that generates perfectly optimized SEO content using Anthropic Claude. The app scrapes a given website for context, infers tone and style, then produces meta tags, a fully formatted article with proper heading hierarchy, FAQs, and JSON-LD schema.

## Features

- **Website Context Scraping**: Automatically crawls and extracts content from your website to understand your brand voice and facts
- **AI-Powered Content Generation**: Uses Claude 3.5 Sonnet with a 3-pass refinement process for accuracy, tone, and SEO optimization
- **Complete SEO Package**: Generates meta title, meta description, article content, FAQ, and JSON-LD schema
- **Anti-Hallucination**: Strictly uses only facts from your scraped website context - no invented statistics or claims
- **Proper Heading Structure**: Renders content with real HTML headings (H1-H4) for proper semantic structure
- **Length Control**: Enforces target word count within ±5% accuracy
- **Source Transparency**: Shows which pages were used to generate the content
- **Copy-to-Clipboard**: Easy copying of all generated sections

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **AI**: Anthropic Claude API (@anthropic-ai/sdk)
- **Scraping**: axios + cheerio
- **Markdown**: react-markdown + remark-gfm
- **Validation**: zod
- **Concurrency**: p-limit
- **Hosting**: Vercel

## Prerequisites

- Node.js 18 or higher
- Anthropic API key (get one at https://console.anthropic.com)
- npm or yarn

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd seo-content-creator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Optional environment variables with their defaults:

```env
# Claude model to use (default: claude-3-5-sonnet-20240620)
CLAUDE_MODEL=claude-3-5-sonnet-20240620

# Maximum pages to scrape (default: 10)
SCRAPE_MAX_PAGES=10

# Concurrent scraping requests (default: 3)
SCRAPE_CONCURRENCY=3

# Timeout per page in milliseconds (default: 12000)
SCRAPE_TIMEOUT_MS=12000

# AI temperature (default: 0.2)
PROMPT_TEMPERATURE=0.2
```

### 4. Run the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Deployment to Vercel

### Method 1: Deploy via GitHub

1. Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. Go to [Vercel](https://vercel.com) and sign in
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure environment variables:
   - Click "Environment Variables"
   - Add `ANTHROPIC_API_KEY` with your API key
   - Add any other optional variables if needed
6. Click "Deploy"

### Method 2: Deploy via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts and add your environment variables when asked.

## Usage

1. **Enter Website URL**: The main URL of the website you want to use for context
2. **Enter Topic**: The subject of the article you want to generate (3-140 characters)
3. **Enter Keywords**: Comma-separated keywords to include naturally (up to 12)
4. **Set Length**: Target word count for the article (300-3000 words)
5. **Click Generate**: Wait 1-2 minutes while the app:
   - Crawls your website
   - Extracts context
   - Generates content in 3 refinement passes
   - Returns optimized content

## How It Works

### 1. Website Scraping

- Starts from the main URL you provide
- Extracts meaningful text content (headings, paragraphs, lists)
- Finds and prioritizes important internal pages (about, services, products, etc.)
- Crawls up to `SCRAPE_MAX_PAGES` pages with smart prioritization
- Builds a context string with all extracted content

### 2. AI Content Generation (3-Pass Refinement)

**Pass 1: Initial Draft**
- Uses the full site context
- Generates meta title, meta description, article content, FAQ, and JSON-LD schema
- Follows strict anti-hallucination rules

**Pass 2: Refinement**
- Reviews accuracy against site context
- Adjusts tone to match site voice
- Optimizes for SEO (meta lengths, keyword placement)
- Adjusts length to match target ±5%

**Pass 3: Final Polish**
- Micro-edits for clarity and flow
- Verifies heading hierarchy
- Validates schema JSON
- Final length check

### 3. Content Output

The app generates:

- **Meta Title**: 50-60 characters, includes primary keyword
- **Meta Description**: 150-160 characters, compelling and accurate
- **Article Content**: Markdown with H1-H4 headings, rendered as real HTML headings
- **FAQ**: 3-5 Q&A pairs based on site context
- **JSON-LD Schema**: Valid Article and FAQPage schema
- **Sources List**: Shows which pages were used

## Anti-Hallucination Features

The app enforces strict rules to prevent AI hallucinations:

- ✅ Only uses facts explicitly present in scraped site content
- ✅ Omits details not found in site context rather than inventing them
- ✅ No external statistics, dates, prices, or quotes unless in site text
- ✅ No invented client names, certifications, or testimonials
- ✅ Site context is included in ALL three AI passes for consistency

## Global Writing Rules

- **No em dashes**: The app never uses em dashes, only normal hyphens
- **Natural phrasing**: Varies sentence length for human-like writing
- **No keyword stuffing**: Uses keywords only where natural
- **No clichés**: Removes robotic phrases and overused expressions

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts        # Main API endpoint
│   ├── page.tsx                # Home page component
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
├── components/
│   ├── CopyButton.tsx          # Copy-to-clipboard button
│   ├── Form.tsx                # Input form component
│   ├── Loading.tsx             # Loading spinner
│   └── ResultView.tsx          # Results display
├── lib/
│   ├── ai.ts                   # Claude API integration
│   ├── normalize.ts            # Utility functions
│   ├── parse.ts                # Output parsing
│   ├── prompts.ts              # Prompt templates
│   ├── scrape.ts               # Web scraping logic
│   └── typing.ts               # TypeScript interfaces
├── .env.example                # Example environment variables
├── .gitignore
├── next.config.mjs
├── package.json
├── README.md
└── tsconfig.json
```

## Troubleshooting

### No content extracted from website

- The site may be JavaScript-rendered (SPA). The scraper works best with server-rendered HTML.
- The site may be blocking automated requests. Check if the site is accessible.

### API rate limits

- Anthropic has rate limits. If you hit them, wait a few moments and try again.
- Consider reducing `SCRAPE_MAX_PAGES` to reduce context size and API calls.

### Content too short or too long

- The AI aims for ±5% of target length but may struggle if site context is very limited.
- Try adjusting the target length or providing a site with more content.

### Build errors

- Ensure all dependencies are installed: `npm install`
- Check that your Node.js version is 18+
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

## Development

### Build for production

```bash
npm run build
npm start
```

### Lint code

```bash
npm run lint
```

## License

MIT

## Notes

- **Rendering**: The app renders headings as real H1-H4 elements on the page, not as code snippets
- **Model**: Uses `claude-3-5-sonnet-20240620` by default for best quality
- **Concurrency**: Default of 3 concurrent requests balances speed and politeness
- **Context size**: Each page is limited to ~1200 words to maintain signal quality
- **Timeout**: 12-second timeout per page prevents hanging on slow sites

## Support

For issues or questions:
1. Check this README
2. Review the code comments
3. Check Anthropic API documentation
4. Open an issue on GitHub

---

Built with Next.js 14, TypeScript, and Anthropic Claude.
