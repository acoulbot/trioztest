"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import EditableText from "@/components/EditableText";

const sections = [
  {
    key: "trioz",
    title: 'Проекты Т.Р.И.О."Z"',
    description:
      "Глобальная MMORPG с элементами стратегии, полной социальной сферой и бесконечным миром для исследования. Мир тёмного фэнтези с уникальной лор-системой.",
    color: "#ff4444",
    href: "/projects",
  },
  {
    key: "pero",
    title: "Перо Измерений",
    description:
      "Развлекательные товары направленные на развитие мышления — от книг до уникальных настольных игр. Погружение в лор вселенной через физические носители.",
    color: "#8b5cf6",
    href: "/pero",
  },
  {
    key: "connect",
    title: "TZ.Connect",
    description:
      "Коммуникационная платформа и комплексные IT-решения для современного бизнеса. Мессенджер, голосовая связь, IT-услуги.",
    color: "#00f0ff",
    href: "/connect",
  },
  {
    key: "library",
    title: "TZ.Library",
    description:
      "Хранилище знаний и лора вселенной — от древних легенд до новейших открытий. Вики, база знаний, история мира.",
    color: "#10b981",
    href: "/library",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-400/[0.03] dark:bg-cyan-400/[0.02] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-400/[0.03] dark:bg-fantasy-purple/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* Back button */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/">
          <motion.button
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
              border border-neutral-300 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:border-violet-300 dark:hover:border-cyan-400/40
              backdrop-blur-xl bg-white/80 dark:bg-black/30 flex items-center gap-2"
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </motion.button>
        </Link>
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 mb-5"
          >
            <span className="h-px w-10 bg-violet-400/40 dark:bg-cyan-400/30" />
            <span className="text-xs font-medium tracking-widest uppercase text-violet-500 dark:text-cyan-400/80">Экосистема</span>
            <span className="h-px w-10 bg-violet-400/40 dark:bg-cyan-400/30" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-7xl font-display font-bold mb-6 leading-[1.1]"
          >
            <EditableText
              contentKey="about.title"
              defaultValue="TrioZ"
              tag="span"
              className="bg-gradient-to-r from-violet-600 via-neutral-900 to-indigo-600 dark:from-cyan-400 dark:via-white dark:to-fantasy-purple bg-clip-text text-transparent"
            />
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <EditableText
              contentKey="about.subtitle"
              defaultValue="Масштабная экосистема проектов в стиле dark fantasy и cyberpunk. Один мир. Множество измерений. Игры, книги, коммуникации, технологии."
              tag="p"
              className="text-lg text-neutral-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
              multiline
            />
          </motion.div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, i) => (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Link href={section.href}>
                <div className="relative rounded-2xl overflow-hidden group
                  border border-neutral-200/80 dark:border-white/[0.07]
                  hover:border-neutral-300 dark:hover:border-white/[0.13]
                  bg-white dark:bg-white/[0.025]
                  transition-all duration-400
                  hover:shadow-lg dark:hover:shadow-none"
                >
                  {/* Top accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(90deg, transparent, ${section.color}80, transparent)` }}
                  />
                  {/* Left bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] opacity-30 group-hover:opacity-70 transition-all duration-400 group-hover:w-[4px]"
                    style={{ backgroundColor: section.color }}
                  />
                  {/* Subtle radial glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 0% 50%, ${section.color}06 0%, transparent 60%)` }}
                  />

                  <div className="relative p-6 md:p-8 pl-8 md:pl-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-300 group-hover:scale-125"
                        style={{ backgroundColor: section.color, boxShadow: `0 0 8px ${section.color}60` }}
                      />
                      <h2 className="text-lg md:text-xl font-display font-bold text-neutral-900 dark:text-white group-hover:translate-x-0.5 transition-transform duration-300">
                        {section.title}
                      </h2>
                    </div>

                    <EditableText
                      contentKey={`about.section.${section.key}`}
                      defaultValue={section.description}
                      tag="p"
                      className="text-neutral-500 dark:text-gray-400 leading-relaxed text-sm md:text-base ml-[22px]"
                      multiline
                    />

                    <div className="flex items-center gap-2 mt-4 ml-[22px] opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-300">
                      <span className="text-sm font-medium" style={{ color: section.color }}>
                        Перейти в раздел
                      </span>
                      <svg className="w-4 h-4" style={{ color: section.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Legal section */}
        <LegalSection />

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-16 text-neutral-400 dark:text-gray-600 text-sm"
        >
          <EditableText contentKey="about.footer" defaultValue="&copy; 2024 T.Р.И.О.Z — Экосистема проектов" tag="p" />
        </motion.div>
      </div>
    </div>
  );
}

