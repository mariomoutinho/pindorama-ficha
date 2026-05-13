<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/permissions.php';
require_once __DIR__ . '/includes/mesa-helpers.php';
require_once __DIR__ . '/config.php';

$usuario = exigirLogin();
exigirFacilitador('a área de mesas é exclusiva do Facilitador');

$flash = $_GET['msg'] ?? null;
$flashType = $_GET['type'] ?? 'info';

$selecionadaId = isset($_GET['id']) ? (int) $_GET['id'] : null;
$mesaSelecionada = null;
$participantes = [];
$participantesDisp = [];
$fichasDisponiveis = [];
if ($selecionadaId) {
    $mesaSelecionada = carregarMesa($selecionadaId);
    if ($mesaSelecionada && (int) $mesaSelecionada['facilitador_id'] === (int) $usuario['id']) {
        $participantes = listarParticipantesDaMesa($selecionadaId);
        $participantesDisp = listarParticipantesDisponiveisParaMesa($selecionadaId);
        $fichasDisponiveis = listarFichasSemDono();
    } else {
        $mesaSelecionada = null;
    }
}

$mesas = listarMesasDoFacilitador((int) $usuario['id']);
$csrf = tokenCsrf();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Minhas Mesas — Pindorama RPG</title>
    <link rel="stylesheet" href="assets/css/ficha.css" />
    <link rel="stylesheet" href="assets/css/home.css?v=20260513h" />
    <link rel="stylesheet" href="assets/css/auth.css?v=20260513i" />
    <link rel="stylesheet" href="assets/css/transitions.css?v=20260508u" />
    <link rel="stylesheet" href="assets/css/painel-facilitador.css?v=20260513b" />
