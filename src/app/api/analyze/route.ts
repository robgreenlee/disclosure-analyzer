import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

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

    // Set maximum content size for analysis
    const MAX_CHUNK_SIZE = 250000; // Increased to handle larger documents
    let contentToAnalyze = fileContent;

    if (fileContent.length > MAX_CHUNK_SIZE) {
      console.log(`[${requestId}] Content too long (${fileContent.length} chars), truncating to ~${MAX_CHUNK_SIZE} characters`);
      
      // Try to break at a paragraph or sentence
      const breakPoint = fileContent.lastIndexOf('\n', MAX_CHUNK_SIZE);
      const periodBreak = fileContent.lastIndexOf('. ', MAX_CHUNK_SIZE);
      const bestBreak = breakPoint > periodBreak ? breakPoint : periodBreak;
      const breakAt = bestBreak > 0 ? bestBreak : MAX_CHUNK_SIZE;
      
      console.log(`[${requestId}] Breaking at position ${breakAt} (${bestBreak > 0 ? 'natural break' : 'forced break'})`);
      contentToAnalyze = fileContent.substring(0, breakAt);
      
      // Log the first and last 100 chars of truncated content
      console.log(`[${requestId}] Truncated content start: "${contentToAnalyze.substring(0, 100)}..."`);
      console.log(`[${requestId}] Truncated content end: "...${contentToAnalyze.substring(contentToAnalyze.length - 100)}"`);
      console.log(`[${requestId}] Final truncated length: ${contentToAnalyze.length} chars`);
    }

    // Call Claude API
    try {
      console.log(`[${requestId}] Calling Claude API`);
      
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || ''
      });
      
      console.log(`[${requestId}] Sending request to Claude with content length:`, contentToAnalyze.length);
      
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0,
        system: "You are a real estate disclosure analyzer. Return only JSON.",
        messages: [{
          role: 'user',
          content: `Analyze this document and return a JSON object. Format:
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
        console.error(`[${requestId}] Claude 400 error details:`, {
          error: e,
          requestSize: contentToAnalyze.length,
          messagePreview: contentToAnalyze.substring(0, 100)
        });
        return NextResponse.json(
          { 
            error: 'Invalid request to AI service - content may be too long',
            details: e.message,
            contentLength: contentToAnalyze.length
          },
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
