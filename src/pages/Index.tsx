import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';

type Player = {
  id: number;
  name: string;
  position: number;
  pressure: { systolic: number; diastolic: number };
  heartRate: number;
  health: number;
  color: string;
  skippedTurns: number;
};

type CellEffect = {
  type: 'good' | 'bad' | 'neutral';
  name: string;
  description: string;
  effect: (player: Player) => Player;
};

const cellEffects: Record<number, CellEffect> = {
  3: {
    type: 'good',
    name: '🏃 Утренняя пробежка',
    description: 'Легкая кардионагрузка улучшает кровообращение, пульс повышается умеренно',
    effect: (p) => ({
      ...p,
      pressure: { systolic: Math.max(110, p.pressure.systolic - 5), diastolic: Math.max(70, p.pressure.diastolic - 3) },
      heartRate: Math.min(100, p.heartRate + 15),
      health: Math.min(100, p.health + 10),
    }),
  },
  7: {
    type: 'bad',
    name: '😰 Стрессовая ситуация',
    description: 'Стресс повышает пульс, давление и ухудшает самочувствие',
    effect: (p) => ({
      ...p,
      pressure: { systolic: Math.min(180, p.pressure.systolic + 10), diastolic: Math.min(110, p.pressure.diastolic + 5) },
      heartRate: Math.min(140, p.heartRate + 20),
      health: Math.max(0, p.health - 15),
    }),
  },
  12: {
    type: 'good',
    name: '🧘 Йога и растяжка',
    description: 'Релаксация снижает пульс и давление',
    effect: (p) => ({
      ...p,
      pressure: { systolic: Math.max(110, p.pressure.systolic - 8), diastolic: Math.max(70, p.pressure.diastolic - 5) },
      heartRate: Math.max(60, p.heartRate - 10),
      health: Math.min(100, p.health + 15),
    }),
  },
  15: {
    type: 'bad',
    name: '🍔 Фастфуд',
    description: 'Нездоровая пища ухудшает показатели',
    effect: (p) => ({
      ...p,
      pressure: { systolic: Math.min(180, p.pressure.systolic + 7), diastolic: Math.min(110, p.pressure.diastolic + 4) },
      heartRate: Math.min(140, p.heartRate + 8),
      health: Math.max(0, p.health - 10),
    }),
  },
  20: {
    type: 'good',
    name: '🏋️ Силовая тренировка',
    description: 'Тренировки укрепляют сердце, временно повышают пульс',
    effect: (p) => ({
      ...p,
      pressure: { systolic: Math.max(110, p.pressure.systolic - 6), diastolic: Math.max(70, p.pressure.diastolic - 4) },
      heartRate: Math.min(110, p.heartRate + 25),
      health: Math.min(100, p.health + 20),
    }),
  },
  24: {
    type: 'bad',
    name: '😴 Недосып',
    description: 'Недостаток сна повышает пульс и давление. Пропуск хода!',
    effect: (p) => ({
      ...p,
      pressure: { systolic: Math.min(180, p.pressure.systolic + 12), diastolic: Math.min(110, p.pressure.diastolic + 7) },
      heartRate: Math.min(140, p.heartRate + 18),
      health: Math.max(0, p.health - 20),
      skippedTurns: 1,
    }),
  },
  28: {
    type: 'good',
    name: '🥗 Здоровое питание',
    description: 'Правильное питание нормализует пульс и давление',
    effect: (p) => ({
      ...p,
      pressure: { systolic: Math.max(110, p.pressure.systolic - 7), diastolic: Math.max(70, p.pressure.diastolic - 5) },
      heartRate: Math.max(60, p.heartRate - 5),
      health: Math.min(100, p.health + 18),
    }),
  },
};

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'game' | 'rules' | 'results'>('home');
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'Игрок 1', position: 0, pressure: { systolic: 120, diastolic: 80 }, heartRate: 72, health: 100, color: 'bg-blue-500', skippedTurns: 0 },
    { id: 2, name: 'Игрок 2', position: 0, pressure: { systolic: 120, diastolic: 80 }, heartRate: 72, health: 100, color: 'bg-purple-500', skippedTurns: 0 },
    { id: 3, name: 'Игрок 3', position: 0, pressure: { systolic: 120, diastolic: 80 }, heartRate: 72, health: 100, color: 'bg-orange-500', skippedTurns: 0 },
    { id: 4, name: 'Игрок 4', position: 0, pressure: { systolic: 120, diastolic: 80 }, heartRate: 72, health: 100, color: 'bg-pink-500', skippedTurns: 0 },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);

  const totalCells = 30;

  const rollDice = () => {
    if (isRolling) return;

    const currentPlayer = players[currentPlayerIndex];

    if (currentPlayer.skippedTurns > 0) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === currentPlayer.id ? { ...p, skippedTurns: p.skippedTurns - 1 } : p))
      );
      setGameLog((prev) => [...prev, `${currentPlayer.name} пропускает ход из-за недосыпа!`]);
      nextPlayer();
      return;
    }

    setIsRolling(true);
    const roll = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      setDiceValue(roll);
      setIsRolling(false);

      setPlayers((prev) => {
        const updatedPlayers = prev.map((player) => {
          if (player.id === currentPlayer.id) {
            const newPosition = Math.min(player.position + roll, totalCells - 1);
            let updatedPlayer = { ...player, position: newPosition };

            const effect = cellEffects[newPosition];
            if (effect) {
              updatedPlayer = effect.effect(updatedPlayer);
              setGameLog((logs) => [...logs, `${player.name}: ${effect.name} - ${effect.description}`]);
            }

            if (newPosition === totalCells - 1) {
              setWinner(updatedPlayer);
              setCurrentView('results');
            }

            return updatedPlayer;
          }
          return player;
        });
        return updatedPlayers;
      });

      setTimeout(() => {
        nextPlayer();
      }, 1500);
    }, 800);
  };

  const nextPlayer = () => {
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    setDiceValue(null);
  };

  const resetGame = () => {
    setPlayers([
      { id: 1, name: 'Игрок 1', position: 0, pressure: { systolic: 120, diastolic: 80 }, heartRate: 72, health: 100, color: 'bg-blue-500', skippedTurns: 0 },
      { id: 2, name: 'Игрок 2', position: 0, pressure: { systolic: 120, diastolic: 80 }, heartRate: 72, health: 100, color: 'bg-purple-500', skippedTurns: 0 },
      { id: 3, name: 'Игрок 3', position: 0, pressure: { systolic: 120, diastolic: 80 }, heartRate: 72, health: 100, color: 'bg-orange-500', skippedTurns: 0 },
      { id: 4, name: 'Игрок 4', position: 0, pressure: { systolic: 120, diastolic: 80 }, heartRate: 72, health: 100, color: 'bg-pink-500', skippedTurns: 0 },
    ]);
    setCurrentPlayerIndex(0);
    setDiceValue(null);
    setGameLog([]);
    setWinner(null);
    setCurrentView('home');
  };

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50">
      {currentView === 'home' && (
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <div className="text-center mb-12 animate-slide-in">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">
              Игра: Здоровое сердце! 🎲💓
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Образовательная настольная игра о влиянии физической нагрузки на пульс и артериальное давление
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-2 hover:shadow-xl transition-all hover:scale-105">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Users" size={24} className="text-blue-600" />
                  До 4 игроков
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Играйте компанией и учитесь управлять своим здоровьем вместе!</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all hover:scale-105">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Activity" size={24} className="text-purple-600" />
                  Реальные показатели
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Отслеживайте пульс, давление и здоровье в режиме реального времени</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all hover:scale-105">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Sparkles" size={24} className="text-orange-600" />
                  Обучение через игру
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Узнайте, как образ жизни влияет на ваш пульс и давление</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => setCurrentView('game')} className="text-lg px-8 animate-bounce-subtle">
              <Icon name="Play" size={20} className="mr-2" />
              Начать игру
            </Button>
            <Button size="lg" variant="outline" onClick={() => setCurrentView('rules')} className="text-lg px-8">
              <Icon name="BookOpen" size={20} className="mr-2" />
              Правила
            </Button>
          </div>
        </div>
      )}

      {currentView === 'game' && (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" onClick={() => setCurrentView('home')}>
              <Icon name="Home" size={20} className="mr-2" />
              На главную
            </Button>
            <h2 className="text-3xl font-bold">Ход: {currentPlayer.name}</h2>
            <Button variant="outline" onClick={() => setCurrentView('rules')}>
              <Icon name="HelpCircle" size={20} className="mr-2" />
              Правила
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Игровое поле</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-10 gap-2">
                    {Array.from({ length: totalCells }).map((_, idx) => {
                      const playersOnCell = players.filter((p) => p.position === idx);
                      const hasEffect = cellEffects[idx];

                      return (
                        <div
                          key={idx}
                          className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold relative transition-all
                            ${hasEffect?.type === 'good' ? 'bg-green-100 border-green-400' : ''}
                            ${hasEffect?.type === 'bad' ? 'bg-red-100 border-red-400' : ''}
                            ${!hasEffect ? 'bg-white border-gray-300' : ''}
                            ${idx === totalCells - 1 ? 'bg-yellow-200 border-yellow-500' : ''}
                          `}
                        >
                          <span className="text-gray-500">{idx + 1}</span>
                          {hasEffect && <span className="text-lg">{hasEffect.name.split(' ')[0]}</span>}
                          {playersOnCell.length > 0 && (
                            <div className="absolute -top-2 -right-2 flex gap-1">
                              {playersOnCell.map((p) => (
                                <div key={p.id} className={`w-3 h-3 rounded-full ${p.color} border-2 border-white`} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Dices" size={24} />
                    Бросок кубика
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div
                    className={`w-24 h-24 bg-white border-4 border-primary rounded-xl flex items-center justify-center text-4xl font-bold shadow-lg
                    ${isRolling ? 'animate-bounce' : ''}
                  `}
                  >
                    {diceValue || '?'}
                  </div>
                  <Button
                    size="lg"
                    onClick={rollDice}
                    disabled={isRolling}
                    className={`${currentPlayer.skippedTurns > 0 ? 'animate-pulse-slow' : ''}`}
                  >
                    {currentPlayer.skippedTurns > 0 ? (
                      <>
                        <Icon name="Ban" size={20} className="mr-2" />
                        Пропустить ход
                      </>
                    ) : (
                      <>
                        <Icon name="Dices" size={20} className="mr-2" />
                        Бросить кубик
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Игроки</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        player.id === currentPlayer.id ? 'border-primary shadow-lg scale-105' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full ${player.color}`} />
                        <span className="font-bold">{player.name}</span>
                        {player.skippedTurns > 0 && (
                          <Badge variant="destructive" className="ml-auto">
                            Пропуск
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Здоровье:</span>
                            <span className="font-bold">{player.health}%</span>
                          </div>
                          <Progress value={player.health} className="h-2" />
                        </div>

                        <div className="flex justify-between">
                          <span>Пульс:</span>
                          <span className="font-bold text-red-600">
                            {player.heartRate} уд/мин
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>Давление:</span>
                          <span className="font-bold">
                            {player.pressure.systolic}/{player.pressure.diastolic}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>Позиция:</span>
                          <span className="font-bold">{player.position + 1}/{totalCells}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="ScrollText" size={20} />
                    История игры
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {gameLog.slice(-5).reverse().map((log, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        {log}
                      </div>
                    ))}
                    {gameLog.length === 0 && <p className="text-gray-400 text-sm">История пока пуста</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {currentView === 'rules' && (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Button variant="outline" onClick={() => setCurrentView('home')} className="mb-6">
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Правила игры</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Icon name="Target" size={20} className="text-blue-600" />
                  Цель игры
                </h3>
                <p className="text-gray-700">
                  Первым достичь финишной клетки (30), управляя своим здоровьем, пульсом и артериальным давлением через принятие решений о физической активности и образе жизни.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Icon name="Gamepad2" size={20} className="text-purple-600" />
                  Как играть
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• В игре участвуют от 2 до 4 игроков</li>
                  <li>• Игроки ходят по очереди, бросая кубик</li>
                  <li>• Попадая на особые клетки, игроки получают эффекты</li>
                  <li>• Следите за показателями давления и здоровья</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Icon name="Sparkles" size={20} className="text-green-600" />
                  Типы клеток
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-bold text-green-700">🟢 Полезные клетки (зеленые)</p>
                    <p className="text-sm text-gray-600">Физическая активность, здоровое питание, отдых - улучшают показатели</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-bold text-red-700">🔴 Вредные клетки (красные)</p>
                    <p className="text-sm text-gray-600">Стресс, фастфуд, недосып - ухудшают показатели и могут заставить пропустить ход</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-bold text-gray-700">⚪ Нейтральные клетки (белые)</p>
                    <p className="text-sm text-gray-600">Обычные клетки без эффектов</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Icon name="Activity" size={20} className="text-orange-600" />
                  Показатели здоровья
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• <strong>Пульс:</strong> норма 60-80 уд/мин (меняется при физ. нагрузках)</li>
                  <li>• <strong>Артериальное давление:</strong> норма 120/80 мм рт.ст.</li>
                  <li>• <strong>Здоровье:</strong> общее состояние игрока (0-100%)</li>
                  <li>• Следите за изменениями в реальном времени!</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>💡 Образовательная цель:</strong> Игра показывает, как физическая активность, питание и образ жизни влияют на пульс, артериальное давление и общее состояние здоровья.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentView === 'results' && winner && (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <Card className="text-center animate-slide-in">
            <CardHeader>
              <CardTitle className="text-4xl mb-4">🏆 Победитель!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`w-24 h-24 rounded-full ${winner.color} mx-auto animate-bounce-subtle`} />
              <h2 className="text-3xl font-bold">{winner.name}</h2>

              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Финальный пульс</p>
                  <p className="text-2xl font-bold text-red-700">
                    {winner.heartRate} уд/мин
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Финальное давление</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {winner.pressure.systolic}/{winner.pressure.diastolic}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Здоровье</p>
                  <p className="text-2xl font-bold text-green-700">{winner.health}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold">Итоги всех игроков:</h3>
                <div className="space-y-2">
                  {players
                    .sort((a, b) => b.position - a.position)
                    .map((player, idx) => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                          <div className={`w-6 h-6 rounded-full ${player.color}`} />
                          <span className="font-bold">{player.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Пульс: {player.heartRate}</span>
                          <span className="ml-3">Давление: {player.pressure.systolic}/{player.pressure.diastolic}</span>
                          <span className="ml-3">Здоровье: {player.health}%</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <Button size="lg" onClick={resetGame} className="mt-6">
                <Icon name="RotateCcw" size={20} className="mr-2" />
                Новая игра
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Index;