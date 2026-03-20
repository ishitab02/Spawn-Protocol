"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChainContext } from "@/context/ChainContext";

const NAV_ITEMS = [
  { href: "/", label: "Swarm", icon: "⬡" },
  { href: "/graph", label: "Graph", icon: "◎" },
  { href: "/proposals", label: "Proposals", icon: "◈" },
  { href: "/leaderboard", label: "Leaderboard", icon: "▲" },
  { href: "/timeline", label: "Timeline", icon: "≡" },
  { href: "/logs", label: "Exec Log", icon: "◉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Navbar() {
  const pathname = usePathname();
  const { chainId, setChainId } = useChainContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#07070f] border-b border-gray-800/60 flex items-center justify-between px-4 z-50">
        <div>
          <div className="font-mono text-[10px] text-gray-600 tracking-widest uppercase">Synthesis 2026</div>
          <h1 className="font-mono text-sm font-bold text-green-400 leading-none">SPAWN PROTOCOL</h1>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-gray-400 hover:text-gray-200 p-2 text-lg leading-none"
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-56 bg-[#07070f] border-r border-gray-800/60 flex flex-col z-50 transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800/60">
          <div className="font-mono text-xs text-gray-600 mb-1 tracking-widest uppercase">
            Synthesis 2026
          </div>
          <h1 className="font-mono text-lg font-bold text-green-400 tracking-tight leading-none">
            SPAWN
            <br />
            <span className="text-green-600">PROTOCOL</span>
          </h1>
          <div className="mt-2 h-px bg-gradient-to-r from-green-500/50 to-transparent" />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-mono text-sm ${
                  isActive
                    ? "bg-green-400/10 text-green-400 border border-green-400/20"
                    : "text-gray-500 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1 h-1 rounded-full bg-green-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Chain selector */}
        <div className="px-3 py-3 border-t border-gray-800/60">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 px-1">Chain</p>
          <div className="flex flex-col gap-1">
            {([
              { id: "base", label: "Base Sepolia", color: "text-blue-400" },
              { id: "celo", label: "Celo Sepolia", color: "text-green-400" },
            ] as const).map((chain) => (
              <button
                key={chain.id}
                onClick={() => setChainId(chain.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-all border ${
                  chainId === chain.id
                    ? `${chain.color} border-current bg-current/10`
                    : "text-gray-600 border-transparent hover:text-gray-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${chainId === chain.id ? "bg-current animate-ping" : "bg-gray-700"}`}
                  style={chainId === chain.id ? { animationDuration: "2s" } : {}}
                />
                {chain.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800/60">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" style={{ animationDuration: "2s" }} />
            <span className="font-mono text-xs text-gray-500">
              {chainId === "base" ? "Base Sepolia" : "Celo Sepolia"}
            </span>
          </div>
          <a
            href={
              chainId === "base"
                ? "https://sepolia.basescan.org/address/0xfeb8d54149b1a303ab88135834220b85091d93a1"
                : "https://celo-sepolia.celoscan.io/address/0xc06e6615e2bbbf795ae17763719dcb9b82cd781c"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-gray-700 hover:text-gray-400 transition-colors"
          >
            SpawnFactory ↗
          </a>
        </div>
      </aside>
    </>
  );
}
