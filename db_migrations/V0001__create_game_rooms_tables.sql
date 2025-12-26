-- Таблица игровых комнат
CREATE TABLE IF NOT EXISTS game_rooms (
    room_id VARCHAR(8) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    current_player_id INT DEFAULT 0,
    total_cells INT DEFAULT 50,
    game_state TEXT NULL,
    status VARCHAR(20) DEFAULT 'waiting'
);

-- Таблица игроков в комнатах
CREATE TABLE IF NOT EXISTS room_players (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(8) NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    player_color VARCHAR(50) NOT NULL,
    position INT DEFAULT 0,
    health INT DEFAULT 100,
    heart_rate INT DEFAULT 72,
    pressure_systolic INT DEFAULT 120,
    pressure_diastolic INT DEFAULT 80,
    skipped_turns INT DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_ready BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (room_id) REFERENCES game_rooms(room_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_room_status ON game_rooms(status);
CREATE INDEX idx_room_players ON room_players(room_id);