const legalSections = [
  {
    title: "1. Термины и определения",
    content: `Платформа (Сайт) — совокупность программно-аппаратных средств, интегрированных с веб-сайтом, размещенным в сети Интернет в домене connect.trioz.ru, включая все его поддомены, страницы, элементы интерфейса, графику и программный код.

Администрация Платформы — правообладатель Платформы TRIOZ, осуществляющий управление Сайтом, обеспечение его функционирования и техническую поддержку.

Пользователь (Клиент) — любое дееспособное физическое лицо, индивидуальный предприниматель или уполномоченный представитель юридического лица, осуществивший доступ к Платформе и/или использующий ее функциональные возможности для направления обращений, получения информационных или консультационных услуг.

Обработка сообщений (Сервис) — функционал Платформы, позволяющий Пользователю отправлять текстовые сообщения, запросы, технические задания, файлы и иные материалы Администрации, а Администрации — принимать, регистрировать, анализировать и отвечать на указанные запросы в рамках обслуживания Клиентов.`,
  },
  {
    title: "2. Предмет соглашения",
    content: `2.1. Предметом настоящего Соглашения является предоставление Пользователю доступа к функциональным возможностям Платформы connect.trioz.ru для получения информационных, консультационных, сервисных или технологических услуг, а также для направления официальных обращений и обработки сообщений Пользователя.

2.2. Использование любых функций Платформы означает безоговорочное согласие Пользователя со всеми пунктами настоящего Соглашения, а также с Политикой конфиденциальности, являющейся неотъемлемой частью данного документа. В случае несогласия с какими-либо условиями Пользователь обязан незамедлительно прекратить использование Сайта.`,
  },
  {
    title: "3. Порядок использования Платформы",
    content: `3.1. Платформа connect.trioz.ru предоставляет интерфейс для взаимодействия Клиентов с проектом TRIOZ. В рамках этого взаимодействия Пользователь имеет право направлять сообщения через электронные формы обратной связи, онлайн-чаты или специализированные тикет-системы, развернутые на Сайте.

3.2. При отправке сообщений Пользователь обязуется предоставлять достоверную, актуальную и полную информацию (включая имя, контактный адрес электронной почты и иные реквизиты, необходимые для обратной связи).

3.3. Администрация осуществляет модерацию, учет и обработку входящих сообщений. Время рассмотрения обращений и предоставления ответа регламентируется внутренними стандартами обслуживания проекта TRIOZ, но не может превышать 30 (тридцати) календарных дней с момента получения, если иное не согласовано Сторонами в отдельных договорах.

3.4. Направляя сообщение или файлы через Платформу, Пользователь гарантирует, что обладает всеми необходимыми правами на передаваемую информацию и её содержание не нарушает законодательство РФ, права третьих лиц и общепринятые этические нормы.`,
  },
  {
    title: "4. Политика ведения деятельности",
    content: `4.1. Проект TRIOZ строит свою деятельность на принципах законности, прозрачности, конфиденциальности и профессиональной этики. Администрация обязуется прилагать максимальные усилия для обеспечения бесперебойного функционирования Платформы, оперативного устранения технических сбоев и качественного обслуживания Клиентов.

4.2. При использовании Платформы Пользователю строго запрещается:
• Использовать Сервис для отправки спама, массовых рассылок, вредоносного программного обеспечения, фишинговых ссылок или иных материалов, способных нарушить стабильность работы компьютерного оборудования или сетей.
• Размещать или передавать информацию, носящую оскорбительный, дискриминационный, заведомо ложный, клеветнический характер, а также материалы, нарушающие авторские, смежные или патентные права третьих лиц.
• Осуществлять попытки несанкционированного доступа к административной панели Сайта, учетным записям других пользователей или серверам, на которых развернута инфраструктура TRIOZ.
• Использовать автоматизированные скрипты (парсеры, боты, краулеры) для сбора информации с Платформы без предварительного письменного разрешения Администрации.

4.3. В случае выявления нарушений правил допустимого использования, Администрация оставляет за собой право в одностороннем порядке заблокировать доступ Пользователя к Сервису, проигнорировать направленные сообщения или передать соответствующие данные в правоохранительные органы.`,
  },
  {
    title: "5. Интеллектуальная собственность",
    content: `5.1. Все объекты, размещенные на Платформе connect.trioz.ru, включая элементы дизайна, текст, графические изображения, иллюстрации, скрипты, программы для ЭВМ, базы данных, товарные знаки и логотипы, являются объектами исключительных прав Администрации Платформы или её партнеров.

5.2. Никакие элементы контента Платформы не могут быть скопированы, воспроизведены, переработаны, распространены или использованы иным образом для коммерческих или некоммерческих целей без предварительного согласия правообладателя.`,
  },
  {
    title: "6. Ограничение ответственности",
    content: `6.1. Платформа и её сервисы предоставляются на условиях «как есть» (as is). Администрация не гарантирует, что Платформа будет соответствовать всем субъективным ожиданиям Пользователя, функционировать непрерывно, быстро и абсолютно без ошибок.

6.2. Администрация не несет ответственности за убытки (включая упущенную выгоду, прерывание деловой активности или потерю данных), возникшие у Пользователя в связи с использованием или невозможностью использования Платформы, а также в результате задержек в обработке сообщений, вызванных сбоями в сетях электросвязи или действиями третьих лиц.`,
  },
  {
    title: "7. Политика обработки персональных данных",
    content: `7.1. Сбор, хранение и обработка персональных данных Пользователей, направляемых через Сайт connect.trioz.ru, осуществляются в строгом соответствии с Федеральным законом РФ № 152-ФЗ «О персональных данных».

7.2. Категории обрабатываемых данных:
• Имя, Фамилия, Отчество, адрес электронной почты, номер телефона — для идентификации Пользователя, обработки входящих сообщений, консультирования и предоставления ответов. Хранятся до достижения целей обработки или до момента отзыва согласия.
• Технические данные (IP-адрес, файлы cookie, данные о браузере, время доступа) — для аналитики работы Сайта, оптимизации интерфейса, обеспечения информационной безопасности. Автоматическое удаление в соответствии с настройками веб-сервера (до 12 месяцев).

7.3. Администрация принимает необходимые организационные и технические меры для защиты персональной информации Пользователя от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования, распространения.`,
  },
  {
    title: "8. Разрешение споров и заключительные положения",
    content: `8.1. Все споры и разногласия, возникающие из настоящего Соглашения или в связи с ним, подлежат разрешению путем переговоров с соблюдением обязательного досудебного претензионного порядка. Срок рассмотрения претензии составляет 15 (пятнадцать) рабочих дней с момента её получения Стороной.

8.2. В случае невозможности достижения согласия, спор передается на рассмотрение в суд по месту нахождения Администрации Платформы в соответствии с действующим законодательством Российской Федерации.

8.3. Администрация вправе в любой момент в одностороннем порядке изменять условия настоящего Соглашения. Новая редакция вступает в силу с момента ее публикации на странице https://connect.trioz.ru, если иное не предусмотрено новой редакцией Соглашения.

Контакты Администрации проекта TRIOZ:
URL-адрес: https://connect.trioz.ru
Назначение: Платформа обслуживания клиентов и обработки сообщений
Электронный адрес для юридических запросов и отзывов персональных данных: legal@trioz.ru`,
  },
];

