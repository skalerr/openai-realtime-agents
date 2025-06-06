import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Proxy endpoint for the OpenAI Responses API
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (process.env.OLLAMA_BASE_URL) {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'ollama',
      baseURL: process.env.OLLAMA_BASE_URL,
    });
    return await ollamaResponse(openai, body);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (body.text?.format?.type === 'json_schema') {
    return await structuredResponse(openai, body);
  } else {
    return await textResponse(openai, body);
  }
}

async function structuredResponse(openai: OpenAI, body: any) {
  try {
    const response = await openai.responses.parse({
      ...(body as any),
      stream: false,
    } as any);

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 }); 
  }
}

async function textResponse(openai: OpenAI, body: any) {
  try {
    const response = await openai.responses.create({
      ...(body as any),
      stream: false,
    } as any);

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

async function ollamaResponse(openai: OpenAI, body: any) {
  try {
    const messages = (body.input || [])
      .filter((item: any) => item.type === 'message')
      .map((item: any) => ({ role: item.role, content: item.content }));

    const resp = await openai.chat.completions.create({
      model: body.model,
      messages,
      tools: body.tools,
      stream: false,
    } as any);

    const choice = resp.choices?.[0]?.message;
    const output: any[] = [];

    for (const tc of choice?.tool_calls || []) {
      output.push({
        type: 'function_call',
        call_id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      });
    }

    if (choice?.content) {
      output.push({
        type: 'message',
        content: [{ type: 'output_text', text: choice.content }],
      });
    }

    return NextResponse.json({ output });
  } catch (err: any) {
    console.error('ollama proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
  