<?php
$dadosAncestralidades = json_decode(file_get_contents(__DIR__ . '/data/ancestralidades.json'), true);
$introducao = $dadosAncestralidades['introducao'] ?? [];
$ancestralidades = $dadosAncestralidades['ancestralidades'] ?? [];

/**
 * Procura a imagem da ancestralidade no diretório /assets/img/ancestralidades/.
 * Aceita .webp, .png ou .jpg. Retorna caminho relativo ou null se não houver.
 */
function imagemAncestralidade(string $id): ?string {
    $base = __DIR__ . '/assets/img/ancestralidades/' . $id;
    foreach (['webp', 'png', 'jpg', 'jpeg'] as $ext) {
        if (file_exists("$base.$ext")) {
            return "assets/img/ancestralidades/$id.$ext";
        }
    }
    return null;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ancestralidades - Pindorama RPG</title>

    <link rel="stylesheet" href="assets/css/ficha.css" />
    <link rel="stylesheet" href="assets/css/classes.css?v=20260503i" />
    <link rel="stylesheet" href="assets/css/ancestralidades.css?v=20260501a" />
    <link rel="stylesheet" href="assets/css/ancestralidades-menu-fix.css?v=20260503a" />
</head>

<body>
    <main class="page-wrapper classes-page ancestralidades-page">

        <header class="top-actions classes-topbar">
            <div>
                <h1>Ancestralidades</h1>
                <p>Povos, espíritos e linhagens de Pindorama, com seus traços ancestrais completos.</p>
            </div>

            <div class="actions">
                <a class="system-link-btn" href="index.php">Menu</a>
                <a class="system-link-btn" href="ficha.php">Ficha</a>
            </div>
        </header>

        <section class="classes-layout">

            <aside class="classes-sidebar panel" id="classesSidebar">
                <div class="sidebar-mobile-head">
                    <div class="panel-title">Navegação</div>
                    <button type="button" class="sidebar-close-btn" id="sidebarCloseBtn" aria-label="Fechar menu de navegação">×</button>
                </div>

                <div class="sidebar-content" id="mobileSidebarContent">
                    <input
                        type="search"
                        id="classesSearch"
                        placeholder="Buscar ancestralidade..."
                        class="classes-search"
                    />

                    <nav class="classes-toc" id="classesToc">
                        <a class="toc-link toc-level-2" href="#introducao">Introdução</a>
                        <a class="toc-link toc-level-2" href="#escolhendo">Escolhendo sua Ancestralidade</a>
                        <?php foreach ($ancestralidades as $ancestralidade): ?>
                            <a class="toc-link toc-level-2" href="#<?= htmlspecialchars($ancestralidade['id']) ?>">
                                <?= htmlspecialchars($ancestralidade['nome']) ?>
                            </a>
                        <?php endforeach; ?>
                    </nav>
                </div>
            </aside>

            <article class="sheet classes-content" id="classesContent">
                <section id="introducao" class="content-section">
                    <h2>Ancestralidades em Pindorama</h2>
                    <?php foreach (array_slice($introducao, 0, 5) as $paragrafo): ?>
                        <p><?= htmlspecialchars($paragrafo) ?></p>
                    <?php endforeach; ?>
                </section>

                <section id="escolhendo" class="content-section">
                    <h2>Escolhendo sua Ancestralidade</h2>
                    <?php foreach (array_slice($introducao, 6) as $paragrafo): ?>
                        <p><?= htmlspecialchars($paragrafo) ?></p>
                    <?php endforeach; ?>
                </section>

                <?php foreach ($ancestralidades as $ancestralidade): ?>
                    <?php $imgSrc = imagemAncestralidade($ancestralidade['id']); ?>
                    <section id="<?= htmlspecialchars($ancestralidade['id']) ?>" class="content-section ancestralidade-section<?= $imgSrc ? ' tem-imagem' : '' ?>">
                        <h2><?= htmlspecialchars($ancestralidade['nome']) ?></h2>

                        <div class="ancestralidade-cabecalho">
                            <?php if ($imgSrc): ?>
                                <figure class="ancestralidade-figura">
                                    <img src="<?= htmlspecialchars($imgSrc) ?>" alt="Ilustração de <?= htmlspecialchars($ancestralidade['nome']) ?>" loading="lazy" />
                                </figure>
                            <?php endif; ?>

                            <div class="ancestralidade-texto">
                                <?php foreach ($ancestralidade['descricao'] as $paragrafo): ?>
                                    <p><?= htmlspecialchars($paragrafo) ?></p>
                                <?php endforeach; ?>
                            </div>
                        </div>

                        <h3>Traços Ancestrais</h3>
                        <div class="ancestralidade-tracos-lista">
                            <?php foreach ($ancestralidade['tracos'] as $traco): ?>
                                <article class="class-power-block ancestralidade-traco-card">
                                    <h4><?= htmlspecialchars($traco['nome']) ?></h4>
                                    <p><?= htmlspecialchars($traco['descricao']) ?></p>
                                </article>
                            <?php endforeach; ?>
                        </div>
                    </section>
                <?php endforeach; ?>
            </article>
        </section>

    </main>

    <button
        type="button"
        class="mobile-menu-toggle"
        id="mobileMenuToggle"
        aria-label="Abrir menu de navegação"
        aria-controls="classesSidebar"
        aria-expanded="false"
    >
        <span></span>
        <span></span>
        <span></span>
    </button>

    <script>
        (function () {
            const body = document.body;
            const sidebar = document.getElementById("classesSidebar");
            const menuButton = document.getElementById("mobileMenuToggle");
            const closeButton = document.getElementById("sidebarCloseBtn");
            const searchInput = document.getElementById("classesSearch");
            const links = Array.from(document.querySelectorAll("#classesToc .toc-link"));
            const sections = Array.from(document.querySelectorAll(".classes-content .content-section"));

            if (!sidebar || !menuButton) return;

            function openSidebar() {
                sidebar.classList.add("is-open");
                menuButton.classList.add("is-open");
                menuButton.setAttribute("aria-expanded", "true");
                body.classList.add("ancestralidades-menu-open");
            }

            function closeSidebar() {
                sidebar.classList.remove("is-open");
                menuButton.classList.remove("is-open");
                menuButton.setAttribute("aria-expanded", "false");
                body.classList.remove("ancestralidades-menu-open");
            }

            function toggleSidebar() {
                sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
            }

            menuButton.addEventListener("click", toggleSidebar);
            closeButton?.addEventListener("click", closeSidebar);

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") closeSidebar();
            });

            links.forEach((link) => {
                link.addEventListener("click", () => {
                    if (window.matchMedia("(max-width: 980px)").matches) {
                        closeSidebar();
                    }
                });
            });

            if (searchInput) {
                searchInput.addEventListener("input", () => {
                    const term = searchInput.value.trim().toLowerCase();

                    links.forEach((link) => {
                        const match = link.textContent.toLowerCase().includes(term);
                        link.hidden = Boolean(term) && !match;
                    });
                });
            }

            if (sections.length && links.length && "IntersectionObserver" in window) {
                const linkById = new Map(
                    links.map((link) => [decodeURIComponent(link.getAttribute("href").replace("#", "")), link])
                );

                const observer = new IntersectionObserver((entries) => {
                    const visible = entries
                        .filter((entry) => entry.isIntersecting)
                        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

                    if (!visible) return;

                    links.forEach((link) => link.classList.remove("is-active"));
                    linkById.get(visible.target.id)?.classList.add("is-active");
                }, {
                    root: null,
                    rootMargin: "-20% 0px -65% 0px",
                    threshold: [0, 0.15, 0.4]
                });

                sections.forEach((section) => observer.observe(section));
            }
        })();
    </script>
</body>
</html>
