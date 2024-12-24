import { NextResponse } from 'next/server';
import pkg from '../../../../package.json';

export async function GET() {
  return NextResponse.json({
    version: pkg.version,
    dependencies: {
      anthropicSdk: pkg.dependencies['@anthropic-ai/sdk'],
      next: pkg.dependencies.next
    },
    timestamp: new Date().toISOString()
  });
}