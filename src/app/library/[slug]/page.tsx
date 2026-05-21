"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

function renderMarkdown(content: string) {
  return content
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1 class="text-3xl font-bold text-white mb-4 mt-8">${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2 class="text-2xl font-bold text-white mb-3 mt-6">${line.slice(3)}</h2>`;
      if (line.startsWith("### ")) return `<h3 class="text-xl font-bold text-white mb-2 mt-4">${line.slice(4)}</h3>`;
      if (line.startsWith("- ")) return `<li class="text-gray-300 ml-4 list-disc">${line.slice(2)}</li>`;
      if (line.startsWith("*") && line.endsWith("*")) return `<p class="text-gray-400 italic">${line.slice(1, -1)}</p>`;
      if (line.trim() === "") return `<br/>`;
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em class="text-gray-400">$1</em>');
      return `<p class="text-gray-300 leading-relaxed">${formatted}</p>`;
    })
    .join("\n");
}

export default function ArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    fetch("/api/articles?published=true")
      .then((r) => r.json())
      .then((articles: Article[]) => {
        const found = articles.find((a) => a.slug === params.slug);
        setArticle(found || null);
      });
  }, [params.slug]);

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/library" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад к библиотеке
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-fantasy-emerald/20 text-fantasy-emerald text-sm rounded-lg">
              {article.category}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(article.createdAt).toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>

          <div
            className="glass-card p-8 md:p-12"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
          />

          {article.tags && (
            <div className="flex gap-2 mt-6">
              {article.tags.split(",").map((tag) => (
                <span key={tag} className="text-sm text-gray-400 bg-dark-700 px-3 py-1 rounded-lg">
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
