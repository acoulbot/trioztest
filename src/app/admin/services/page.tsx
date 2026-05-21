"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  order: number;
  active: boolean;
}

export default function AdminServicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", icon: "", order: 0 });

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  const fetchServices = async () => {
    const res = await fetch("/api/services");
    setServices(await res.json());
  };

  useEffect(() => {
    if (session?.user?.role === "ADMIN") fetchServices();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", description: "", icon: "", order: 0 });
    setShowForm(false);
    fetchServices();
  };

  const toggleActive = async (service: Service) => {
    await fetch("/api/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id, active: !service.active }),
    });
    fetchServices();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 text-sm mb-2 inline-flex items-center gap-1 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Админ-панель
            </Link>
            <h1 className="text-2xl font-bold text-white">Управление услугами</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
            {showForm ? "Отмена" : "Добавить услугу"}
          </button>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-8"
          >
            <h3 className="text-lg font-bold text-white mb-4">Новая услуга</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Название</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Иконка (emoji)</label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="input-field"
                    placeholder="🔧"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Порядок</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field min-h-[100px]"
                  required
                />
              </div>
              <button type="submit" className="btn-primary">Создать</button>
            </form>
          </motion.div>
        )}

        <div className="space-y-3">
          {services.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-4 flex items-center gap-4 ${!service.active ? "opacity-50" : ""}`}
            >
              <span className="text-2xl flex-shrink-0">{service.icon || "🔹"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{service.title}</span>
                  <span className="text-xs text-gray-500">#{service.order}</span>
                </div>
                <p className="text-gray-400 text-sm mt-1 truncate">{service.description}</p>
              </div>
              <button
                onClick={() => toggleActive(service)}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  service.active
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                }`}
              >
                {service.active ? "Активна" : "Отключена"}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
