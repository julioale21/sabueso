/** The name of the program and the question it answers. */
export function AppHeader() {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-semibold">Sabueso</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        ¿El relato respeta la estructura del policial de enigma? Una gramática libre de contexto y
        el analizador de Earley lo deciden.
      </p>
    </header>
  );
}
