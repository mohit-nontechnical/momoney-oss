import type { ReactNode } from "react";
export default function Table<T>({ title, rows, cols, note, }: {
    title: string;
    rows: T[];
    cols: [
        string,
        (r: T) => ReactNode
    ][];
    note?: ReactNode;
}) {
    return (<section>
      <h2>{title}</h2>
      {note && <p className="fn">{note}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(([label]) => (<th key={label}>{label}</th>))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (rows.map((r, i) => (<tr key={i}>
                  {cols.map(([label, render]) => (<td key={label}>{render(r)}</td>))}
                </tr>))) : (<tr>
                <td colSpan={cols.length} className="fn">
                  none 🎉
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </section>);
}
