"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import EditableText from "@/components/EditableText";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string;
  published: boolean;
  createdAt: string;
}

export default function LibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/articles?published=true").then((r) => r.json()).then(setArticles);
  }, []);

  const categories = Array.from(new Set(articles.map((a) => a.category)));
  const filteredArticles = selectedCategory
    ? articles.filter((a) => a.category === selectedCategory)
    : articles;

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4 transition-colors duration-300">
      {/* Background accent */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="section-title text-4xl md:text-5xl mb-4">TZ.Library</h1>
          <EditableText
            contentKey="library.subtitle"
            defaultValue="Хранилище знаний и лора вселенной T.Р.И.О.Z. Статьи, история, мифология."
            tag="p"
            className="text-neutral-500 dark:text-gray-400 max-w-xl mx-auto"
          />
        </motion.div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm transition-all duration-300 ${
                !selectedCategory
                  ? "bg-violet-100 dark:bg-cyan-400/20 text-violet-700 dark:text-cyan-400 border border-violet-300 dark:border-cyan-400/30"
                  : "text-neutral-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 border border-transparent"
              }`}
            >
              Все
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm transition-all duration-300 ${
                  selectedCategory === cat
                    ? "bg-violet-100 dark:bg-cyan-400/20 text-violet-700 dark:text-cyan-400 border border-violet-300 dark:border-cyan-400/30"
                    : "text-neutral-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 border border-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Articles list */}
        <div className="space-y-4">
          {filteredArticles.map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link href={`/library/${article.slug}`}>
                <div className="glass-card-hover p-6 group cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg font-medium">
                          {article.category}
                        </span>
                        <span className="text-xs text-neutral-400 dark:text-gray-600">
                          {new Date(article.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-cyan-400 transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-neutral-500 dark:text-gray-400 text-sm mt-2 line-clamp-2">
                        {article.content.replace(/[#*_\[\]]/g, "").slice(0, 200)}...
                      </p>
                      {article.tags && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {article.tags.split(",").map((tag) => (
                            <span
                              key={tag}
                              className="text-xs text-neutral-500 dark:text-gray-500 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 px-2 py-0.5 rounded"
                            >
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-neutral-300 dark:text-gray-600 group-hover:text-violet-500 dark:group-hover:text-cyan-400 transition-all transform group-hover:translate-x-1 flex-shrink-0 mt-1"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {filteredArticles.length === 0 && (
            <div className="text-center py-20 text-neutral-400 dark:text-gray-500">
              <span className="text-4xl block mb-3">📚</span>
              <p>Статьи скоро появятся</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
