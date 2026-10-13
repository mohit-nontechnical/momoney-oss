"use client";
import { createContext, useContext, useMemo, useState } from "react";
interface AskDrawerCtx {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}
const Ctx = createContext<AskDrawerCtx | null>(null);
export default function AskDrawerProvider({ children }: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const value = useMemo(() => ({ open, setOpen, toggle: () => setOpen((o) => !o) }), [open]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAskDrawer(): AskDrawerCtx {
    const ctx = useContext(Ctx);
    if (!ctx)
        throw new Error("useAskDrawer must be used within AskDrawerProvider");
    return ctx;
}
