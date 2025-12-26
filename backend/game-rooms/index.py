import json
import os
import random
import string
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для управления многопользовательскими игровыми комнатами'''
    
    method = event.get('httpMethod', 'GET')
    
    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}
    
    try:
        dsn = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(dsn)
        conn.set_session(autocommit=True)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query_params = event.get('queryStringParameters', {}) or {}
        action = query_params.get('action', '')
        
        # POST - создать новую комнату
        if method == 'POST' and action == 'create':
            room_id = generate_room_id()
            cursor.execute(
                "INSERT INTO game_rooms (room_id, status) VALUES (%s, 'waiting') RETURNING room_id, created_at",
                (room_id,)
            )
            result = cursor.fetchone()
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'roomId': result['room_id'],
                    'createdAt': result['created_at'].isoformat()
                })
            }
        
        # POST - присоединиться к комнате
        if method == 'POST' and action == 'join':
            body = json.loads(event.get('body', '{}'))
            room_id = body.get('roomId')
            player_name = body.get('playerName')
            
            # Проверка существования комнаты
            cursor.execute("SELECT status FROM game_rooms WHERE room_id = %s", (room_id,))
            room = cursor.fetchone()
            
            if not room:
                return {
                    'statusCode': 404,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'Комната не найдена'})
                }
            
            if room['status'] != 'waiting':
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'Игра уже началась'})
                }
            
            # Проверка количества игроков
            cursor.execute("SELECT COUNT(*) as count FROM room_players WHERE room_id = %s", (room_id,))
            player_count = cursor.fetchone()['count']
            
            if player_count >= 4:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'Комната полная (максимум 4 игрока)'})
                }
            
            # Назначаем цвет игроку
            colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500']
            cursor.execute("SELECT player_color FROM room_players WHERE room_id = %s", (room_id,))
            used_colors = [row['player_color'] for row in cursor.fetchall()]
            available_colors = [c for c in colors if c not in used_colors]
            player_color = available_colors[0] if available_colors else colors[0]
            
            # Добавляем игрока
            cursor.execute(
                """INSERT INTO room_players 
                (room_id, player_name, player_color) 
                VALUES (%s, %s, %s) RETURNING id""",
                (room_id, player_name, player_color)
            )
            player_id = cursor.fetchone()['id']
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'playerId': player_id,
                    'playerColor': player_color,
                    'success': True
                })
            }
        
        # GET - получить состояние комнаты
        if method == 'GET':
            room_id = query_params.get('roomId')
            
            if not room_id:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'Требуется roomId'})
                }
            
            cursor.execute("SELECT * FROM game_rooms WHERE room_id = %s", (room_id,))
            room = cursor.fetchone()
            
            if not room:
                return {
                    'statusCode': 404,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'Комната не найдена'})
                }
            
            cursor.execute(
                """SELECT id, player_name, player_color, position, health, 
                heart_rate, pressure_systolic, pressure_diastolic, 
                skipped_turns, is_ready 
                FROM room_players WHERE room_id = %s ORDER BY joined_at""",
                (room_id,)
            )
            players = cursor.fetchall()
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'room': dict(room),
                    'players': [dict(p) for p in players]
                }, default=str)
            }
        
        # PUT - начать игру
        if method == 'PUT' and action == 'start':
            body = json.loads(event.get('body', '{}'))
            room_id = body.get('roomId')
            
            cursor.execute(
                "UPDATE game_rooms SET status = 'playing', started_at = CURRENT_TIMESTAMP WHERE room_id = %s",
                (room_id,)
            )
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'success': True})
            }
        
        # PUT - обновить состояние игры
        if method == 'PUT' and action == 'update':
            body = json.loads(event.get('body', '{}'))
            room_id = body.get('roomId')
            game_state = body.get('gameState')
            current_player_id = body.get('currentPlayerId')
            
            cursor.execute(
                "UPDATE game_rooms SET game_state = %s, current_player_id = %s WHERE room_id = %s",
                (json.dumps(game_state), current_player_id, room_id)
            )
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'success': True})
            }
        
        return {
            'statusCode': 404,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Маршрут не найден'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': str(e)})
        }
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def generate_room_id() -> str:
    '''Генерирует уникальный 8-символьный ID комнаты'''
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))