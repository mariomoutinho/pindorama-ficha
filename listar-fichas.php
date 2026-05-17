<?php

require_once __DIR__ . '/includes/auth.php';
$usuarioAtual = exigirLogin();

require_once 'config.php';
require_once __DIR__ . '/includes/permissions.php';

header('Content-Type: application/json');

if (!garantirColunaUsuarioFicha($pdo)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Não foi possível preparar o vínculo das fichas com o usuário logado.'
    ]);
    exit;
}

$colunas = "
    id,
    participante,
    personagem,
    ancestralidade,
    classe,
    nivel,
    personagem_imagem,
    personagem_imagem_ajuste,
    personagem_token_imagem,
    personagem_token_imagem_ajuste,
    updated_at
";

$stmt = $pdo->prepare(
    "SELECT $colunas FROM fichas WHERE usuario_id = :uid ORDER BY updated_at DESC"
);
$stmt->execute(['uid' => (int) $usuarioAtual['id']]);
echo json_encode($stmt->fetchAll());
