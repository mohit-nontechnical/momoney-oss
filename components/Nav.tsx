"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAskDrawer } from "./AskDrawerProvider";
import { Icon } from "./Design";
const primary = [
    ["/", "Overview", "Home", "home"],
    ["/transactions", "Transactions", "Activity", "activity"],
    ["/budgets", "Budgets", "Budgets", "budgets"],
    ["/bills", "Bills & credit", "Bills", "bills"],
    ["/cards", "Cards", "Cards", "cards"],
];
const more = [
    ["/recommendations", "Recommendations"],
    ["/trends", "Trends"],
    ["/trips", "Trips"],
    ["/household", "Household"],
    ["/ventures", "Ventures"],
    ["/renewals", "Renewals"],
    ["/scenarios", "Scenarios"],
    ["/income", "Income"],
    ["/backlog", "Money tasks"],
];
export default function Nav() {
    const path = usePathname(), { toggle } = useAskDrawer();
    const [privacy, setPrivacy] = useState(false);
    useEffect(() => {
        let p = false;
        try {
            p = localStorage.getItem("momoney-privacy") === "1";
        }
        catch { }
        setPrivacy(p);
        document.documentElement.classList.toggle("privacy", p);
    }, []);
    function mask() {
        const p = !privacy;
        setPrivacy(p);
        document.documentElement.classList.toggle("privacy", p);
        try {
            localStorage.setItem("momoney-privacy", p ? "1" : "0");
        }
        catch { }
    }
    return (<>
      <nav className="rd-nav" aria-label="Main navigation">
        <Link href="/" className="rd-word">
          MoMoney
        </Link>
        <div className="rd-nav-links">
          {primary.map(([href, label]) => (<Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
              {label}
            </Link>))}
          <Link href="/networth" aria-current={path === "/networth" ? "page" : undefined}>
            Net worth
          </Link>
          <Link href="/goals" aria-current={path === "/goals" ? "page" : undefined}>
            Goals
          </Link>
        </div>
        <details className="rd-more">
          <summary aria-label="More pages">
            <span className="rd-desktop">More</span>
            <span className="rd-mobile">
              <Icon name="more"/>
            </span>
          </summary>
          <div>
            <Link href="/goals" onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}>
              Goals
            </Link>
            <Link href="/networth" onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}>
              Net worth
            </Link>
            {more.map(([href, label]) => (<Link key={href} href={href} onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}>
                {label}
              </Link>))}
          </div>
        </details>
        <button className="rd-icon-button" onClick={mask} aria-label={privacy ? "Show amounts" : "Hide amounts"} aria-pressed={privacy}>
          <Icon name="eye"/>
        </button>
        <button className="rd-pill" onClick={toggle}>
          Ask
        </button>
      </nav>
      <nav className="rd-bottom" aria-label="Mobile navigation">
        {primary.map(([href, , label, icon]) => (<Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
            <Icon name={icon}/>
            <span>{label}</span>
          </Link>))}
      </nav>
    </>);
}
