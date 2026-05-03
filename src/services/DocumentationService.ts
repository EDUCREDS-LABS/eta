import axios from "axios";
import * as cheerio from "cheerio";
import { convert } from "html-to-text";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export interface DocChunk {
    id: string;
    url: string;
    title: string;
    content: string;
}

export class DocumentationService {
    private chunks: DocChunk[] = [];
    private visitedUrls: Set<string> = new Set();
    private readonly baseUrl = "https://docs.educreds.xyz";

    constructor() {
        // Initialize with empty chunks
    }

    async loadDocs(): Promise<void> {
        console.log("[DocumentationService] Starting to load documentation...");
        // Start with the main page and a few key sections if known, or just crawl
        const initialUrls = [
            this.baseUrl,
            `${this.baseUrl}/educreds/educreds-whitepaper`,
            `${this.baseUrl}/educreds/litepaper-non-technical`,
            `${this.baseUrl}/educreds/introduction`
        ];

        // Add PoIC URL if configured
        const poicUrl = process.env.TRUST_AGENT_POIC_LIVE_URL;
        if (poicUrl) {
            console.log("[DocumentationService] Adding PoIC documentation URL...");
            initialUrls.push(poicUrl);
        }

        for (const url of initialUrls) {
            await this.fetchAndParse(url);
        }
        console.log(`[DocumentationService] Loaded ${this.chunks.length} chunks from ${this.visitedUrls.size} pages.`);
    }

    private async fetchAndParse(url: string): Promise<void> {
        if (this.visitedUrls.has(url)) return;
        this.visitedUrls.add(url);

        try {
            console.log(`[DocumentationService] Fetching ${url}...`);
            // Add timeout to prevent hanging indefinitely
            const response = await axios.get(url, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'User-Agent': 'EduCredsBot/1.0'
                }
            });
            const html = response.data;
            const $ = cheerio.load(html);
            const title = $("title").text() || url;

            // Convert HTML to text, preserving some structure
            const text = convert(html, {
                wordwrap: 130,
                selectors: [
                    { selector: 'a', options: { ignoreHref: true } },
                    { selector: 'img', format: 'skip' }
                ]
            });

            // Simple chunking by splitting on double newlines or max length
            // For now, we'll just store the whole page as one large chunk or split by headers if possible
            // A simple approach: split by paragraphs and group them
            const paragraphs = text.split(/\n\s*\n/);
            let currentChunk = "";

            for (const p of paragraphs) {
                if (currentChunk.length + p.length > 1000) {
                    this.chunks.push({
                        id: `${url}-${this.chunks.length}`,
                        url,
                        title,
                        content: currentChunk.trim()
                    });
                    currentChunk = "";
                }
                currentChunk += p + "\n\n";
            }

            if (currentChunk.trim().length > 0) {
                this.chunks.push({
                    id: `${url}-${this.chunks.length}`,
                    url,
                    title,
                    content: currentChunk.trim()
                });
            }

            console.log(`[DocumentationService] Successfully fetched ${url}, extracted ${this.chunks.length} chunks total`);
        } catch (error: any) {
            console.error(`[DocumentationService] Failed to fetch ${url}:`, error.message || error);
            // Don't rethrow - allow other docs to load even if one fails
        }
    }

    async search(query: string, limit: number = 3): Promise<DocChunk[]> {
        if (this.chunks.length === 0) {
            await this.loadDocs();
        }

        const queryTerms = query.toLowerCase().split(/\s+/);

        // Simple relevance scoring: count occurrences of query terms
        const scoredChunks = this.chunks.map(chunk => {
            let score = 0;
            const contentLower = chunk.content.toLowerCase();
            const titleLower = chunk.title.toLowerCase();

            for (const term of queryTerms) {
                if (contentLower.includes(term)) score += 1;
                if (titleLower.includes(term)) score += 2; // Title match weighted higher
            }

            return { chunk, score };
        });

        // Sort by score descending
        scoredChunks.sort((a, b) => b.score - a.score);

        // Return top N chunks with score > 0
        return scoredChunks
            .filter(item => item.score > 0)
            .slice(0, limit)
            .map(item => item.chunk);
    }
}

export const documentationService = new DocumentationService();
