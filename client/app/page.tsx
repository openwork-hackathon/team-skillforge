"use client";

import { useState, useEffect, useCallback } from "react";
import SkillCard from "@/components/SkillCard";
import PublishModal from "@/components/PublishModal";
import { fetchAPI, CATEGORIES } from "@/lib/utils";

export default function HomePage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [featured, setFeatured] = useState<{ featured: any[]; trending: any[]; newest: any[] }>({
    featured: [], trending: [], newest: [],
  });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [showPublish, setShowPublish] = useState(false);
  const [view, setView] = useState<"browse" | "home">("home");

  const loadFeatured = useCallback(async () => {
    try {
      const data = await fetchAPI("/skills/featured");
      setFeatured(data);
    } catch {}
  }, []);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category !== "all") params.set("category", category);
      params.set("sort", sort);
      const data = await fetchAPI(`/skills?${params}`);
      setSkills(data.skills);
    } catch {}
    setLoading(false);
  }, [search, category, sort]);

  useEffect(() => {
    setMounted(true);
    // Delay API calls until after hydration
    const timer = setTimeout(() => {
      loadFeatured();
      loadSkills();
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when search/category/sort changes (debounced)
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      loadSkills();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sort]);

  // Debug: log modal state
  useEffect(() => {
    console.log("[Home] showPublish:", showPublish);
  }, [showPublish]);

  const isSearching = search || category !== "all";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-forge-500/30 bg-forge-500/10 px-4 py-1.5 text-sm text-forge-400 mb-6">
          <span>🦞</span>
          <span>Built for the Clawathon</span>
          <span className="text-forge-500">•</span>
          <span>Powered by $OPENWORK</span>
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          <span className="text-white">The Skill Store for </span>
          <span className="bg-gradient-to-r from-forge-400 to-claw-400 bg-clip-text text-transparent">
            AI Agents
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Discover, install, and publish SKILL.md files. Every skill is versioned,
          verified, and powered by $OPENWORK on Base.
        </p>

        {/* Search bar */}
        <div className="max-w-2xl mx-auto flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) setView("browse");
              }}
              placeholder="Search skills... (e.g. defi, trading bot, code review)"
              className="w-full rounded-xl border border-dark-600 bg-dark-800 pl-12 pr-4 py-3.5 text-white placeholder-gray-600 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500/30 transition-all"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => {
              console.log("[Home] Publish button clicked");
              setShowPublish(true);
            }}
            className="rounded-xl bg-forge-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-forge-500 hover:shadow-lg hover:shadow-forge-500/25 transition-all whitespace-nowrap cursor-pointer"
          >
            + Publish Skill
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setCategory(cat.id);
              if (cat.id !== "all") setView("browse");
              else if (!search) setView("home");
            }}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              category === cat.id
                ? "bg-forge-500/20 text-forge-400 border border-forge-500/40"
                : "bg-dark-800 text-gray-500 border border-dark-600 hover:border-gray-500 hover:text-gray-300"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Home view - sections */}
      {!isSearching && view === "home" && (
        <>
          {/* Trending */}
          {featured.trending.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🔥</span> Trending Skills
                </h2>
                <button
                  onClick={() => { setSort("popular"); setView("browse"); }}
                  className="text-sm text-forge-400 hover:text-forge-300"
                >
                  View all →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.trending.map((skill) => (
                  <SkillCard key={skill._id} skill={skill} />
                ))}
              </div>
            </section>
          )}

          {/* Newest */}
          {featured.newest.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>✨</span> Just Published
                </h2>
                <button
                  onClick={() => { setSort("newest"); setView("browse"); }}
                  className="text-sm text-forge-400 hover:text-forge-300"
                >
                  View all →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featured.newest.map((skill) => (
                  <SkillCard key={skill._id} skill={skill} />
                ))}
              </div>
            </section>
          )}

          {/* Stats banner */}
          <div className="rounded-2xl border border-dark-600 bg-dark-800 p-8 mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { label: "Skills Published", value: skills.length || "0", emoji: "📦" },
                { label: "Total Installs", value: skills.reduce((s, sk) => s + (sk.stats?.installs || 0), 0).toLocaleString(), emoji: "↓" },
                { label: "Active Agents", value: "—", emoji: "🤖" },
                { label: "Network", value: "Base", emoji: "🔵" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-white mb-1">
                    {stat.emoji} {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty state CTA */}
          {skills.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🦞</div>
              <h3 className="text-2xl font-bold text-white mb-2">No skills yet</h3>
              <p className="text-gray-500 mb-6">Be the first to publish a skill for the OpenWork ecosystem!</p>
              <button
                type="button"
                onClick={() => setShowPublish(true)}
                className="rounded-xl bg-forge-600 px-8 py-3 text-sm font-semibold text-white hover:bg-forge-500 transition-all cursor-pointer"
              >
                Publish Your First Skill
              </button>
            </div>
          )}
        </>
      )}

      {/* Browse view - grid with sort */}
      {(isSearching || view === "browse") && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              {search ? `Results for "${search}"` : "All Skills"}
              <span className="text-gray-500 font-normal ml-2">({skills.length})</span>
            </h2>
            <div className="flex gap-2">
              {["popular", "newest", "rating"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    sort === s
                      ? "bg-dark-600 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-dark-600 bg-dark-800 p-5 animate-pulse">
                  <div className="h-6 bg-dark-700 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-dark-700 rounded w-full mb-2" />
                  <div className="h-4 bg-dark-700 rounded w-2/3 mb-4" />
                  <div className="h-8 bg-dark-700 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : skills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <SkillCard key={skill._id} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-400">No skills found matching your search.</p>
            </div>
          )}
        </>
      )}

      <PublishModal
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        onPublished={() => { loadSkills(); loadFeatured(); }}
      />
    </div>
  );
}