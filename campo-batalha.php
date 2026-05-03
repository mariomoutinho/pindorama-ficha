<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>Campo de Batalha — Pindorama RPG</title>

    <link rel="stylesheet" href="assets/css/ficha.css?v=20260503g" />
    <link rel="stylesheet" href="assets/css/transitions.css?v=20260503d" />
    <link rel="stylesheet" href="assets/css/campo-batalha.css?v=20260503a" />
</head>
<body class="cb-body">
    <script src="assets/js/transitions.js?v=20260503d"></script>

    <main class="cb-page">

        <header class="cb-topbar">
            <div class="cb-title">
                <a href="index.php" class="cb-brand-link" title="Voltar ao menu" aria-label="Voltar ao menu">
                    <img src="assets/img/logo-pindorama-rpg.png" alt="Pindorama RPG" />
                </a>
                <div>
                    <h1>Campo de Batalha</h1>
                    <p>Posicione tokens no grid, arraste, redimensione e gire.</p>
                </div>
            </div>

            <nav class="cb-nav">
                <a class="cb-link-btn" href="index.php">Menu</a>
                <a class="cb-link-btn" href="fichas.php">Fichas</a>
            </nav>
        </header>

        <section class="cb-toolbar">
            <div class="cb-tool-group">
                <button type="button" id="cbAddToken" class="cb-primary">+ Personagem</button>
                <button type="button" id="cbRemoveToken" disabled>Remover seleção</button>
                <button type="button" id="cbRotateToken" disabled>Girar 90°</button>
                <button type="button" id="cbClearAll">Limpar campo</button>
            </div>

            <div class="cb-tool-group">
                <button type="button" id="cbZoomOut" title="Reduzir">−</button>
                <span id="cbZoomDisplay" class="cb-zoom-display">100%</span>
                <button type="button" id="cbZoomIn" title="Ampliar">+</button>
                <button type="button" id="cbZoomReset" title="Resetar zoom e posição">Reset</button>
            </div>

            <div class="cb-tool-group">
                <label class="cb-toggle">
                    <input type="checkbox" id="cbToggleNumbers" />
                    <span>Numerar células</span>
                </label>
            </div>

            <div class="cb-tool-group cb-grid-config">
                <label>
                    Colunas
                    <input type="number" id="cbCols" min="5" max="60" value="20" />
                </label>
                <label>
                    Linhas
                    <input type="number" id="cbRows" min="5" max="60" value="15" />
                </label>
                <button type="button" id="cbApplySize">Aplicar</button>
            </div>
        </section>

        <section class="cb-stage" id="cbStage">
            <div class="cb-viewport" id="cbViewport">
                <div class="cb-board" id="cbBoard"></div>
                <div class="cb-tokens-layer" id="cbTokensLayer"></div>
            </div>
            <div class="cb-help" id="cbHelp">
                <strong>Controles:</strong>
                <span>Arraste o tabuleiro com 1 dedo / botão direito do mouse</span>
                <span>Pinch ou roda do mouse para zoom</span>
                <span>Toque/clique no token para selecionar</span>
            </div>
        </section>

        <div class="cb-modal-backdrop" id="cbModal" hidden>
            <div class="cb-modal" role="dialog" aria-modal="true" aria-labelledby="cbModalTitle">
                <header class="cb-modal-header">
                    <h2 id="cbModalTitle">Adicionar personagem</h2>
                    <button type="button" id="cbModalClose" aria-label="Fechar">×</button>
                </header>
                <div class="cb-modal-search">
                    <input type="search" id="cbModalSearch" placeholder="Buscar por nome ou jogador..." />
                </div>
                <ul class="cb-ficha-list" id="cbFichaList">
                    <li class="cb-ficha-empty">Carregando fichas...</li>
                </ul>
                <footer class="cb-modal-footer">
                    <button type="button" id="cbAddGenericToken">+ Token genérico</button>
                </footer>
            </div>
        </div>

        <div class="cb-tooltip" id="cbTooltip" hidden></div>

    </main>

    <script src="assets/js/campo-batalha.js?v=20260503a"></script>
</body>
</html>
