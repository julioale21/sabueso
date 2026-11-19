# 02 — Gramática libre de contexto

## 1. Definición formal

Una gramática libre de contexto es una 4-upla G = (N, Σ, P, S):

- N: conjunto finito de **no terminales** (variables).
- Σ: conjunto finito de **terminales**, disjunto de N.
- P: conjunto finito de **producciones** A → α, con A ∈ N y α ∈ (N ∪ Σ)\*. Si α = ε, es una producción ε.
- S ∈ N: el **símbolo inicial**.

Es "libre de contexto" porque el lado izquierdo es un único no terminal: A se puede reemplazar por α sin mirar lo que lo rodea.

**Convención de los archivos `.grammar`:** un identificador es no terminal si es lado izquierdo de alguna regla, y terminal en otro caso. Un literal entre comillas (`'+'`) es siempre terminal, y su nombre es el contenido sin comillas. Si el archivo declara `%terminals`, todo identificador que no sea lado izquierdo ni esté declarado es un error.

## 2. Ejemplo resuelto a mano

Una gramática chica del dominio:

```text
Relato -> CRI Pistas REV
Pistas -> PIS Pistas | ε
```

1. **N** son los lados izquierdos: N = {Relato, Pistas}.
2. **Σ** son los demás símbolos: Σ = {CRI, PIS, REV}.
3. **S** es el lado izquierdo de la primera regla: S = Relato.
4. **P**, numeradas en orden: 0 `Relato → CRI Pistas REV`, 1 `Pistas → PIS Pistas`, 2 `Pistas → ε`.

Derivación de `CRI PIS REV`:

Relato ⇒₀ CRI Pistas REV ⇒₁ CRI PIS Pistas REV ⇒₂ CRI PIS REV

Por lo tanto, `CRI PIS REV` ∈ L(G). En general, L(G) = { CRI PISⁿ REV | n ≥ 0 }.

**Por qué existe `%terminals`:** si en la primera regla se escribe `Pistaz` por error, sin `%terminals` la gramática se construye igual, con `Pistaz` como terminal, y L(G) = {CRI Pistaz REV}: un error silencioso. Con `%terminals CRI PIS REV`, la construcción falla y nombra `Pistaz`.

## 3. Dónde está en el código

| Qué                                 | Dónde                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tipos `Grammar` y `Production`      | `packages/core/src/grammar/types.ts`                                                            |
| Construcción y validación de G      | `buildGrammar` en `packages/core/src/grammar/build.ts`                                          |
| Producción en notación de la teoría | `formatProduction` en `grammar/build.ts`                                                        |
| Comando de consola                  | `npm run sabueso -- demo-grammar` arma `E → E + T \| T`, `T → id` en código e imprime la 4-upla |

## 4. Qué prueba lo verifica

| Prueba                                        | Qué verifica                                                                                                                                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/grammar-build.test.ts`    | Clasificación de N y Σ, numeración, símbolo inicial, producciones ε, literales, y cada error de construcción (inicio inexistente, terminal no declarado, producción duplicada, literal que choca con un no terminal, `$` reservado) |
| `packages/core/test/cli/demo-grammar.test.ts` | La salida exacta del comando                                                                                                                                                                                                        |

## 5. Referencia bibliográfica

- Augusto, sección 2.4.
- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.1.
