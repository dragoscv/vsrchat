import { describe, expect, it } from 'vitest';
import { parseSession } from './sessionStore.js';

describe('parseSession', () => {
  it('parses requests with message + response array', () => {
    const json = {
      sessionId: 'abc',
      requests: [
        {
          message: { text: 'hello' },
          response: [{ value: 'hi ' }, { value: 'there' }],
          timestamp: 1700000000000,
        },
      ],
    };
    const detail = parseSession(json, 'C:/x/abc.json');
    expect(detail?.id).toBe('abc');
    expect(detail?.messages).toHaveLength(2);
    expect(detail?.messages[0]).toMatchObject({ role: 'user', text: 'hello' });
    expect(detail?.messages[1]).toMatchObject({ role: 'assistant', text: 'hi there' });
  });

  it('handles string message + string response', () => {
    const json = { id: 's2', messages: [{ message: 'q', response: 'a' }] };
    const detail = parseSession(json, 'C:/x/s2.json');
    expect(detail?.messages.map((m) => m.text)).toEqual(['q', 'a']);
  });

  it('returns undefined for non-objects', () => {
    expect(parseSession(null, 'x.json')).toBeUndefined();
    expect(parseSession('nope', 'x.json')).toBeUndefined();
  });

  it('derives a title from the first user message', () => {
    const json = { requests: [{ message: { text: 'Build me a thing' }, response: 'ok' }] };
    const detail = parseSession(json, 'C:/x/file.json');
    expect(detail?.title).toBe('Build me a thing');
  });
});
