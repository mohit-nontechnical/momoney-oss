import { useMemo, type ReactNode } from "react";
type Block = {
    type: "heading";
    level: number;
    text: string;
} | {
    type: "ul";
    items: string[];
} | {
    type: "ol";
    items: string[];
} | {
    type: "pre";
    code: string;
} | {
    type: "p";
    text: string;
};
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^[-*+]\s+(.*)$/;
const NUMBERED_RE = /^\d+[.)]\s+(.*)$/;
const FENCE_RE = /^```/;
function parseBlocks(raw: string): Block[] {
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const blocks: Block[] = [];
    let para: string[] = [];
    let list: {
        type: "ul" | "ol";
        items: string[];
    } | null = null;
    const flushPara = () => {
        if (para.length) {
            const text = para.join(" ").trim();
            if (text)
                blocks.push({ type: "p", text });
            para = [];
        }
    };
    const flushList = () => {
        if (list) {
            blocks.push(list);
            list = null;
        }
    };
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (FENCE_RE.test(line)) {
            flushPara();
            flushList();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !FENCE_RE.test(lines[i])) {
                codeLines.push(lines[i]);
                i++;
            }
            if (i < lines.length)
                i++;
            blocks.push({ type: "pre", code: codeLines.join("\n") });
            continue;
        }
        if (line.trim() === "") {
            flushPara();
            flushList();
            i++;
            continue;
        }
        const heading = line.match(HEADING_RE);
        if (heading) {
            flushPara();
            flushList();
            blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
            i++;
            continue;
        }
        const bullet = line.match(BULLET_RE);
        if (bullet) {
            flushPara();
            if (!list || list.type !== "ul") {
                flushList();
                list = { type: "ul", items: [] };
            }
            list.items.push(bullet[1].trim());
            i++;
            continue;
        }
        const numbered = line.match(NUMBERED_RE);
        if (numbered) {
            flushPara();
            if (!list || list.type !== "ol") {
                flushList();
                list = { type: "ol", items: [] };
            }
            list.items.push(numbered[1].trim());
            i++;
            continue;
        }
        flushList();
        para.push(line.trim());
        i++;
    }
    flushPara();
    flushList();
    return blocks;
}
const INLINE_RE = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*(\S(?:[^*]*\S)?)\*|_(\S(?:[^_]*\S)?)_|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/;
function renderInline(text: string, keyPrefix: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let rest = text;
    let n = 0;
    while (rest.length) {
        const m = INLINE_RE.exec(rest);
        if (!m || m.index === undefined) {
            nodes.push(rest);
            break;
        }
        if (m.index > 0)
            nodes.push(rest.slice(0, m.index));
        const key = `${keyPrefix}-${n++}`;
        if (m[1] !== undefined) {
            nodes.push(<code key={key}>{m[1]}</code>);
        }
        else if (m[2] !== undefined || m[3] !== undefined) {
            nodes.push(<strong key={key}>{renderInline(m[2] ?? m[3] ?? "", key)}</strong>);
        }
        else if (m[6] !== undefined) {
            nodes.push(<a key={key} href={m[7]} rel="noopener noreferrer" target={m[7].startsWith('http') ? '_blank' : undefined}>{m[6]}</a>);
        }
        else {
            nodes.push(<em key={key}>{renderInline(m[4] ?? m[5] ?? "", key)}</em>);
        }
        rest = rest.slice(m.index + m[0].length);
    }
    return nodes;
}
export default function AskAnswer({ text }: {
    text: string;
}) {
    const blocks = useMemo(() => parseBlocks(text), [text]);
    if (!blocks.length)
        return null;
    return (<>
      {blocks.map((block, i) => {
            const key = `b${i}`;
            switch (block.type) {
                case "heading": {
                    const big = block.level <= 2;
                    const Tag = big ? "h4" : "h5";
                    return (<Tag key={key} className={big ? "ask-h1" : "ask-h2"}>
                {renderInline(block.text, key)}
              </Tag>);
                }
                case "ul":
                    return (<ul key={key}>
                {block.items.map((item, j) => (<li key={j}>{renderInline(item, `${key}-${j}`)}</li>))}
              </ul>);
                case "ol":
                    return (<ol key={key}>
                {block.items.map((item, j) => (<li key={j}>{renderInline(item, `${key}-${j}`)}</li>))}
              </ol>);
                case "pre":
                    return (<pre key={key}>
                <code>{block.code}</code>
              </pre>);
                case "p":
                default:
                    return <p key={key}>{renderInline(block.text, key)}</p>;
            }
        })}
    </>);
}
