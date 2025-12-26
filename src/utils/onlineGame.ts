const API_URL = 'https://functions.poehali.dev/4cdc3b03-605a-4951-8e2c-f540f50fc78f';

export type OnlinePlayer = {
  player_id: number;
  player_name: string;
  color: string;
  position: number;
  health: number;
  heart_rate: number;
  systolic: number;
  diastolic: number;
  skipped_turns: number;
};

export type RoomState = {
  room: {
    room_id: string;
    status: 'waiting' | 'playing' | 'finished';
    current_player_id: number;
    total_cells: number;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
  };
  players: OnlinePlayer[];
};

export async function createRoom(): Promise<{ room_id: string; status: string }> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create' }),
  });

  if (!response.ok) {
    throw new Error('Failed to create room');
  }

  return response.json();
}

export async function joinRoom(roomId: string, playerName: string): Promise<{ player_id: number; room_id: string; player_name: string }> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'join', room_id: roomId, player_name: playerName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join room');
  }

  return response.json();
}

export async function getRoomState(roomId: string): Promise<RoomState> {
  const response = await fetch(`${API_URL}?room_id=${roomId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to get room state');
  }

  return response.json();
}

export async function updateGameState(
  roomId: string,
  playerId: number,
  updates: Partial<OnlinePlayer>,
  currentPlayerId?: number,
  startGame?: boolean
): Promise<{ success: boolean }> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      room_id: roomId,
      player_id: playerId,
      updates,
      current_player_id: currentPlayerId,
      start_game: startGame,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update game state');
  }

  return response.json();
}
