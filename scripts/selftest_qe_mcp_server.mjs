#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverPath = resolve(process.cwd(), 'scripts', 'qe_mcp_server.mjs');

function encode(message) {
  const json = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
}

function createClient() {
  const child = spawn(process.execPath, [serverPath], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
  });

  let buffer = Buffer.alloc(0);
  const pending = new Map();

  child.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const header = buffer.slice(0, headerEnd).toString('utf8');
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      const length = Number(match[1]);
      const end = headerEnd + 4 + length;
      if (buffer.length < end) return;
      const body = buffer.slice(headerEnd + 4, end).toString('utf8');
      buffer = buffer.slice(end);
      const message = JSON.parse(body);
      const resolver = pending.get(message.id);
      if (resolver) {
        pending.delete(message.id);
        resolver(message);
      }
    }
  });

  let nextId = 1;
  return {
    child,
    request(method, params = {}) {
      const id = nextId++;
      const message = { jsonrpc: '2.0', id, method, params };
      child.stdin.write(encode(message));
      return new Promise((resolvePromise) => pending.set(id, resolvePromise));
    },
    notify(method, params = {}) {
      child.stdin.write(encode({ jsonrpc: '2.0', method, params }));
    },
    close() {
      child.kill();
    },
  };
}

async function main() {
  const client = createClient();
  try {
    const init = await client.request('initialize', { protocolVersion: '2025-03-26', capabilities: {} });
    client.notify('notifications/initialized');
    const tools = await client.request('tools/list');
    const resources = await client.request('resources/list');
    const skill = await client.request('tools/call', {
      name: 'qe_read_skill',
      arguments: { name: 'Qhelp' },
    });

    if (!init.result?.serverInfo?.name) throw new Error('initialize failed');
    if (!Array.isArray(tools.result?.tools) || tools.result.tools.length === 0) {
      throw new Error('tools/list returned no tools');
    }
    if (!Array.isArray(resources.result?.resources) || resources.result.resources.length === 0) {
      throw new Error('resources/list returned no resources');
    }
    if (!skill.result?.structuredContent?.content?.includes('Qhelp')) {
      throw new Error('qe_read_skill failed to return Qhelp content');
    }

    console.log('qe_mcp_server_ok');
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
