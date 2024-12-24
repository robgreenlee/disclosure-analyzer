import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    // Get client IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    console.log('Received API request from:', ip);

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Check rate limit
    const { incrementRateLimit, getRateLimitInfo } = await import('@/utils/rateLimit');
    const rateLimitInfo = getRateLimitInfo(ip);
    
    if (!incrementRateLimit(ip)) {
      console.log('Rate limit exceeded for IP:', ip);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          rateLimitInfo
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'X-RateLimit-Reset': rateLimitInfo.reset.toString(),
          }
        }
      );
    }
    
    const { fileContent } = await request.json();
    console.log('File content received, length:', fileContent?.length || 0);

    if (!fileContent) {
      console.error('No file content provided');
      return NextResponse.json(
        { error: 'No file content provided' },
        { status: 400 }
      );
    }

    console.log('Processing file content, first 100 chars:', fileContent.substring(0, 100));
    
    // Calculate content size in MB
    const contentSizeInMB = new Blob([fileContent]).size / (1024 * 1024);
    console.log(`Content size: ${contentSizeInMB.toFixed(2)} MB`);
    console.log(`Content length in characters: ${fileContent.length}`);

    // Claude-3 can handle up to 100k tokens
    const MAX_CHUNK_SIZE = 75000; // Increased from 32k to 75k characters
    let finalContent = fileContent;
    
    if (fileContent.length > MAX_CHUNK_SIZE) {
      console.log(`Content length (${fileContent.length}) exceeds max size (${MAX_CHUNK_SIZE}), processing first chunk`);
      // Take the first chunk but try to break at a natural point like a newline
      const breakPoint = fileContent.lastIndexOf('\n', MAX_CHUNK_SIZE);
      const chunkSize = breakPoint > 0 ? breakPoint : MAX_CHUNK_SIZE;
      finalContent = fileContent.substring(0, chunkSize);
      console.log(`Using first ${chunkSize} characters for analysis`);
    }

    // Send to Claude for analysis
    console.log('Sending content to Claude for analysis...');
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      temperature: 0, // Add deterministic output
      messages: [{
        role: 'system',
        content: 'You are a real estate disclosure document analyzer. Your responses must be valid JSON objects only, no other text.'
      }, {
        role: 'user',
        content: `Analyze this real estate disclosure document and extract key information. Return ONLY a JSON object with this exact structure:

1. Return ONLY a JSON object - no other text or formatting
2. Ensure the JSON is properly formatted and valid
3. Include all required fields
4. Be concise but specific in descriptions

Required fields:
- propertyAddress: Extract from document, use "Address not found" if unclear
- issues: Array of problems found
- recommendations: Array of suggested actions
- summary: Brief overview

Example of expected format:
{
  "propertyAddress": "123 Main St, City, State",
  "issues": [{"issue": "Roof damage", "severity": "High", "details": "Multiple leaks", "estimatedCost": "$5,000-$8,000"}],
  "recommendations": [{"action": "Replace roof", "priority": "High", "timeframe": "Within 1 month"}],
  "summary": "Property requires immediate attention to roof issues"
}

Analyze this document:

{
  "propertyAddress": "The complete property address found in the document",
  "issues": [
    {
      "issue": "Description of the issue",
      "severity": "Low" | "Medium" | "High",
      "details": "Additional details about the issue",
      "estimatedCost": "Rough cost estimate range"
    }
  ],
  "recommendations": [
    {
      "action": "Specific action item",
      "priority": "Low" | "Medium" | "High",
      "timeframe": "Suggested timeframe"
    }
  ],
  "summary": "A brief executive summary of the findings"
}

Guidelines:
- Return ONLY the JSON object, no other text
- Severity levels:
  * Low: Cosmetic or minor maintenance issues
  * Medium: Issues requiring attention but not immediate threats
  * High: Safety concerns or major structural issues
- Ensure all JSON fields are properly formatted
- Include specific cost estimates where possible

Here's the document content to analyze:
${fileContent}`
      }]
    });

    console.log('Claude raw response:', message.content[0].text);
    const analysisText = message.content[0].text;
    
    // Parse the JSON response
    try {
      // Try to clean the response if needed
      let cleanedText = analysisText.trim();
      
      // Remove any markdown code block syntax
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/, '').replace(/```$/, '');
      }
      
      console.log('Cleaned text:', cleanedText);
      
      const analysisData = JSON.parse(cleanedText);
      console.log('Parsed data:', analysisData);
      
      // Validate the response structure
      if (!analysisData.propertyAddress || !analysisData.issues || !analysisData.recommendations || !analysisData.summary) {
        console.error('Missing required fields in response. Fields present:', Object.keys(analysisData));
        throw new Error('Invalid response structure - missing required fields');
      }
      
      return NextResponse.json(analysisData);
    } catch (e) {
      console.error('Error parsing analysis:', e);
      console.error('Raw text:', analysisText);
      
      // Try to clean up common formatting issues
      try {
        let fixedText = analysisText
          .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
          .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes
          .replace(/\n/g, ' ') // Remove newlines
          .trim();
        
        // Try to find JSON-like content
        const jsonMatch = fixedText.match(/\{.*\}/s);
        if (jsonMatch) {
          fixedText = jsonMatch[0];
          const fixedData = JSON.parse(fixedText);
          console.log('Successfully fixed JSON:', fixedData);
          return NextResponse.json(fixedData);
        }
      } catch (fixError) {
        console.error('Failed to fix JSON:', fixError);
      }
      
      return NextResponse.json(
        { 
          error: 'Error parsing analysis results. Please try again.',
          details: e.message,
          rawText: analysisText.substring(0, 200) + '...' // First 200 chars for debugging
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { 
        error: 'Error processing file',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Increase to 5 minutes
export const bodyParser = {
  sizeLimit: '10mb'
};