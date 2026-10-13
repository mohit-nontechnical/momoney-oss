"use client";
import { useEffect, useRef } from "react";
export default function Tooltip() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const tip = ref.current;
        if (!tip)
            return;
        function onMove(e: MouseEvent) {
            const el = (e.target as HTMLElement)?.closest?.("[data-tip]") as HTMLElement | null;
            if (!tip)
                return;
            if (!el) {
                tip.style.opacity = "0";
                return;
            }
            tip.textContent = document.documentElement.classList.contains("privacy")
                ? "hidden — privacy mode"
                : (el.dataset.tip ?? "");
            tip.style.opacity = "1";
            const w = tip.offsetWidth;
            tip.style.left = Math.min(e.clientX + 14, window.innerWidth - w - 10) + "px";
            tip.style.top = e.clientY + 16 + "px";
        }
        document.addEventListener("mousemove", onMove);
        return () => document.removeEventListener("mousemove", onMove);
    }, []);
    return <div id="tip" ref={ref}/>;
}
