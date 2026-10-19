CREATE DATABASE TCC;

USE TCC;

CREATE TABLE usuario (
	id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nome_usuario varchar(300),
	email varchar(300),
	senha varchar(300)
);

CREATE TABLE avaliacoes ( id INT AUTO_INCREMENT PRIMARY KEY,
	musica VARCHAR(255) NOT NULL,
	artista VARCHAR(255) NOT NULL,
	comentario TEXT NOT NULL,
    nota TINYINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
    
    ALTER TABLE avaliacoes ADD COLUMN capa_album VARCHAR(500) NULL,
    ADD COLUMN id_deezer INT NULL,
    ADD COLUMN id_album INT NULL;
    ALTER TABLE avaliacoes MODIFY COLUMN id_deezer BIGINT UNSIGNED;
    ALTER TABLE avaliacoes MODIFY COLUMN id_album BIGINT UNSIGNED;
    
CREATE TABLE curtidas (
    id_curtida INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_avaliacao INT NOT NULL,

    -- Cada usuário só pode curtir uma mesma avaliação uma vez
    UNIQUE KEY usuario_avaliacao_unica (id_usuario, id_avaliacao),

    -- Relação com o usuário
    CONSTRAINT fk_curtida_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuario(id_usuario)
    ON DELETE CASCADE,

    -- Relação com a avaliação
    CONSTRAINT fk_curtida_avaliacao
    FOREIGN KEY (id_avaliacao)
    REFERENCES avaliacoes(id)
    ON DELETE CASCADE
);

SELECT * FROM curtidas;

SELECT * FROM avaliacoes;

SELECT * FROM usuario;

ALTER TABLE usuario
ADD COLUMN foto_perfil VARCHAR(500) NULL,
ADD COLUMN biografia TEXT NULL;

ALTER TABLE avaliacoes
ADD COLUMN id_usuario INT NULL;

ALTER TABLE avaliacoes
ADD CONSTRAINT fk_avaliacao_usuario
FOREIGN KEY (id_usuario)
REFERENCES usuario(id_usuario)
ON DELETE CASCADE;

ALTER TABLE usuario
MODIFY COLUMN foto_perfil LONGTEXT NULL;

ALTER TABLE usuario
MODIFY COLUMN foto_perfil LONGTEXT NULL;

ALTER TABLE avaliacoes
ADD COLUMN preview VARCHAR(500) NULL;