"use client";

import Link from "next/link";
import { formatOPENWORK, CATEGORIES } from "@/lib/utils";

interface Skill {
  _id: string;
  name: string;
  symbol: string;
  description: string;
  category: string;
  version: string;
  author: { address: string; name: string };
  pricing: { model: string; amount: number };
  compatibility: string[];
  stats: { installs: number; rating: number; ratingCount: number };
  tags: string[];
  verified: boolean;
  featured: boolean;
  createdAt: string;
}

export default function SkillCard({ skill }: { skill: Skill }) {
  const cat = CATEGORIES.find((c) => c.id === skill.category);

  return (
    <Link href={`/skills/${skill._id}`}>
      <div className="skill-card group relative rounded-xl border border-dark-600 bg-dark-800 p-5 cursor-pointer hover:border-dark-500">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cat?.emoji || "📦"}</span>
            <div>
              <h3 className="font-semibold text-white group-hover:text-forge-400 transition-colors line-clamp-1">
                {skill.name}
              </h3>
              <span className="text-xs font-mono text-gray-500">{skill.symbol}</span>
            </div>
          </div>
          {skill.verified && (
            <span className="text-xs bg-claw-500/20 text-claw-400 px-2 py-0.5 rounded-full border border-claw-500/30">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 line-clamp-2 mb-4 leading-relaxed">
          {skill.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skill.compatibility.slice(0, 3).map((c) => (
            <span
              key={c}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-700 text-gray-500 border border-dark-600"
            >
              {c}
            </span>
          ))}
          {skill.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-[10px] px-2 py-0.5 rounded bg-forge-500/10 text-forge-400 border border-forge-500/20"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-3 border-t border-dark-600">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              ↓ {skill.stats.installs.toLocaleString()}
            </span>
            {skill.stats.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                ★ {skill.stats.rating}
                <span className="text-gray-600">({skill.stats.ratingCount})</span>
              </span>
            )}
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
              skill.pricing.model === "free"
                ? "bg-claw-500/15 text-claw-400"
                : "bg-forge-500/15 text-forge-400"
            }`}
          >
            {formatOPENWORK(skill.pricing.amount)}
          </span>
        </div>

        {/* Featured badge */}
        {skill.featured && (
          <div className="absolute -top-2 -right-2 bg-forge-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-forge-500/30">
            🔥 Featured
          </div>
        )}
      </div>
    </Link>
  );
}