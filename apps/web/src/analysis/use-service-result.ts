/**
 * Asks the AnalysisService for something and keeps the answer (SPEC 06, W4). Every view that
 * loads data does the same: ask when its inputs change, show nothing until the answer arrives,
 * and drop an answer that comes back after the inputs already changed. This hook says it once.
 */
import { useEffect, useState, type DependencyList } from 'react';

/**
 * Calls load once per change of deps and returns its answer, or null while it waits. load
 * may return null to ask for nothing (a story too long for the view, a missing grammar).
 * An answer that arrives after deps changed is dropped, so an old story never shows up late.
 */
export function useServiceResult<T>(load: () => Promise<T> | null, deps: DependencyList): T | null {
  const [result, setResult] = useState<T | null>(null);
  useEffect(() => {
    const request = load();
    if (request === null) {
      return undefined;
    }
    // Each request has its own flag: the cleanup of an older one turns it off, so a late
    // answer to it is ignored.
    let current = true;
    void request.then((answer) => {
      if (current) {
        setResult(answer);
      }
    });
    return () => {
      current = false;
    };
    // The caller lists what load depends on, and the lint checks that list where the hook is
    // called (additionalHooks in eslint.config.js). Here deps can only be passed along.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return result;
}