</head>
<body class="home-body">
    <script src="assets/js/transitions.js?v=20260508u"></script>

    <main class="home-shell painel-shell">
        <header class="home-hero home-hero-compact">
            <a href="index.php" class="home-back" aria-label="Voltar ao menu">&larr;</a>
            <h1 class="home-title">Minhas Mesas</h1>
            <p class="home-subtitle">Crie e administre suas campanhas.</p>
        </header>

        <?php if ($flash): ?>
            <div class="painel-flash painel-flash--<?= htmlspecialchars($flashType) ?>">
                <?= htmlspecialchars($flash) ?>
            </div>
        <?php endif; ?>

        <section class="painel-grid">
            <article class="painel-card">
                <h2>Lista</h2>
                <?php if (empty($mesas)): ?>
                    <p class="painel-empty">Você ainda não criou mesas.</p>
                <?php else: ?>
                    <ul class="painel-list">
                        <?php foreach ($mesas as $m): ?>
                            <li class="painel-item <?= ((int) $m['id'] === $selecionadaId) ? 'is-active' : '' ?>">
                                <a href="mesas.php?id=<?= (int) $m['id'] ?>">
                                    <strong><?= htmlspecialchars($m['nome']) ?></strong>
                                    <span class="painel-item-meta">
                                        <?= htmlspecialchars($m['status'] ?? 'ativa') ?>
                                    </span>
                                </a>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </article>

            <article class="painel-card">
                <h2><?= $mesaSelecionada ? 'Editar mesa' : 'Nova mesa' ?></h2>
                <form method="post" action="salvar-mesa.php" class="painel-form">
                    <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>" />
                    <?php if ($mesaSelecionada): ?>
                        <input type="hidden" name="id" value="<?= (int) $mesaSelecionada['id'] ?>" />
                    <?php endif; ?>
                    <label>Nome
                        <input type="text" name="nome" required maxlength="180"
                               value="<?= htmlspecialchars($mesaSelecionada['nome'] ?? '') ?>" />
                    </label>
                    <label>Descrição
                        <textarea name="descricao" rows="4"><?= htmlspecialchars($mesaSelecionada['descricao'] ?? '') ?></textarea>
                    </label>
                    <label>Status
                        <select name="status">
                            <?php $st = $mesaSelecionada['status'] ?? 'ativa'; ?>
                            <option value="rascunho"<?= $st === 'rascunho' ? ' selected' : '' ?>>Rascunho</option>
                            <option value="ativa"<?= $st === 'ativa' ? ' selected' : '' ?>>Ativa</option>
                            <option value="arquivada"<?= $st === 'arquivada' ? ' selected' : '' ?>>Arquivada</option>
                        </select>
                    </label>
                    <div class="painel-form-actions">
                        <button type="submit" class="home-btn"><?= $mesaSelecionada ? 'Salvar' : 'Criar mesa' ?></button>
                        <?php if ($mesaSelecionada): ?>
                            <a href="mesas.php" class="home-btn home-btn-ghost">Nova</a>
                        <?php endif; ?>
                    </div>
                </form>

                <?php if ($mesaSelecionada): ?>
                    <form method="post" action="excluir-mesa.php" class="painel-form-mini"
                          onsubmit="return confirm('Excluir a mesa &quot;<?= htmlspecialchars($mesaSelecionada['nome']) ?>&quot;? Conteúdos e participantes serão removidos.');">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>" />
                        <input type="hidden" name="id" value="<?= (int) $mesaSelecionada['id'] ?>" />
                        <button type="submit" class="home-btn home-btn-danger">Excluir mesa</button>
                    </form>
                <?php endif; ?>
            </article>

            <?php if ($mesaSelecionada): ?>
                <article class="painel-card painel-card--wide">
                    <h2>Participantes desta mesa</h2>
                    <?php if (empty($participantes)): ?>
                        <p class="painel-empty">Nenhum participante vinculado ainda. Marque jogadores abaixo para vincular.</p>
                    <?php else: ?>
                        <ul class="participantes-grid">
                            <?php foreach ($participantes as $p):
                                $av = urlAvatarUsuario($p['foto_path'] ?? null);
                            ?>
                                <li class="participante-card">
                                    <div class="participante-avatar<?= $av === '' ? ' is-empty' : '' ?>">
                                        <?php if ($av !== ''): ?>
                                            <img src="<?= htmlspecialchars($av) ?>" alt="" loading="lazy"
                                                 onerror="this.remove();this.closest('.participante-avatar').classList.add('is-empty');this.closest('.participante-avatar').textContent='<?= htmlspecialchars(inicialAvatarUsuario($p['nome'])) ?>';" />
                                        <?php else: ?>
                                            <?= htmlspecialchars(inicialAvatarUsuario($p['nome'])) ?>
                                        <?php endif; ?>
                                    </div>
                                    <div class="participante-info">
                                        <strong><?= htmlspecialchars($p['nome']) ?></strong>
                                        <span class="participante-email"><?= htmlspecialchars($p['email']) ?></span>
                                        <span class="participante-papel participante-papel--<?= htmlspecialchars($p['papel']) ?>"><?= htmlspecialchars($p['papel']) ?></span>
                                    </div>
                                    <?php if ($p['papel'] !== 'facilitador'): ?>
                                        <form method="post" action="remover-participante.php" class="participante-remove">
                                            <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>" />
                                            <input type="hidden" name="vinculo_id" value="<?= (int) $p['vinculo_id'] ?>" />
                                            <input type="hidden" name="mesa_id" value="<?= (int) $mesaSelecionada['id'] ?>" />
                                            <button type="submit" class="painel-mini-btn painel-mini-btn--danger" title="Remover da mesa">Remover</button>
                                        </form>
                                    <?php endif; ?>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>

                    <h3>Vincular jogadores</h3>
                    <?php
                        $vinculaveis = array_filter($participantesDisp, fn($p) => !$p['is_vinculado']);
                    ?>
                    <?php if (empty($participantesDisp)): ?>
                        <p class="painel-empty">Ainda não há contas com papel "participante". Convide os jogadores a se cadastrarem.</p>
                    <?php elseif (empty($vinculaveis)): ?>
                        <p class="painel-empty">Todos os participantes cadastrados já estão nesta mesa.</p>
                    <?php else: ?>
                        <form method="post" action="adicionar-participante.php" class="participantes-vincular-form">
                            <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>" />
                            <input type="hidden" name="mesa_id" value="<?= (int) $mesaSelecionada['id'] ?>" />
                            <ul class="participantes-grid">
                                <?php foreach ($vinculaveis as $p):
                                    $av = urlAvatarUsuario($p['foto_path'] ?? null);
                                ?>
                                    <li class="participante-card participante-card--selecionavel">
                                        <label class="participante-checkbox">
                                            <input type="checkbox" name="participantes[]" value="<?= (int) $p['id'] ?>" />
                                            <div class="participante-avatar<?= $av === '' ? ' is-empty' : '' ?>">
                                                <?php if ($av !== ''): ?>
                                                    <img src="<?= htmlspecialchars($av) ?>" alt="" loading="lazy"
                                                         onerror="this.remove();this.closest('.participante-avatar').classList.add('is-empty');this.closest('.participante-avatar').textContent='<?= htmlspecialchars(inicialAvatarUsuario($p['nome'])) ?>';" />
                                                <?php else: ?>
                                                    <?= htmlspecialchars(inicialAvatarUsuario($p['nome'])) ?>
                                                <?php endif; ?>
                                            </div>
                                            <div class="participante-info">
                                                <strong><?= htmlspecialchars($p['nome']) ?></strong>
                                                <span class="participante-email"><?= htmlspecialchars($p['email']) ?></span>
                                            </div>
                                        </label>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                            <div class="painel-form-actions">
                                <button type="submit" class="home-btn">Vincular selecionados</button>
                            </div>
                        </form>
                    <?php endif; ?>

                    <details class="participantes-vincular-email">
                        <summary>Adicionar por e-mail (caso o jogador ainda não esteja na lista)</summary>
                        <form method="post" action="adicionar-participante.php" class="painel-form-row">
                            <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>" />
                            <input type="hidden" name="mesa_id" value="<?= (int) $mesaSelecionada['id'] ?>" />
                            <input type="email" name="email" placeholder="email@exemplo.com" required />
                            <button type="submit" class="home-btn">Adicionar</button>
                        </form>
                    </details>

                    <?php if (!empty($participantes) && !empty($fichasDisponiveis)): ?>
                        <h3>Vincular ficha existente a um participante</h3>
                        <form method="post" action="vincular-ficha.php" class="painel-form-row">
                            <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>" />
                            <input type="hidden" name="mesa_id" value="<?= (int) $mesaSelecionada['id'] ?>" />
                            <select name="usuario_id" required>
                                <option value="">Participante…</option>
                                <?php foreach ($participantes as $p): if ($p['papel'] === 'facilitador') continue; ?>
                                    <option value="<?= (int) $p['id'] ?>"><?= htmlspecialchars($p['nome']) ?></option>
                                <?php endforeach; ?>
                            </select>
                            <select name="ficha_id" required>
                                <option value="">Ficha sem dono…</option>
                                <?php foreach ($fichasDisponiveis as $f): ?>
                                    <option value="<?= (int) $f['id'] ?>">
                                        <?= htmlspecialchars($f['personagem'] ?: 'Sem nome') ?>
                                        <?php if (!empty($f['classe'])): ?> · <?= htmlspecialchars($f['classe']) ?> <?= (int) ($f['nivel'] ?? 0) ?><?php endif; ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <button type="submit" class="home-btn">Vincular</button>
                        </form>
                    <?php endif; ?>
                </article>
            <?php endif; ?>
        </section>

        <div class="home-list-footer auth-footer">
            <a class="home-btn home-btn-ghost" href="index.php">Voltar ao menu</a>
        </div>
    </main>
</body>
</html>
