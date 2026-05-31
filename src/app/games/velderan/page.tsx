"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const FACTIONS = [
  { id: "empire", name: "Империя", color: "#ef4444", desc: "Империя людей на севере Вайн'Вуделла", enemy: "Республика, Вальгаллы" },
  { id: "republic", name: "Республика", color: "#3b82f6", desc: "Республика людей на юге Вайн'Вуделла", enemy: "Империя, Серебряный мятеж" },
  { id: "subbgars", name: "Суббгары", color: "#a855f7", desc: "Викингообразные гиганты на фьордах. Могут «летать» между городами", enemy: "—" },
  { id: "dwarves", name: "Дворфы", color: "#eab308", desc: "Бородатые карлики горных крепостей", enemy: "Суббгары, Аваллы" },
  { id: "delions", name: "Дэлионы", color: "#171717", desc: "Низшие Эльфы лесов Алвинда", enemy: "Авайны" },
  { id: "avains", name: "Авайны", color: "#f5f5f5", desc: "Высшие Эльфы лесов и гор Алдесвинда", enemy: "Дэлионы" },
  { id: "ancients", name: "Союз Древних", color: "#92400e", desc: "Объединённые Вальгаллы и Аваллы — владельцы Нортвилда", enemy: "—" },
  { id: "trolls", name: "Тролли", color: "#22c55e", desc: "Разрушенная Империя Троллей, возрождающая влияние", enemy: "—" },
  { id: "dark", name: "Тёмные", color: "#67e8f9", desc: "Культ Ситаса — фанатики бога Пустоты", enemy: "—" },
  { id: "rebellion", name: "Серебряный мятеж", color: "#9ca3af", desc: "Предатели Империи и Республики в Вестфолле", enemy: "—" },
];

const GODS = [
  { num: 2, name: "Джалайна", effect: "Воскрешает любой ваш отряд или гвардию в любой точке карты (кроме святилища)" },
  { num: 3, name: "Авалайс", effect: "Утопить любую армию противника на морских путях. Даётся карта бога" },
  { num: 4, name: "Стратос", effect: "Уничтожает ваш отряд на святилище, в котором был призван" },
  { num: 5, name: "Ситас", effect: "Пропустить ход любому игроку. Даётся карта бога" },
  { num: 6, name: "Шент'Ар", effect: "При победе обращает побеждённый отряд в союзный. Даются 2 карты, используются перед боем" },
  { num: 7, name: "Гиордг", effect: "Божественная защита: при проигрыше сражение переигрывается. Даются 2 карты" },
  { num: 8, name: "Сихварис", effect: "Переносит ваш отряд в любую точку карты (кроме святилища)" },
  { num: 9, name: "Вьеронх", effect: "Перенести армию соперника в любую точку карты. Даётся карта бога" },
  { num: 10, name: "Ангелона", effect: "Призывает к святилищу 2 вражеских отряда" },
  { num: 11, name: "Антегриз", effect: "Уничтожить любой вражеский отряд на суше" },
  { num: 12, name: "Выбор", effect: "Вы выбираете любое божество в помощь" },
];

