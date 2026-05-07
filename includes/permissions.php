<?php
// includes/permissions.php — autorização baseada em papéis.
//
// Camada acima de includes/auth.php que responde "este usuário pode
// fazer X em Y?". Os checks são pequenos e lêem o banco sob demanda.
//
// Nota técnica para evolução futura:
//   - usuarios.role é o papel "padrão/global" usado em telas que ainda
//     não estão amarradas a uma mesa específica (ex.: painel inicial).
//   - mesa_participantes.papel é o papel real dentro de uma mesa.
//   - Como existem as duas camadas, o mesmo usuário já pode ser
//     Facilitador em uma mesa e Participante em outra sem alterações
//     de schema. A tela de seleção de mesa é o que ainda precisa ser
//     construída em iterações posteriores.

require_once __DIR__ . '/auth.php';

/**
 * Devolve o papel global do usuário ('facilitador' | 'participante')
 * ou null se não estiver logado.
 */
function papelGlobal(): ?string
{
    $u = usuarioLogado();
    return $u['role'] ?? null;
}

function ehFacilitadorGlobal(): bool
{
    return papelGlobal() === 'facilitador';
}

function ehParticipanteGlobal(): bool
{
    return papelGlobal() === 'participante';
}

/**
 * Devolve o papel do usuário em uma mesa específica, ou null se ele
 * não estiver vinculado àquela mesa.
 */
function papelEmMesa(int $mesaId, ?int $usuarioId = null): ?string
{
    global $pdo;

    if ($usuarioId === null) {
        $u = usuarioLogado();
        if (!$u) return null;
        $usuarioId = (int) $u['id'];
    }

    $stmt = $pdo->prepare(
        "SELECT papel FROM mesa_participantes
         WHERE mesa_id = :mesa AND usuario_id = :usuario LIMIT 1"
    );
    $stmt->execute(['mesa' => $mesaId, 'usuario' => $usuarioId]);
    $row = $stmt->fetch();
    return $row ? (string) $row['papel'] : null;
}

function podeFacilitarMesa(int $mesaId, ?int $usuarioId = null): bool
{
    return papelEmMesa($mesaId, $usuarioId) === 'facilitador';
}

function podeParticiparMesa(int $mesaId, ?int $usuarioId = null): bool
{
    $papel = papelEmMesa($mesaId, $usuarioId);
    return $papel === 'facilitador' || $papel === 'participante';
}
