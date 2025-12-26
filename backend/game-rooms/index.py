import json
import os
import random
import string
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для управления многопользовательскими игровыми комнатами'''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Player-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    conn.set_session(autocommit=True)
    
    try:
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        params = event.get('queryStringParameters') or {}
        
        if method == 'POST':
            action = body.get('action', '')
            
            if action == 'create':
                return create_room(conn)
            elif action == 'join':
                return join_room(conn, body)
            elif action == 'update':
                return update_game_state(conn, body)
        
        elif method == 'GET':
            room_id = params.get('room_id')
            if room_id:
                return get_room_state(conn, room_id)
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid request'}),
            'isBase64Encoded': False
        }
    
    finally:
        conn.close()


def generate_room_id() -> str:
    '''Генерация уникального ID комнаты из 8 символов'''
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


def create_room(conn) -> dict:
    '''Создание новой игровой комнаты'''
    room_id = generate_room_id()
    
    with conn.cursor() as cur:
        cur.execute('''
            INSERT INTO t_p9605100_dice_game_project.game_rooms 
            (room_id, created_at, status, total_cells, current_player_id)
            VALUES (%s, %s, %s, %s, %s)
        ''', (room_id, datetime.now(), 'waiting', 50, 0))
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'room_id': room_id, 'status': 'waiting'}),
        'isBase64Encoded': False
    }


def join_room(conn, body: dict) -> dict:
    '''Присоединение игрока к комнате'''
    room_id = body.get('room_id')
    player_name = body.get('player_name', 'Игрок')
    
    if not room_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'room_id required'}),
            'isBase64Encoded': False
        }
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('''
            SELECT status FROM t_p9605100_dice_game_project.game_rooms 
            WHERE room_id = %s
        ''', (room_id,))
        room = cur.fetchone()
        
        if not room:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Room not found'}),
                'isBase64Encoded': False
            }
        
        if room['status'] == 'playing':
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Game already started'}),
                'isBase64Encoded': False
            }
        
        cur.execute('''
            SELECT COUNT(*) as count FROM t_p9605100_dice_game_project.room_players 
            WHERE room_id = %s
        ''', (room_id,))
        count = cur.fetchone()['count']
        
        if count >= 4:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Room is full (max 4 players)'}),
                'isBase64Encoded': False
            }
        
        player_id = count
        colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500']
        
        cur.execute('''
            INSERT INTO t_p9605100_dice_game_project.room_players 
            (room_id, player_name, player_color, position, health, heart_rate, pressure_systolic, pressure_diastolic, joined_at, skipped_turns, is_ready)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (room_id, player_name, colors[player_id], 0, 100, 72, 120, 80, datetime.now(), 0, False))
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('SELECT id FROM t_p9605100_dice_game_project.room_players WHERE room_id = %s ORDER BY id DESC LIMIT 1', (room_id,))
        result = cur.fetchone()
        new_player_id = result['id'] if result else 0
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'player_id': new_player_id, 'room_id': room_id, 'player_name': player_name}),
        'isBase64Encoded': False
    }


def get_room_state(conn, room_id: str) -> dict:
    '''Получение текущего состояния комнаты и всех игроков'''
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('''
            SELECT room_id, created_at, started_at, finished_at, 
                   current_player_id, total_cells, status
            FROM t_p9605100_dice_game_project.game_rooms 
            WHERE room_id = %s
        ''', (room_id,))
        room = cur.fetchone()
        
        if not room:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Room not found'}),
                'isBase64Encoded': False
            }
        
        cur.execute('''
            SELECT id as player_id, player_name, player_color as color, position, health, heart_rate, 
                   pressure_systolic as systolic, pressure_diastolic as diastolic, skipped_turns
            FROM t_p9605100_dice_game_project.room_players 
            WHERE room_id = %s
            ORDER BY id
        ''', (room_id,))
        players = cur.fetchall()
    
    room_data = dict(room)
    room_data['created_at'] = room_data['created_at'].isoformat() if room_data['created_at'] else None
    room_data['started_at'] = room_data['started_at'].isoformat() if room_data['started_at'] else None
    room_data['finished_at'] = room_data['finished_at'].isoformat() if room_data['finished_at'] else None
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'room': room_data,
            'players': [dict(p) for p in players]
        }),
        'isBase64Encoded': False
    }


def update_game_state(conn, body: dict) -> dict:
    '''Обновление состояния игры (ход игрока, изменение здоровья и т.д.)'''
    room_id = body.get('room_id')
    player_id = body.get('player_id')
    updates = body.get('updates', {})
    
    if not room_id or player_id is None:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'room_id and player_id required'}),
            'isBase64Encoded': False
        }
    
    with conn.cursor() as cur:
        update_fields = []
        values = []
        
        for key, value in updates.items():
            if key in ['position', 'health', 'heart_rate', 'systolic', 'diastolic', 'skipped_turns']:
                update_fields.append(f'{key} = %s')
                values.append(value)
        
        if update_fields:
            values.extend([room_id, player_id])
            cur.execute(f'''
                UPDATE t_p9605100_dice_game_project.room_players 
                SET {', '.join(update_fields)}
                WHERE room_id = %s AND player_id = %s
            ''', values)
        
        if 'current_player_id' in body:
            cur.execute('''
                UPDATE t_p9605100_dice_game_project.game_rooms 
                SET current_player_id = %s
                WHERE room_id = %s
            ''', (body['current_player_id'], room_id))
        
        if body.get('start_game'):
            cur.execute('''
                UPDATE t_p9605100_dice_game_project.game_rooms 
                SET status = %s, started_at = %s
                WHERE room_id = %s
            ''', ('playing', datetime.now(), room_id))
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }