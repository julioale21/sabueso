// useServiceResult: ask once per change, wait, and drop late answers (SPEC 06, W4).
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useServiceResult } from '../src/analysis/use-service-result';

/** A promise that the test resolves by hand, to control when each answer arrives. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useServiceResult', () => {
  it('is null while it waits, and the answer when it arrives', async () => {
    const answer = deferred<string>();
    const { result } = renderHook(() => useServiceResult(() => answer.promise, []));
    expect(result.current).toBeNull();
    await act(async () => {
      answer.resolve('CRI PIS REV');
      await answer.promise;
    });
    expect(result.current).toBe('CRI PIS REV');
  });

  it('asks for nothing when load returns null', () => {
    const { result } = renderHook(() => useServiceResult<string>(() => null, []));
    expect(result.current).toBeNull();
  });

  it('drops an answer that arrives after the deps changed', async () => {
    const old = deferred<string>();
    const fresh = deferred<string>();
    const requests: Record<string, Promise<string>> = { old: old.promise, fresh: fresh.promise };
    const { result, rerender } = renderHook(
      ({ story }: { story: string }) => useServiceResult(() => requests[story] ?? null, [story]),
      { initialProps: { story: 'old' } },
    );
    rerender({ story: 'fresh' });
    await act(async () => {
      fresh.resolve('the fresh story');
      await fresh.promise;
    });
    await act(async () => {
      old.resolve('the old story, too late');
      await old.promise;
    });
    expect(result.current).toBe('the fresh story');
  });
});
