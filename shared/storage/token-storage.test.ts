import { describe, expect, it } from 'vitest';
import { addToken, getTokens, removeToken, updateTokenLabel } from '@/shared/storage/token-storage';

describe('token-storage', () => {
  it('starts empty', async () => {
    expect(await getTokens()).toEqual([]);
  });

  it('adds and lists tokens', async () => {
    const added = await addToken({ token: 'tok-1', label: 'Personal', email: 'me@example.com' });
    const tokens = await getTokens();

    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      id: added.id,
      token: 'tok-1',
      label: 'Personal',
      email: 'me@example.com',
    });
  });

  it('updates a token label without touching other fields', async () => {
    const added = await addToken({ token: 'tok-2', label: 'Old label', email: null });
    await updateTokenLabel(added.id, 'New label');

    const tokens = await getTokens();
    const updated = tokens.find((t) => t.id === added.id);
    expect(updated?.label).toBe('New label');
    expect(updated?.token).toBe('tok-2');
  });

  it('removes a token by id', async () => {
    const a = await addToken({ token: 'tok-a', label: 'A', email: null });
    const b = await addToken({ token: 'tok-b', label: 'B', email: null });

    await removeToken(a.id);

    const tokens = await getTokens();
    expect(tokens.map((t) => t.id)).toEqual([b.id]);
  });
});
