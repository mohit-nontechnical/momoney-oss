"use client";
import { useEffect, useRef } from "react";
export default function useDialog(open: boolean, onClose: () => void) {
    const ref = useRef<HTMLElement>(null), close = useRef(onClose);
    close.current = onClose;
    useEffect(() => {
        if (!open)
            return;
        const prior = document.activeElement as HTMLElement | null, node = ref.current;
        if (!node)
            return;
        const controls = () => Array.from(node.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]"));
        controls()[0]?.focus();
        function key(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.preventDefault();
                close.current();
            }
            else if (e.key === "Tab") {
                const all = controls(), first = all[0], last = all.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                }
                else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        }
        node.addEventListener("keydown", key);
        return () => {
            node.removeEventListener("keydown", key);
            prior?.focus();
        };
    }, [open]);
    return ref;
}
