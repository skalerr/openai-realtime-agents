import { NextRequest, NextResponse } from 'next/server';

// Proxy endpoint for Ollama
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!process.env.OLLAMA_BASE_URL) {
    return NextResponse.json(
      { error: 'Server misconfigured: set OLLAMA_BASE_URL' },
      { status: 500 },
    );
  }

  return await ollamaResponse(body);
}

async function ollamaResponse(body: any) {
  try {
    const messages = (body.input || [])
      .filter((item: any) => item.type === 'message')
      .map((item: any) => ({ role: item.role, content: item.content }));

    const resp = await fetch(
      `${process.env.OLLAMA_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: body.model,
          messages,
          tools: body.tools,
          stream: false,
        }),
      },
    );

    const data = await resp.json();
    const choice = data.choices?.[0]?.message;
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
  