CREATE TABLE matches (
    id VARCHAR(36) PRIMARY KEY
);

CREATE TABLE ticktack_logs (
    id VARCHAR(36) PRIMARY KEY,
    match_id VARCHAR(36),
    data TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE player_stats (
    id PRIMARY KEY,
    player_id VARCHAR(36),
    game_id VARCHAR(36),
    match_id VARCHAR(36),
    game_stats TEXT
)