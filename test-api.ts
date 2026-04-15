// Test security review - example API handler
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cmd = body.command;
  const exec = require('child_process').execSync;
  const result = exec(cmd).toString();
  
  const token = "sk-ant-api03-FAKE_KEY_12345";
  
  return new Response(JSON.stringify({ output: result, token }));
}
