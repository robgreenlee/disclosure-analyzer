import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client outside request handler
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Starting request processing`);

  try {
    // Validate environment
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(`[${requestId}] Missing ANTHROPIC_API_KEY`);
      return NextResponse.json(
        { error: 'Server configuration error - missing API key' },
        { status: 500 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-')) {
      console.error(`[${requestId}] Invalid API key format`);
      return NextResponse.json(
        { error: 'Server configuration error - invalid API key' },
        { status: 500 }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log(`[${requestId}] Request body parsed`);
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Validate request data
    const { fileContent } = requestBody;
    if (!fileContent) {
      console.error(`[${requestId}] No file content provided`);
      return NextResponse.json(
        { error: 'No content provided for analysis' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Content length: ${fileContent.length}`);

    // Split content if too long (Claude has a ~100k character limit)
    const MAX_CHUNK_SIZE = 50000; // Conservative limit
    let contentToAnalyze = fileContent;

    if (fileContent.length > MAX_CHUNK_SIZE) {
      console.log(`[${requestId}] Content too long, truncating to ${MAX_CHUNK_SIZE} characters`);
      // Try to break at a paragraph or sentence
      const breakPoint = fileContent.lastIndexOf('\n', MAX_CHUNK_SIZE);
      const periodBreak = fileContent.lastIndexOf('. ', MAX_CHUNK_SIZE);
      const bestBreak = breakPoint > periodBreak ? breakPoint : periodBreak;
      contentToAnalyze = fileContent.substring(0, bestBreak > 0 ? bestBreak : MAX_CHUNK_SIZE);
      console.log(`[${requestId}] Truncated content length: ${contentToAnalyze.length}`);
    }

    // Call Claude API
    try {
      console.log(`[${requestId}] Calling Claude API`);
      
      const message = await anthropicClient.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        temperature: 0,
        messages: [{
          role: 'system',
          content: 'You are a real estate disclosure document analyzer. Return only valid JSON.'
        }, {
          role: 'user',
          content: `Analyze this document and return a JSON object with this structure:
{
  "propertyAddress": "string",
  "issues": [
    {
      "issue": "string",
      "severity": "Low" | "Medium" | "High",
      "details": "string",
      "estimatedCost": "string"
    }
  ],
  "recommendations": [
    {
      "action": "string",
      "priority": "Low" | "Medium" | "High",
      "timeframe": "string"
    }
  ],
  "summary": "string"
}

Document content:
${contentToAnalyze}

Note: ${fileContent.length > MAX_CHUNK_SIZE ? 'This is a truncated version of a longer document. Analysis is based on the first section only.' : 'This is the complete document.'}`
        }]
      });

      console.log(`[${requestId}] Received Claude response`);

      // Validate Claude response
      if (!message.content[0]?.text) {
        console.error(`[${requestId}] Empty response from Claude`);
        return NextResponse.json(
          { error: 'Empty response from analysis service' },
          { status: 500 }
        );
      }

      // Parse and validate JSON response
      try {
        const responseText = message.content[0].text;
        console.log(`[${requestId}] Raw response preview:`, responseText.substring(0, 100));

        // Clean the response text
        const cleanedText = responseText
          .trim()
          .replace(/```json\n?/, '')
          .replace(/```$/, '');

        // Parse JSON
        const analysisData = JSON.parse(cleanedText);
        console.log(`[${requestId}] Successfully parsed response`);

        // Validate required fields
        const requiredFields = ['propertyAddress', 'issues', 'recommendations', 'summary'];
        const missingFields = requiredFields.filter(field => !analysisData[field]);

        if (missingFields.length > 0) {
          console.error(`[${requestId}] Missing fields in response:`, missingFields);
          return NextResponse.json({
            error: 'Invalid response format',
            details: `Missing required fields: ${missingFields.join(', ')}`
          }, { status: 500 });
        }

        // Return successful response
        console.log(`[${requestId}] Returning successful response`);
        return NextResponse.json(analysisData);

      } catch (e) {
        console.error(`[${requestId}] Failed to parse Claude response:`, e);
        return NextResponse.json({
          error: 'Failed to parse analysis results',
          details: e.message
        }, { status: 500 });
      }

    } catch (e: any) {
      console.error(`[${requestId}] Claude API error:`, {
        status: e.status,
        message: e.message,
        type: e.type
      });

      // Handle specific Claude API errors
      if (e.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed - invalid API key' },
          { status: 500 }
        );
      }

      if (e.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded - please try again later' },
          { status: 500 }
        );
      }

      if (e.status === 400) {
        return NextResponse.json(
          { error: 'Invalid request to AI service - content may be too long' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        error: 'Error analyzing document',
        details: e.message,
        status: e.status
      }, { status: 500 });
    }

  } catch (e) {
    console.error(`[${requestId}] Unexpected error:`, e);
    return NextResponse.json({
      error: 'Unexpected server error',
      details: e.message
    }, { status: 500 });
  }
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;