/** FIRST and FOLLOW of each nonterminal (guide 11). */
import { setText } from '../../domain/productions';

export function FirstFollowTable({
  nonterminals,
  first,
  follow,
}: {
  nonterminals: readonly string[];
  first: ReadonlyMap<string, ReadonlySet<string>>;
  follow: ReadonlyMap<string, ReadonlySet<string>>;
}) {
  return (
    <table aria-label="FIRST y FOLLOW" className="w-full text-left text-xs">
      <thead className="text-slate-500">
        <tr>
          <th className="py-1 pr-4 font-medium">No terminal</th>
          <th className="py-1 pr-4 font-medium">FIRST</th>
          <th className="py-1 font-medium">FOLLOW</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {nonterminals.map((nonterminal) => (
          <tr key={nonterminal} className="border-t border-slate-100 dark:border-slate-800">
            <th scope="row" className="py-1 pr-4 font-medium">
              {nonterminal}
            </th>
            <td className="py-1 pr-4">{setText(first.get(nonterminal) ?? [])}</td>
            <td className="py-1">{setText(follow.get(nonterminal) ?? [])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