function LegalSection() {
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-20"
    >
      {/* Divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-white/10 to-transparent" />
        <span className="text-xs font-medium tracking-widest uppercase text-neutral-400 dark:text-gray-600">Юридическая информация</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-white/10 to-transparent" />
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full group relative rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-white/[0.07] hover:border-neutral-300 dark:hover:border-white/[0.13] bg-white dark:bg-white/[0.025] transition-all duration-300 hover:shadow-lg dark:hover:shadow-none"
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-neutral-400 dark:bg-gray-500 opacity-30 group-hover:opacity-60 transition-opacity" />
        <div className="p-5 pl-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-neutral-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-left">
              <div className="text-sm font-semibold text-neutral-800 dark:text-white">Пользовательское соглашение</div>
              <div className="text-xs text-neutral-400 dark:text-gray-500 mt-0.5">Политика ведения деятельности платформы TRIOZ — редакция от 31 мая 2026 г.</div>
            </div>
          </div>
          <motion.svg
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="w-5 h-5 text-neutral-400 dark:text-gray-500 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-neutral-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] p-6 md:p-8">
              {/* Preamble */}
              <p className="text-sm text-neutral-600 dark:text-gray-400 leading-relaxed mb-6">
                Настоящий документ представляет собой официальное публичное предложение (публичную оферту) проекта TRIOZ, доступного в сети Интернет по адресу{" "}
                <a href="https://connect.trioz.ru" className="text-violet-600 dark:text-cyan-400 hover:underline">connect.trioz.ru</a>,
                адресованное любому физическому лицу, индивидуальному предпринимателю или юридическому лицу (далее — «Пользователь»).
                В соответствии с пунктом 2 статьи 437 ГК РФ, принятие условий и использование Платформы является акцептом данной оферты.
              </p>

              {/* Accordion sections */}
              <div className="space-y-2">
                {legalSections.map((s, i) => (
                  <div key={i} className="rounded-xl border border-neutral-100 dark:border-white/[0.05] overflow-hidden">
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm font-medium text-neutral-700 dark:text-gray-300">{s.title}</span>
                      <motion.svg
                        animate={{ rotate: expandedIdx === i ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-4 h-4 text-neutral-400 dark:text-gray-600 flex-shrink-0"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </button>
                    <AnimatePresence>
                      {expandedIdx === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 text-sm text-neutral-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                            {s.content}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Contact footer */}
              <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-neutral-400 dark:text-gray-600">
                  Для юридических запросов:{" "}
                  <a href="mailto:legal@trioz.ru" className="text-violet-600 dark:text-cyan-400 hover:underline">legal@trioz.ru</a>
                </div>
                <div className="text-xs text-neutral-400 dark:text-gray-600">
                  connect.trioz.ru — Юридическая документация
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
