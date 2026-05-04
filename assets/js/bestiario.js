(function () {
    'use strict';

    const STORAGE_KEY = 'pindorama.bestiario.criaturas';
    const TOKEN_KEY = 'pindorama.campoBatalha.tokenPendente';

    const base = window.BESTIARIO_BASE || { criaturas: [] };
    let criaturas = carregarCriaturas();

    const els = {
        lista: document.getElementById('bestiarioLista'),
        contador: document.getElementById('bestiarioContador'),
        busca: document.getElementById('bestiarioBusca'),
        nd: document.getElementById('bestiarioFiltroNd'),
        tipo: document.getElementById('bestiarioFiltroTipo'),
        tamanho: document.getElementById('bestiarioFiltroTamanho'),
        bioma: document.getElementById('bestiarioFiltroBioma'),
        papel: document.getElementById('bestiarioFiltroPapel'),
        limpar: document.getElementById('bestiarioLimparFiltros'),
        modal: document.getElementById('bestiarioModal'),
        modalConteudo: document.getElementById('bestiarioModalConteudo'),
        fecharModal: document.getElementById('bestiarioFecharModal'),
        formPanel: document.getElementById('bestiarioFormPanel'),
        formTitulo: document.getElementById('bestiarioFormTitulo'),
        form: document.getElementById('bestiarioForm'),
        cancelar: document.getElementById('bestiarioCancelarEdicao')
    };

    function carregarCriaturas() {
        try {
            const salvas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const porId = new Map((base.criaturas || []).map((criatura) => [criatura.id, criatura]));
            salvas.forEach((criatura) => porId.set(criatura.id, criatura));
            return Array.from(porId.values());
        } catch (_) {
            return base.criaturas || [];
        }
    }

    function salvarCriaturas() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(criaturas));
    }

    function normalizar(texto) {
        return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function escapeHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function linhas(valor) {
        return String(valor || '').split('\n').map((linha) => linha.trim()).filter(Boolean);
    }

    function arrayParaTexto(valor) {
        return Array.isArray(valor) ? valor.join('\n') : String(valor || '');
    }

    function textoBloco(valor) {
        const texto = String(valor || '').trim();
        if (!texto) return '<p>Sem registro.</p>';
        return texto.split(/\n{2,}/).map((paragrafo) => `<p>${escapeHtml(paragrafo).replace(/\n/g, '<br>')}</p>`).join('');
    }

    function listaBloco(valor) {
        const itens = Array.isArray(valor) ? valor : linhas(valor);
        if (!itens.length) return '<p>Sem registro.</p>';
        return `<ul>${itens.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    }

    function criaturaFiltrada(criatura) {
        const termo = normalizar(els.busca.value);
        const nomeOk = !termo || normalizar(`${criatura.nome} ${criatura.nomeAlternativo} ${criatura.fraseImpacto}`).includes(termo);
        const ndOk = !els.nd.value || String(criatura.nd) === els.nd.value;
        const tipoOk = !els.tipo.value || criatura.tipo === els.tipo.value;
        const tamanhoOk = !els.tamanho.value || criatura.tamanho === els.tamanho.value;
        const biomaOk = !els.bioma.value || criatura.bioma === els.bioma.value;
        const papelOk = !els.papel.value || normalizar(criatura.papelTatico).includes(normalizar(els.papel.value));
        return nomeOk && ndOk && tipoOk && tamanhoOk && biomaOk && papelOk;
    }

    function renderizar() {
        const visiveis = criaturas.filter(criaturaFiltrada);
        els.contador.textContent = `${visiveis.length} ${visiveis.length === 1 ? 'criatura' : 'criaturas'}`;
        els.lista.innerHTML = visiveis.length ? visiveis.map(cardCriatura).join('') : '<div class="bestiario-vazio">Nenhuma criatura encontrada.</div>';
    }

    function cardCriatura(criatura) {
        const imagem = criatura.imagem
            ? `<img src="${escapeHtml(criatura.imagem)}" alt="${escapeHtml(criatura.nome)}" onerror="this.remove(); this.parentElement.textContent='Imagem pendente';">`
            : 'Imagem pendente';

        return `
            <article class="bestiario-card" data-criatura-id="${escapeHtml(criatura.id)}">
                <div class="bestiario-card-media">${imagem}</div>
                <div>
                    <h3>${escapeHtml(criatura.nome)}</h3>
                    ${criatura.nomeAlternativo ? `<small>${escapeHtml(criatura.nomeAlternativo)}</small>` : ''}
                </div>
                <p class="bestiario-impacto">${escapeHtml(criatura.fraseImpacto || '')}</p>
                <div class="bestiario-meta">
                    <span>ND ${escapeHtml(criatura.nd)}</span>
                    <span>${escapeHtml(criatura.tipo)}</span>
                    <span>${escapeHtml(criatura.tamanho)}</span>
                    <span>${escapeHtml(criatura.bioma)}</span>
                    <span>${escapeHtml(criatura.papelTatico)}</span>
                </div>
                <div class="bestiario-combate">
                    <span>PV ${escapeHtml(criatura.pvMax)}</span>
                    <span>Defesa ${escapeHtml(criatura.defesa)}</span>
                </div>
                <div class="bestiario-card-actions">
                    <button type="button" data-action="ver">Ver ficha</button>
                    <button type="button" data-action="editar">Editar</button>
                    <button type="button" data-action="token">Preparar token</button>
                </div>
            </article>
        `;
    }

    function abrirFicha(id) {
        const criatura = criaturas.find((item) => item.id === id);
        if (!criatura) return;
        els.modalConteudo.innerHTML = fichaHtml(criatura);
        els.modal.hidden = false;
    }

    function fichaHtml(criatura) {
        return `
            <header class="bestiario-ficha-header">
                <h2 id="bestiarioModalTitulo">${escapeHtml(criatura.nome)}</h2>
                ${criatura.nomeAlternativo ? `<p><strong>Nome alternativo:</strong> ${escapeHtml(criatura.nomeAlternativo)}</p>` : ''}
                <p><em>${escapeHtml(criatura.fraseImpacto || '')}</em></p>
                <div class="bestiario-meta">
                    <span>ND ${escapeHtml(criatura.nd)}</span>
                    <span>${escapeHtml(criatura.tipo)}</span>
                    <span>${escapeHtml(criatura.tamanho)}</span>
                    <span>${escapeHtml(criatura.bioma)}</span>
                    <span>${escapeHtml(criatura.papelTatico)}</span>
                </div>
            </header>
            <div class="bestiario-ficha-grid">
                ${bloco('Identidade da criatura', `<p><strong>Habitat:</strong> ${escapeHtml(criatura.habitat || 'Sem registro.')}</p>`)}
                ${bloco('Conceito', textoBloco(criatura.conceito))}
                ${bloco('Descrição', textoBloco(criatura.descricao))}
                ${bloco('Origem e inspiração', textoBloco(criatura.origemInspiracao))}
                ${bloco('Bioma e habitat', textoBloco(`Bioma: ${criatura.bioma || ''}\nHabitat: ${criatura.habitat || ''}`))}
                ${bloco('Comportamento', textoBloco(criatura.comportamento))}
                ${bloco('Sinais de presença', listaBloco(criatura.sinaisPresenca))}
                ${fichaAmeaca(criatura)}
                ${bloco('Táticas de combate', textoBloco(criatura.taticasCombate))}
                ${bloco('Uso em campanha', textoBloco(criatura.usoCampanha))}
                ${bloco('Ganchos de aventura', listaBloco(criatura.ganchosAventura))}
                ${bloco('Tesouro, recursos ou recompensas', textoBloco(criatura.tesouroRecompensas))}
                ${bloco('Variações de ND', textoBloco(criatura.variacoesND))}
                ${bloco('Comparação de equilíbrio', textoBloco(criatura.comparacaoEquilibrio))}
                ${bloco('Registro de consistência', textoBloco(criatura.registroConsistencia))}
                ${bloco('Notas de design', textoBloco(criatura.notasDesign))}
            </div>
            <div class="bestiario-modal-actions">
                <button type="button" data-modal-action="token" data-id="${escapeHtml(criatura.id)}">Preparar token</button>
                <button type="button" data-modal-action="editar" data-id="${escapeHtml(criatura.id)}">Editar</button>
            </div>
        `;
    }

    function bloco(titulo, conteudo) {
        return `<section class="bestiario-ficha-bloco"><h3>${escapeHtml(titulo)}</h3>${conteudo}</section>`;
    }

    function fichaAmeaca(criatura) {
        return `
            <section class="bestiario-ficha-bloco bestiario-ameaca">
                <h3>Ficha de ameaça</h3>
                <div class="bestiario-ameaca-grid">
                    <span>Defesa ${escapeHtml(criatura.defesa)}</span>
                    <span>PV ${escapeHtml(criatura.pvMax)}</span>
                    <span>Desloc. ${escapeHtml(criatura.deslocamento)}</span>
                    <span>Inic. ${escapeHtml(criatura.iniciativa)}</span>
                    <span>Percep. ${escapeHtml(criatura.percepcao)}</span>
                    <span>Fort ${escapeHtml(criatura.fortitude)}</span>
                    <span>Ref ${escapeHtml(criatura.reflexos)}</span>
                    <span>Von ${escapeHtml(criatura.vontade)}</span>
                </div>
                <p><strong>Sentidos:</strong> ${escapeHtml(criatura.sentidos || 'Sem registro.')}</p>
                <p><strong>Ataques:</strong></p>${listaBloco(criatura.ataques)}
                <p><strong>Atributos:</strong> For ${escapeHtml(criatura.atributos?.forca)}, Des ${escapeHtml(criatura.atributos?.destreza)}, Con ${escapeHtml(criatura.atributos?.constituicao)}, Int ${escapeHtml(criatura.atributos?.inteligencia)}, Sab ${escapeHtml(criatura.atributos?.sabedoria)}, Car ${escapeHtml(criatura.atributos?.carisma)}</p>
                <p><strong>Perícias:</strong> ${escapeHtml((criatura.pericias || []).join(', ') || 'Sem registro.')}</p>
                <p><strong>Habilidades:</strong></p>${listaBloco(criatura.habilidades)}
                <p><strong>Vulnerabilidades:</strong> ${escapeHtml((criatura.vulnerabilidades || []).join(', ') || 'Nenhuma.')}</p>
                <p><strong>Resistências:</strong> ${escapeHtml((criatura.resistencias || []).join(', ') || 'Nenhuma.')}</p>
                <p><strong>Imunidades:</strong> ${escapeHtml((criatura.imunidades || []).join(', ') || 'Nenhuma.')}</p>
                ${criatura.fichaCompleta ? `<pre>${escapeHtml(criatura.fichaCompleta)}</pre>` : ''}
            </section>
        `;
    }

    function fecharModal() {
        els.modal.hidden = true;
        els.modalConteudo.innerHTML = '';
    }

    function gerarId(nome) {
        return normalizar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `criatura-${Date.now()}`;
    }

    function lerAtributos(texto) {
        const atributos = { forca: '', destreza: '', constituicao: '', inteligencia: '', sabedoria: '', carisma: '' };
        linhas(texto).forEach((linha) => {
            const [chave, ...resto] = linha.split(':');
            if (!chave || !resto.length) return;
            const nome = normalizar(chave).replace(/[^a-z]/g, '');
            const valor = resto.join(':').trim();
            if (nome in atributos) atributos[nome] = valor;
        });
        return atributos;
    }

    function escreverAtributos(atributos) {
        const atual = atributos || {};
        return ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma']
            .map((chave) => `${chave}: ${atual[chave] || ''}`)
            .join('\n');
    }

    function lerForm() {
        const nome = campo('criaturaNome').value.trim();
        const id = campo('criaturaId').value || gerarId(nome);
        const criatura = {
            id,
            nome,
            nomeAlternativo: campo('criaturaNomeAlternativo').value.trim(),
            fraseImpacto: campo('criaturaFraseImpacto').value.trim(),
            nd: Number(campo('criaturaNd').value || 0),
            tipo: campo('criaturaTipo').value,
            tamanho: campo('criaturaTamanho').value,
            bioma: campo('criaturaBioma').value,
            habitat: campo('criaturaHabitat').value.trim(),
            papelTatico: campo('criaturaPapelTatico').value,
            imagem: campo('criaturaImagem').value.trim(),
            pvMax: Number(campo('criaturaPvMax').value || 0),
            defesa: Number(campo('criaturaDefesa').value || 0),
            deslocamento: campo('criaturaDeslocamento').value.trim(),
            iniciativa: campo('criaturaIniciativa').value.trim(),
            percepcao: campo('criaturaPercepcao').value.trim(),
            sentidos: campo('criaturaSentidos').value.trim(),
            fortitude: campo('criaturaFortitude').value.trim(),
            reflexos: campo('criaturaReflexos').value.trim(),
            vontade: campo('criaturaVontade').value.trim(),
            ataques: linhas(campo('criaturaAtaques').value),
            habilidades: linhas(campo('criaturaHabilidades').value),
            atributos: lerAtributos(campo('criaturaAtributos').value),
            pericias: linhas(campo('criaturaPericias').value),
            vulnerabilidades: linhas(campo('criaturaVulnerabilidades').value),
            resistencias: linhas(campo('criaturaResistencias').value),
            imunidades: linhas(campo('criaturaImunidades').value),
            conceito: campo('criaturaConceito').value.trim(),
            descricao: campo('criaturaDescricao').value.trim(),
            origemInspiracao: campo('criaturaOrigemInspiracao').value.trim(),
            comportamento: campo('criaturaComportamento').value.trim(),
            sinaisPresenca: linhas(campo('criaturaSinaisPresenca').value),
            fichaCompleta: campo('criaturaFichaCompleta').value.trim(),
            taticasCombate: campo('criaturaTaticasCombate').value.trim(),
            usoCampanha: campo('criaturaUsoCampanha').value.trim(),
            ganchosAventura: linhas(campo('criaturaGanchosAventura').value),
            tesouroRecompensas: campo('criaturaTesouroRecompensas').value.trim() || campo('criaturaTesouroMecanico').value.trim(),
            variacoesND: campo('criaturaVariacoesNd').value.trim(),
            comparacaoEquilibrio: campo('criaturaComparacaoEquilibrio').value.trim(),
            registroConsistencia: campo('criaturaRegistroConsistencia').value.trim(),
            notasDesign: campo('criaturaNotasDesign').value.trim()
        };
        criatura.token = montarToken(criatura);
        return criatura;
    }

    function campo(id) {
        return document.getElementById(id);
    }

    function preencherForm(criatura) {
        campo('criaturaId').value = criatura.id || '';
        campo('criaturaNome').value = criatura.nome || '';
        campo('criaturaNomeAlternativo').value = criatura.nomeAlternativo || '';
        campo('criaturaFraseImpacto').value = criatura.fraseImpacto || '';
        campo('criaturaNd').value = criatura.nd ?? '';
        campo('criaturaTipo').value = criatura.tipo || '';
        campo('criaturaTamanho').value = criatura.tamanho || '';
        campo('criaturaBioma').value = criatura.bioma || '';
        campo('criaturaHabitat').value = criatura.habitat || '';
        campo('criaturaPapelTatico').value = criatura.papelTatico || '';
        campo('criaturaImagem').value = criatura.imagem || '';
        campo('criaturaConceito').value = criatura.conceito || '';
        campo('criaturaDescricao').value = criatura.descricao || '';
        campo('criaturaOrigemInspiracao').value = criatura.origemInspiracao || '';
        campo('criaturaComportamento').value = criatura.comportamento || '';
        campo('criaturaSinaisPresenca').value = arrayParaTexto(criatura.sinaisPresenca);
        campo('criaturaTaticasCombate').value = criatura.taticasCombate || '';
        campo('criaturaUsoCampanha').value = criatura.usoCampanha || '';
        campo('criaturaGanchosAventura').value = arrayParaTexto(criatura.ganchosAventura);
        campo('criaturaTesouroRecompensas').value = criatura.tesouroRecompensas || '';
        campo('criaturaVariacoesNd').value = criatura.variacoesND || '';
        campo('criaturaComparacaoEquilibrio').value = criatura.comparacaoEquilibrio || '';
        campo('criaturaRegistroConsistencia').value = criatura.registroConsistencia || '';
        campo('criaturaNotasDesign').value = criatura.notasDesign || '';
        campo('criaturaIniciativa').value = criatura.iniciativa || '';
        campo('criaturaSentidos').value = criatura.sentidos || '';
        campo('criaturaPercepcao').value = criatura.percepcao || '';
        campo('criaturaDefesa').value = criatura.defesa ?? '';
        campo('criaturaFortitude').value = criatura.fortitude || '';
        campo('criaturaReflexos').value = criatura.reflexos || '';
        campo('criaturaVontade').value = criatura.vontade || '';
        campo('criaturaPvMax').value = criatura.pvMax ?? '';
        campo('criaturaDeslocamento').value = criatura.deslocamento || '';
        campo('criaturaAtaques').value = arrayParaTexto(criatura.ataques);
        campo('criaturaAtributos').value = escreverAtributos(criatura.atributos);
        campo('criaturaPericias').value = arrayParaTexto(criatura.pericias);
        campo('criaturaHabilidades').value = arrayParaTexto(criatura.habilidades);
        campo('criaturaVulnerabilidades').value = arrayParaTexto(criatura.vulnerabilidades);
        campo('criaturaResistencias').value = arrayParaTexto(criatura.resistencias);
        campo('criaturaImunidades').value = arrayParaTexto(criatura.imunidades);
        campo('criaturaTesouroMecanico').value = '';
        campo('criaturaFichaCompleta').value = criatura.fichaCompleta || '';
        els.formTitulo.textContent = criatura.id ? 'Editar criatura' : 'Adicionar criatura';
        els.formPanel.open = true;
        els.formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function limparForm() {
        els.form.reset();
        campo('criaturaId').value = '';
        els.formTitulo.textContent = 'Adicionar criatura';
    }

    function montarToken(criatura) {
        return {
            id: criatura.id,
            nome: criatura.nome,
            nd: criatura.nd,
            tipo: criatura.tipo,
            tamanho: criatura.tamanho,
            imagem: criatura.imagem,
            pvMax: criatura.pvMax,
            defesa: criatura.defesa,
            deslocamento: criatura.deslocamento,
            ataquesPrincipais: (criatura.ataques || []).slice(0, 3),
            habilidadesPrincipais: (criatura.habilidades || []).slice(0, 5).map((habilidade) => habilidade.split('.')[0]),
            bioma: criatura.bioma,
            papelTatico: criatura.papelTatico
        };
    }

    window.prepararTokenCriatura = function prepararTokenCriatura(criaturaId) {
        const criatura = criaturas.find((item) => item.id === criaturaId);
        if (!criatura) return null;
        const token = criatura.token || montarToken(criatura);
        localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        // Integração futura: aqui o token será enviado diretamente para a página Campo de Batalha.
        alert(`Token preparado: ${token.nome}. Abra o Campo de Batalha para posicioná-lo.`);
        return token;
    };

    function editarCriatura(id) {
        const criatura = criaturas.find((item) => item.id === id);
        if (!criatura) return;
        fecharModal();
        preencherForm(criatura);
    }

    els.lista.addEventListener('click', (event) => {
        const botao = event.target.closest('button[data-action]');
        if (!botao) return;
        const card = botao.closest('[data-criatura-id]');
        const id = card?.dataset.criaturaId;
        if (botao.dataset.action === 'ver') abrirFicha(id);
        if (botao.dataset.action === 'editar') editarCriatura(id);
        if (botao.dataset.action === 'token') window.prepararTokenCriatura(id);
    });

    els.modalConteudo.addEventListener('click', (event) => {
        const botao = event.target.closest('button[data-modal-action]');
        if (!botao) return;
        if (botao.dataset.modalAction === 'token') window.prepararTokenCriatura(botao.dataset.id);
        if (botao.dataset.modalAction === 'editar') editarCriatura(botao.dataset.id);
    });

    els.fecharModal.addEventListener('click', fecharModal);
    els.modal.addEventListener('click', (event) => {
        if (event.target === els.modal) fecharModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !els.modal.hidden) fecharModal();
    });

    [els.busca, els.nd, els.tipo, els.tamanho, els.bioma, els.papel].forEach((el) => {
        el.addEventListener('input', renderizar);
        el.addEventListener('change', renderizar);
    });

    els.limpar.addEventListener('click', () => {
        [els.busca, els.nd, els.tipo, els.tamanho, els.bioma, els.papel].forEach((el) => { el.value = ''; });
        renderizar();
    });

    els.form.addEventListener('submit', (event) => {
        event.preventDefault();
        const criatura = lerForm();
        if (!criatura.nome) return;
        const indice = criaturas.findIndex((item) => item.id === criatura.id);
        if (indice >= 0) criaturas[indice] = criatura;
        else criaturas.push(criatura);
        salvarCriaturas();
        limparForm();
        renderizar();
    });

    els.cancelar.addEventListener('click', limparForm);

    renderizar();
})();
