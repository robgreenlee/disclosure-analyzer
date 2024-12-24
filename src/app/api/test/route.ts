import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'API key not configured',
        keyExists: false
      });
    }

    // Check API key format
    const keyFormat = process.env.ANTHROPIC_API_KEY.startsWith('sk-');
    
    // Initialize Anthropic (this won't make an API call)
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    return NextResponse.json({
      status: 'success',
      message: 'API key configured',
      keyExists: true,
      keyFormat: keyFormat,
      keyLength: process.env.ANTHROPIC_API_KEY.length
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    });
  }
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';