import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  console.log('API route started');
  
  try {
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body parsed successfully');
    } catch (e) {
      console.error('Error parsing request body:', e);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Validate request body
    const { fileContent } = body;
    if (!fileContent) {
      console.error('No file content provided');
      return NextResponse.json(
        { error: 'No file content provided' },
        { status: 400 }
      );
    }

    console.log('File content length:', fileContent.length);

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('Making request to Claude...');

    // Make request to Claude
    try {
      // Verify API key format
      if (!process.env.ANTHROPIC_API_KEY?.startsWith('sk-')) {
        console.error('Invalid API key format');
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 500 }
        );
      }

      console.log('Making Claude API request...');
      const message = await anthropic.messages.create({
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
${fileContent}`
        }]
      });

      console.log('Received response from Claude');

      if (!message.content[0]?.text) {
        console.error('No content in Claude response');
        return NextResponse.json(
          { error: 'Empty response from analysis service' },
          { status: 500 }
        );
      }

      const responseText = message.content[0].text;
      console.log('Claude response text:', responseText.substring(0, 100) + '...');

      // Parse JSON response
      try {
        const cleanedText = responseText.trim()
          .replace(/```json\n?/, '')
          .replace(/```$/, '');
        
        const analysisData = JSON.parse(cleanedText);
        console.log('Successfully parsed JSON response');

        // Validate response structure
        const requiredFields = ['propertyAddress', 'issues', 'recommendations', 'summary'];
        const missingFields = requiredFields.filter(field => !analysisData[field]);

        if (missingFields.length > 0) {
          console.error('Missing required fields:', missingFields);
          return NextResponse.json(
            { 
              error: 'Invalid response format',
              details: `Missing fields: ${missingFields.join(', ')}`
            },
            { status: 500 }
          );
        }

        return NextResponse.json(analysisData);
      } catch (e) {
        console.error('Error parsing Claude response:', e);
        console.error('Raw response:', responseText);
        return NextResponse.json(
          { 
            error: 'Error parsing analysis results',
            details: e.message
          },
          { status: 500 }
        );
      }
    } catch (e) {
      console.error('Error calling Claude API:', e);
      
      // Handle specific Claude API errors
      if (e.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed - please check API key' },
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

      return NextResponse.json(
        { 
          error: 'Error analyzing document',
          details: e.message,
          status: e.status
        },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error('Unexpected error:', e);
    return NextResponse.json(
      { 
        error: 'Server error',
        details: e.message
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;