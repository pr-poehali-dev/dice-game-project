import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { createRoom, joinRoom as joinRoomAPI, getRoomState, updateGameState, type OnlinePlayer, type RoomState } from '@/utils/onlineGame';

type Player = OnlinePlayer;

type Room = {
  room_id: string;
  status: string;
  current_player_id: number;
  total_cells: number;
};

const OnlineGame = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  
  const [view, setView] = useState<'join' | 'lobby' | 'game'>('join');
  const [playerName, setPlayerName] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roomId) {
      loadRoom();
    }
  }, [roomId]);

  useEffect(() => {
    if (room && view === 'lobby') {
      const interval = setInterval(loadRoom, 2000);
      return () => clearInterval(interval);
    }
  }, [room, view]);

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const data = await createRoom();
      
      const newRoomId = data.room_id;
      const roomUrl = `${window.location.origin}/online/${newRoomId}`;
      
      await navigator.clipboard.writeText(roomUrl);
      toast.success('Ссылка скопирована в буфер обмена!');
      
      navigate(`/online/${newRoomId}`);
    } catch (error) {
      toast.error('Ошибка создания комнаты');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Введите ваше имя');
      return;
    }
    
    if (!roomId) {
      toast.error('Код комнаты не указан');
      return;
    }
    
    setLoading(true);
    try {
      const data = await joinRoomAPI(roomId, playerName.trim());
      
      setCurrentPlayerId(data.player_id);
      setView('lobby');
      await loadRoom();
      toast.success('Вы присоединились к игре!');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка подключения к комнате');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoom = async () => {
    if (!roomId) return;
    
    try {
      const data = await getRoomState(roomId);
      
      setRoom(data.room);
      setPlayers(data.players);
      
      if (data.room.status === 'playing' && view === 'lobby') {
        setView('game');
      }
    } catch (error) {
      console.error('Error loading room:', error);
    }
  };

  const copyRoomLink = () => {
    const roomUrl = `${window.location.origin}/online/${roomId}`;
    navigator.clipboard.writeText(roomUrl);
    toast.success('Ссылка скопирована!');
  };

  const startGame = async () => {
    if (players.length < 2) {
      toast.error('Нужно минимум 2 игрока для начала игры');
      return;
    }
    
    if (!roomId) return;
    
    try {
      await updateGameState(roomId, 0, {}, 0, true);
      
      setView('game');
      toast.success('Игра началась!');
    } catch (error) {
      toast.error('Ошибка запуска игры');
      console.error(error);
    }
  };

  if (view === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {roomId ? 'Присоединиться к игре' : 'Онлайн-игра'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roomId ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="playerName">Ваше имя</Label>
                  <Input
                    id="playerName"
                    placeholder="Введите ваше имя"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  />
                </div>
                <Button 
                  onClick={handleJoinRoom} 
                  className="w-full" 
                  disabled={loading || !playerName.trim()}
                >
                  {loading ? 'Подключение...' : 'Присоединиться'}
                </Button>
              </>
            ) : (
              <Button onClick={handleCreateRoom} className="w-full" disabled={loading}>
                {loading ? 'Создание...' : 'Создать новую комнату'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              <Icon name="Home" size={20} className="mr-2" />
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="container mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Комната: {roomId}</span>
                <Button variant="outline" size="sm" onClick={copyRoomLink}>
                  <Icon name="Copy" size={16} className="mr-2" />
                  Копировать ссылку
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Игроки ({players.length}/4)
                </h3>
                <div className="grid gap-3">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 rounded-lg border-2"
                    >
                      <div className={`w-8 h-8 rounded-full ${player.player_color}`} />
                      <span className="font-medium">{player.player_name}</span>
                      {player.id === currentPlayerId && (
                        <Badge variant="default" className="ml-auto">Вы</Badge>
                      )}
                    </div>
                  ))}
                  
                  {Array.from({ length: 4 - players.length }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-400"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                      <span>Ожидание игрока...</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {players.length >= 2 && players[0].id === currentPlayerId && (
                  <Button onClick={startGame} className="w-full" size="lg">
                    <Icon name="Play" size={20} className="mr-2" />
                    Начать игру
                  </Button>
                )}
                
                {players.length < 2 && (
                  <p className="text-center text-sm text-gray-500">
                    Ожидание игроков (минимум 2 для старта)
                  </p>
                )}
                
                {players.length >= 2 && players[0].id !== currentPlayerId && (
                  <p className="text-center text-sm text-gray-500">
                    Ожидание начала игры от хоста
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>Игра началась!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Полноценный игровой процесс с синхронизацией в разработке...
            </p>
            
            <div className="mt-6 space-y-4">
              {players.map((player) => (
                <div key={player.id} className="p-4 rounded-lg border-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full ${player.player_color}`} />
                    <span className="font-bold">{player.player_name}</span>
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
                      <span className="font-bold text-red-600">{player.heart_rate} уд/мин</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Давление:</span>
                      <span className="font-bold">
                        {player.pressure_systolic}/{player.pressure_diastolic}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnlineGame;