import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Zap,
  Target,
  Clock,
  TrendingUp,
  MessageSquare,
  Users,
  BarChart3,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  Shield,
  Calendar,
} from "lucide-react";

type LandingVariant = "startup" | "simple" | "team";

const Landing = () => {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<LandingVariant>("startup");

  const getVariantConfig = () => {
    switch (variant) {
      case "startup":
        return {
          gradient: "animated-rainbow-bg",
          accent: "text-white",
          accentBg: "bg-white/30",
          title: "Развивайте бизнес – задачи выполнит ваш AI-менеджер",
          subtitle: "Фокус на рост, а рутину поручите AI",
          description:
            "AI TaskManager выступает как виртуальный COO: автоматизирует расписание, напоминания, обновления. Держите всё под контролем без найма дополнительного персонала.",
          features: [
            {
              icon: <Zap className="h-6 w-6" />,
              title: "Автопилот для проектов",
              text: "AI сам планирует, назначает и отслеживает задачи, экономя часы каждую неделю",
            },
            {
              icon: <BarChart3 className="h-6 w-6" />,
              title: "Всегда в курсе",
              text: "Актуальные статусы и предупреждения о рисках без совещаний",
            },
            {
              icon: <Target className="h-6 w-6" />,
              title: "Умный помощник",
              text: "Вместо найма менеджера – готовый виртуальный сотрудник",
            },
          ],
        };
      case "simple":
        return {
          gradient: "animated-rainbow-bg",
          accent: "text-white",
          accentBg: "bg-white/30",
          title: "Ваш список дел + AI = всё под контролем без усилий",
          subtitle: "Организуй жизнь и работу, просто поговорив с умным ассистентом",
          description:
            "AI TaskManager становится вашим вторым мозгом. Он не только фиксирует задачи, но и напоминает, планирует день оптимально и помогает начать работу.",
          features: [
            {
              icon: <Bot className="h-6 w-6" />,
              title: "Личный помощник 24/7",
              text: "Напоминает о встречах, дедлайнах, даже о бытовых делах",
            },
            {
              icon: <MessageSquare className="h-6 w-6" />,
              title: "Никакого обучения",
              text: "Интерфейс в формате чата – просто спроси или продиктуй задачу",
            },
            {
              icon: <Sparkles className="h-6 w-6" />,
              title: "Эффективность без стресса",
              text: "AI помогает расставить приоритеты и разбить большие цели на шаги",
            },
          ],
        };
      case "team":
        return {
          gradient: "animated-rainbow-bg",
          accent: "text-white",
          accentBg: "bg-white/30",
          title: "AI TaskManager – ваш главный операционный помощник",
          subtitle: "Держите весь отдел под контролем с AI, без лишней бюрократии",
          description:
            "ИИ работает как центр управления для вашего отдела, объединяя людей, процессы и данные. Прозрачность и порядок в команде.",
          features: [
            {
              icon: <Layers className="h-6 w-6" />,
              title: "Единая картина",
              text: "Видите всё: кто чем занят, где узкие места, какие клиенты ждут ответа",
            },
            {
              icon: <Users className="h-6 w-6" />,
              title: "Автоматизация процессов",
              text: "AI интегрируется с CRM, Helpdesk и ставит задачи между отделами",
            },
            {
              icon: <Shield className="h-6 w-6" />,
              title: "Прозрачность",
              text: "Каждый видит свои задачи, AI контролирует прогресс без микроменеджмента",
            },
          ],
        };
    }
  };

  const config = getVariantConfig();

  const benefits = [
    { icon: <Zap className="h-5 w-5" />, text: "Автоматизация" },
    { icon: <Target className="h-5 w-5" />, text: "Приоритизация" },
    { icon: <Clock className="h-5 w-5" />, text: "Соблюдение сроков" },
    { icon: <Bot className="h-5 w-5" />, text: "Чат с ИИ" },
    { icon: <TrendingUp className="h-5 w-5" />, text: "Рост продуктивности" },
  ];

  const useCases = [
    {
      title: "Вам нужны новые подходы",
      text: "Выходите на следующий уровень с AI сразу, минуя устаревшие инструменты",
    },
    {
      title: "Текущий менеджер не поддерживает AI",
      text: "Переходите на платформу, где AI встроен изначально",
    },
    {
      title: "Многое могла бы делать автоматика",
      text: "AI возьмет на себя рутину: напоминания, отчёты, распределение задач",
    },
    {
      title: 'Команда "роняет" задачи',
      text: "AI своевременно шлет напоминания, не позволяя задачам провалиться",
    },
  ];

  return (
    <div className={`min-h-screen ${config.gradient}`}>
      {/* Variant Selector */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-lg">
        <Button
          size="sm"
          variant={variant === "startup" ? "default" : "ghost"}
          onClick={() => setVariant("startup")}
          className="text-white"
        >
          Стартап
        </Button>
        <Button
          size="sm"
          variant={variant === "simple" ? "default" : "ghost"}
          onClick={() => setVariant("simple")}
          className="text-white"
        >
          Простой
        </Button>
        <Button
          size="sm"
          variant={variant === "team" ? "default" : "ghost"}
          onClick={() => setVariant("team")}
          className="text-white"
        >
          Команда
        </Button>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="text-white text-sm font-medium">AI First Task Manager</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {config.title}
          </h1>
          
          <p className={`text-xl md:text-2xl ${config.accent} mb-4 font-semibold`}>
            {config.subtitle}
          </p>
          
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            {config.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className={`${config.accentBg} hover:opacity-90 text-white text-lg px-8 py-6`}
            >
              Начать бесплатно
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/")}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-lg px-8 py-6"
            >
              Смотреть демо
            </Button>
          </div>

          {/* Benefits Pills */}
          <div className="flex flex-wrap gap-3 justify-center mt-12">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                <div className={config.accent}>{benefit.icon}</div>
                <span className="text-white text-sm">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Возможности AI TaskManager
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {config.features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all duration-300"
              >
                <div className={`${config.accentBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/80">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Когда стоит перейти на AI Task Manager
          </h2>
          <p className="text-white/80 text-center mb-12 text-lg">
            Типичные ситуации, при которых имеет смысл внедрить наш AI TaskManager
          </p>
          
          <div className="space-y-4">
            {useCases.map((useCase, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`${config.accentBg} w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white`}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-white/80">{useCase.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Что еще умеет AI TaskManager
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <MessageSquare className="h-8 w-8 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Создание задач в диалоге
              </h3>
              <p className="text-white/80">
                Ставьте задачи голосом или текстом. AI понимает естественный язык и заводит задачи сам.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Calendar className="h-8 w-8 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Автоматическое планирование
              </h3>
              <p className="text-white/80">
                AI расставляет приоритеты и сроки с учётом множества факторов. План обновляется динамически.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Clock className="h-8 w-8 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Напоминания и контроль
              </h3>
              <p className="text-white/80">
                Своевременные напоминания без микроменеджмента. Важные дела не теряются.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Bot className="h-8 w-8 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Помощь 24/7
              </h3>
              <p className="text-white/80">
                AI работает круглосуточно, помнит всю историю и подготавливает сводки.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Layers className="h-8 w-8 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Гибкая адаптация
              </h3>
              <p className="text-white/80">
                Система настраивается под ваши процессы в диалоге. Инструмент растет вместе с компанией.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <BarChart3 className="h-8 w-8 text-white mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Отчёты и аналитика
              </h3>
              <p className="text-white/80">
                AI анализирует данные и предоставляет инсайты для принятия решений.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Готовы начать с AI?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Присоединяйтесь к компаниям, которые уже используют AI для управления задачами
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className={`${config.accentBg} hover:opacity-90 text-white text-lg px-8 py-6`}
            >
              Начать бесплатно
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/agents")}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-lg px-8 py-6"
            >
              Узнать больше об AI
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-white/10">
        <div className="text-center text-white/60 text-sm">
          <p>© 2025 AI TaskManager. Управляйте задачами с искусственным интеллектом.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
