/**
 * POST /api/v1/messages
 * 
 * Receive a message, classify it, and return a response
 */

import { NextRequest, NextResponse } from 'next/server';
import type { CreateMessageRequest, ApiResponse, MessageResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CreateMessageRequest = await request.json();

    // Validate required fields
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid request: content is required and must be a string',
            code: 'BAD_REQUEST',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // TODO: Implement actual classification and processing
    // This is a stub for v0.1
    const response: MessageResponse = {
      success: true,
      message: {
        id: crypto.randomUUID(),
        user_id: 'placeholder-user-id',
        content: body.content,
        content_length: body.content.length,
        classification: 'task', // Placeholder
        classification_confidence: 0,
        ai_response: 'API endpoint is ready for implementation',
        language: body.language || 'en',
        source: body.source || 'api',
        tags: body.tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_archived: false,
        is_starred: false,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      } as ApiResponse<MessageResponse>,
      { status: 200 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({ ok: true });
}