function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const res = await fetch("/api/games/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "Партия в Вельд'Эран", maxPlayers }),
    });
    if (res.ok) {
      const room = await res.json();
      router.push(`/games/velderan/room/${room.id}`);
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        className="bg-neutral-900 border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/10"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-display font-bold text-white mb-4">Создать комнату</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Название</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Партия в Вельд'Эран" className="w-full bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Игроков: {maxPlayers}</label>
            <input type="range" min={2} max={10} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-red-500" />
            <div className="flex justify-between text-xs text-gray-500"><span>2</span><span>10</span></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-red-500/20 transition-all disabled:opacity-50">
              {loading ? "Создание..." : "Создать"}
            </button>
            <button onClick={onClose} className="px-4 py-3 bg-neutral-800 text-gray-400 rounded-xl hover:bg-neutral-700 transition-all">
              Отмена
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface RoomListItem {
  id: string;
  name: string;
  status: string;
  maxPlayers: number;
  inviteCode: string;
  host: { id: string; name: string; username: string; avatar: string | null };
  players: { userId: string; user: { name: string } }[];
  _count: { players: number };
}

function OpenRoomsSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [myRooms, setMyRooms] = useState<RoomListItem[]>([]);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/games/rooms?browse=1").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setRooms(d); });
    fetch("/api/games/rooms").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setMyRooms(d); });
  }, [session]);

  const joinRoom = async (roomId: string) => {
    setJoining(roomId);
    const res = await fetch(`/api/games/rooms/${roomId}/players`, { method: "POST" });
    if (res.ok) {
      router.push(`/games/velderan/room/${roomId}`);
    }
    setJoining(null);
  };

  const userId = (session?.user as { id?: string })?.id;
  const publicRooms = rooms.filter((r) => !myRooms.some((m) => m.id === r.id));

  if (!session) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      {myRooms.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-display font-bold text-white mb-4">Мои комнаты</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myRooms.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900 border border-amber-500/20 rounded-xl p-4 hover:border-amber-500/40 transition-all cursor-pointer"
                onClick={() => router.push(`/games/velderan/room/${r.id}`)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm truncate">{r.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === "LOBBY" ? "bg-green-500/20 text-green-400" : r.status === "PLAYING" ? "bg-amber-500/20 text-amber-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {r.status === "LOBBY" ? "Лобби" : r.status === "PLAYING" ? "Игра" : r.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Хост: {r.host.name} · {r._count.players}/{r.maxPlayers} игроков
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {publicRooms.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">Открытые комнаты</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {publicRooms.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm truncate">{r.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Лобби</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Хост: {r.host.name} · {r._count.players}/{r.maxPlayers} игроков
                </div>
                {r._count.players < r.maxPlayers && r.host.id !== userId ? (
                  <button onClick={() => joinRoom(r.id)} disabled={joining === r.id}
                    className="w-full px-3 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-red-500/20 transition-all disabled:opacity-50">
                    {joining === r.id ? "Присоединение..." : "Присоединиться"}
                  </button>
                ) : r._count.players >= r.maxPlayers ? (
                  <span className="block text-center text-xs text-gray-500">Комната полна</span>
                ) : null}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VelderanPage() {
  const { data: session } = useSession();
  const [showRules, setShowRules] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Hero section with map */}
      <div className="relative h-[60vh] overflow-hidden">
        <Image src="/games/velderan/map.png" alt="Карта Вельд'Эран" fill className="object-cover opacity-40" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/30 via-transparent to-neutral-950" />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="text-center px-4">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">
              Перо Измерений
            </h1>
            <p className="text-xl md:text-2xl text-amber-400/80 font-display mb-2">Мир Вельд&apos;Эран</p>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Стратегическая настольная игра для 2-10 игроков. Управляйте фракциями, ведите армии через моря и континенты, призывайте древних богов.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {session ? (
                <button onClick={() => setShowCreate(true)}
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl font-medium hover:shadow-xl hover:shadow-red-500/20 transition-all text-lg">
                  Создать комнату
                </button>
              ) : (
                <Link href="/auth/signin"
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl font-medium hover:shadow-xl hover:shadow-red-500/20 transition-all text-lg">
                  Войти для игры
                </Link>
              )}
              <button onClick={() => setShowRules(!showRules)}
                className="px-8 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all text-lg backdrop-blur-sm border border-white/10">
                {showRules ? "Скрыть правила" : "Правила игры"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Open Rooms */}
      <OpenRoomsSection />

      {/* Factions */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-3xl font-display font-bold text-white mb-8 text-center">
          Фракции
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {FACTIONS.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="group bg-neutral-900 border border-white/5 rounded-xl p-4 hover:border-white/20 transition-all duration-300"
              style={{ borderLeftColor: f.color, borderLeftWidth: 3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: f.color, border: f.id === "delions" ? "1px solid #555" : undefined }} />
                <span className="text-white font-medium text-sm">{f.name}</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="max-w-4xl mx-auto px-4 pb-16">
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-8 space-y-8">
                <h2 className="text-2xl font-display font-bold text-white">Полные правила</h2>

                <Section title="Обозначения на карте">
                  <Rule icon="🏰" label="Город" text="Помечен кругом с цветом фракции. Является точкой хода." />
                  <Rule icon="⚔️" label="Место сражения" text="Скрещенные мечи на дорогах. Является точкой хода." />
                  <Rule icon="💎" label="Святилище" text="Алмазы — особые места для взаимодействия Гвардий с богами." />
                  <Rule icon="⚓" label="Порт" text="Якорь на побережье. Точка хода для морских путей." />
                  <Rule icon="🧭" label="Роза ветров" text="Промежуточная точка на морских путях." />
                  <Rule icon="🏴‍☠️" label="Пиратская бухта" text="2 морских боя. При проигрыше отряд не гибнет. Предательство пиратов при задержке." />
                  <Rule icon="☠️" label="Призрачный Храм" text="Призрачный отряд — 2 боя. Уйти невозможно. Дань смерти после использования." />
                  <Rule icon="🏕️" label="Лагерь Шейбанидов" text="2 боя на суше. Из лагеря — в Пески Сихвариса по кубикам." />
                  <Rule icon="⛵" label="Логово контрабандистов" text="Через круг — телепорт отряда в любой порт." />
                </Section>

                <Section title="Начало игры">
                  <p className="text-gray-400 text-sm leading-relaxed">Каждый игрок выбирает фракцию. Фишки ставятся на свои города. Оставшиеся — в резерв (по 2 за круг на незахваченные города). Голосованием выбирают первого игрока.</p>
                </Section>

                <Section title="Ходы">
                  <p className="text-gray-400 text-sm leading-relaxed">Отряды делают 2 хода за круг, Гвардии — 1 ход. Максимум 2 фишки одного игрока на точке. Суббгары могут летать между своими городами.</p>
                </Section>

                <Section title="Сражения">
                  <p className="text-gray-400 text-sm leading-relaxed">Оба игрока выкладывают боевую карту (1-5) рубашкой вверх. Делают предположения. Точное угадывание = победа. Если никто не угадал — у кого номинал больше и противник в ±1 от названного числа — победа. Иначе переигровка.</p>
                </Section>

                <Section title="Спецвход">
                  <p className="text-gray-400 text-sm leading-relaxed">Твердь Гиордта — нечётное число на кубиках. Пески Сихвариса — чётное число. При неудаче — возврат на предыдущую точку.</p>
                </Section>

                <Section title="Божества">
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    Гвардия на святилище бросает 2 кубика. Сумма определяет призываемое божество.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {GODS.map((g) => (
                      <div key={g.num}
                        className="bg-neutral-800/60 border border-amber-500/10 rounded-xl p-4 hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600/30 to-red-600/30 border border-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {g.num}
                          </span>
                          <span className="text-white font-medium text-sm">{g.name}</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">{g.effect}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-amber-400 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Rule({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <span className="text-white text-sm font-medium">{label}</span>
        <span className="text-gray-400 text-sm"> — {text}</span>
      </div>
    </div>
  );
}
