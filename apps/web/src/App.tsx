import { VERSION } from '@sabueso/core';

// Smoke screen: proves the web app reaches the core through the alias.
export function App() {
  return (
    <main>
      <h1>Sabueso</h1>
      <p>núcleo v{VERSION}</p>
    </main>
  );
}
