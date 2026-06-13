let graficoEvolucao = null;
let graficoDistribuicao = null;
let graficoComparativo = null;

// Taxas de referência anuais (valores aproximados para 2024)
const TAXA_CDI_ANUAL = 0.1065; // 10.65% ao ano
const TAXA_SELIC_ANUAL = 0.1075; // 10.75% ao ano

// Funções auxiliares para cálculo de benchmarks
function calcularFatorAcumulado(dataInicio, dataFim, taxaAnual) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diasUteis = contarDiasUteis(inicio, fim);
    const diasUteisAno = 252; // aproximado
    const fatorDiario = Math.pow(1 + taxaAnual, 1 / diasUteisAno);
    return Math.pow(fatorDiario, diasUteis);
}

function contarDiasUteis(inicio, fim) {
    let count = 0;
    const atual = new Date(inicio);
    while (atual <= fim) {
        const diaSemana = atual.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) { // não é sábado ou domingo
            count++;
        }
        atual.setDate(atual.getDate() + 1);
    }
    return count;
}

function calcularBenchmarks(investimentos) {
    if (!investimentos || investimentos.length === 0) {
        return { cdi: 0, selic: 0, datas: [], valoresCDI: [], valoresSELIC: [] };
    }

    const dataHoje = new Date();
    const investimentosOrdenados = [...investimentos].sort((a, b) => new Date(a.data) - new Date(b.data));
    
    let totalInvestido = 0;
    let valorCDI = 0;
    let valorSELIC = 0;
    
    const datasEvolucao = [];
    const evolucaoCDI = [];
    const evolucaoSELIC = [];
    
    // Agrupar investimentos por data
    const investimentosPorData = {};
    investimentosOrdenados.forEach(inv => {
        if (!investimentosPorData[inv.data]) {
            investimentosPorData[inv.data] = 0;
        }
        investimentosPorData[inv.data] += inv.valor_total;
    });
    
    const datas = Object.keys(investimentosPorData).sort();
    
    let acumuladoCarteira = 0;
    let acumuladoCDI = 0;
    let acumuladoSELIC = 0;
    
    datas.forEach((dataStr, index) => {
        const valorInvestido = investimentosPorData[dataStr];
        acumuladoCarteira += valorInvestido;
        
        // Calcular rendimento CDI e SELIC desde a data do investimento até hoje
        const dataInvestimento = new Date(dataStr);
        const fatorCDI = calcularFatorAcumulado(dataInvestimento, dataHoje, TAXA_CDI_ANUAL);
        const fatorSELIC = calcularFatorAcumulado(dataInvestimento, dataHoje, TAXA_SELIC_ANUAL);
        
        acumuladoCDI += valorInvestido * fatorCDI;
        acumuladoSELIC += valorInvestido * fatorSELIC;
        
        // Adicionar ponto para o gráfico (apenas datas significativas para não sobrecarregar)
        if (index % Math.ceil(datas.length / 50) === 0 || index === datas.length - 1) {
            datasEvolucao.push(dataStr);
            evolucaoCDI.push(acumuladoCDI);
            evolucaoSELIC.push(acumuladoSELIC);
        }
    });
    
    return {
        cdi: acumuladoCDI,
        selic: acumuladoSELIC,
        carteira: acumuladoCarteira,
        datas: datasEvolucao,
        valoresCDI: evolucaoCDI,
        valoresSELIC: evolucaoSELIC
    };
}

// Funções para upload CSV
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        mostrarErro('Por favor, selecione um arquivo CSV.');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Mostrar loading
    document.getElementById('loading').classList.remove('d-none');
    document.getElementById('error').classList.add('d-none');
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            document.getElementById('loading').classList.add('d-none');
            document.getElementById('resumoSection').classList.remove('d-none');
            atualizarDashboard(data);
        } else {
            mostrarErro(data.error || 'Erro ao processar arquivo.');
        }
    } catch (error) {
        mostrarErro('Erro de conexão: ' + error.message);
    }
}

function mostrarErro(mensagem) {
    document.getElementById('loading').classList.add('d-none');
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = mensagem;
    errorDiv.classList.remove('d-none');
}

// Funções para cadastro manual
async function adicionarInvestimento(event) {
    event.preventDefault();
    
    const data = document.getElementById('dataInvestimento').value;
    const tipoInvestimento = document.getElementById('tipoInvestimento').value;
    const ativo = document.getElementById('ativoInvestimento').value;
    const valorTotal = document.getElementById('valorInvestimento').value;
    
    // Esconder mensagens anteriores
    document.getElementById('errorManual').classList.add('d-none');
    document.getElementById('successManual').classList.add('d-none');
    document.getElementById('loadingManual').classList.remove('d-none');
    
    try {
        const response = await fetch('/adicionar_investimento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: data,
                tipo_investimento: tipoInvestimento,
                ativo: ativo,
                valor_total: valorTotal
            })
        });
        
        const result = await response.json();
        
        document.getElementById('loadingManual').classList.add('d-none');
        
        if (response.ok && result.sucesso) {
            // Mostrar sucesso
            const successDiv = document.getElementById('successManual');
            successDiv.textContent = result.mensagem;
            successDiv.classList.remove('d-none');
            
            // Limpar formulário
            document.getElementById('formInvestimento').reset();
            
            // Atualizar tabela
            carregarInvestimentosManuais();
            
            // Esconder mensagem de sucesso após 3 segundos
            setTimeout(() => {
                successDiv.classList.add('d-none');
            }, 3000);
        } else {
            mostrarErroManual(result.error || 'Erro ao adicionar investimento.');
        }
    } catch (error) {
        document.getElementById('loadingManual').classList.add('d-none');
        mostrarErroManual('Erro de conexão: ' + error.message);
    }
}

function mostrarErroManual(mensagem) {
    const errorDiv = document.getElementById('errorManual');
    errorDiv.textContent = mensagem;
    errorDiv.classList.remove('d-none');
}

async function carregarInvestimentosManuais() {
    try {
        const response = await fetch('/listar_investimentos');
        const data = await response.json();
        
        atualizarTabelaManuais(data.investimentos);
        document.getElementById('totalManuais').textContent = `${data.total} investimento(s)`;
    } catch (error) {
        console.error('Erro ao carregar investimentos:', error);
    }
}

function atualizarTabelaManuais(investimentos) {
    const tbody = document.getElementById('tabelaManuais');
    tbody.innerHTML = '';
    
    if (!investimentos || investimentos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">Nenhum investimento cadastrado</td>
            </tr>
        `;
        return;
    }
    
    investimentos.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatarData(item.data)}</td>
            <td>${item.ativo}</td>
            <td>${item.tipo_investimento}</td>
            <td>${formatarMoeda(item.valor_total)}</td>
            <td>
                <button onclick="removerInvestimento(${index})" class="btn btn-sm btn-danger">
                    🗑️ Remover
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function formatarData(dataStr) {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

async function removerInvestimento(index) {
    if (!confirm('Tem certeza que deseja remover este investimento?')) {
        return;
    }
    
    try {
        const response = await fetch(`/remover_investimento/${index}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok && result.sucesso) {
            carregarInvestimentosManuais();
        } else {
            alert(result.error || 'Erro ao remover investimento.');
        }
    } catch (error) {
        alert('Erro de conexão: ' + error.message);
    }
}

async function processarManuais() {
    // Esconder mensagens anteriores
    document.getElementById('errorManual').classList.add('d-none');
    document.getElementById('successManual').classList.add('d-none');
    document.getElementById('loadingManual').classList.remove('d-none');
    
    try {
        const response = await fetch('/processar_manuais', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        document.getElementById('loadingManual').classList.add('d-none');
        
        if (response.ok && data.sucesso) {
            document.getElementById('resumoSection').classList.remove('d-none');
            atualizarDashboard(data);
        } else {
            mostrarErroManual(data.error || 'Nenhum investimento cadastrado. Adicione investimentos primeiro.');
        }
    } catch (error) {
        document.getElementById('loadingManual').classList.add('d-none');
        mostrarErroManual('Erro de conexão: ' + error.message);
    }
}

async function limparInvestimentos() {
    if (!confirm('Tem certeza que deseja limpar todos os investimentos cadastrados?')) {
        return;
    }
    
    try {
        const response = await fetch('/limpar_investimentos', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok && result.sucesso) {
            carregarInvestimentosManuais();
            document.getElementById('resumoSection').classList.add('d-none');
            alert(result.mensagem);
        }
    } catch (error) {
        alert('Erro de conexão: ' + error.message);
    }
}

// Funções compartilhadas
function atualizarDashboard(data) {
    // Obter investimentos da tabela para cálculo de benchmarks
    const investimentos = data.tabela || [];
    
    // Calcular benchmarks
    const benchmarks = calcularBenchmarks(investimentos);
    
    // Atualizar cards de resumo
    document.getElementById('patrimonioTotal').textContent = 
        formatarMoeda(data.resumo.patrimonio_total);
    document.getElementById('numAtivos').textContent = data.resumo.num_ativos;
    document.getElementById('numInvestimentos').textContent = data.resumo.num_investimentos;
    document.getElementById('periodo').textContent = 
        `${formatarData(data.resumo.primeiro_investimento)} até ${formatarData(data.resumo.ultimo_investimento)}`;
    
    // Atualizar data atual no display
    const dataAtual = new Date();
    document.getElementById('dataAtualDisplay').textContent = 
        `Data atual: ${dataAtual.toLocaleDateString('pt-BR')}`;
    
    // Atualizar seção de comparativo com benchmarks
    document.getElementById('patrimonioAtual').textContent = 
        formatarMoeda(data.resumo.patrimonio_total);
    document.getElementById('valorCDI').textContent = formatarMoeda(benchmarks.cdi);
    document.getElementById('valorSELIC').textContent = formatarMoeda(benchmarks.selic);
    
    // Calcular rentabilidade da carteira
    const totalInvestido = investimentos.reduce((sum, inv) => sum + inv.valor_total, 0);
    const rentabilidade = ((data.resumo.patrimonio_total - totalInvestido) / totalInvestido * 100);
    document.getElementById('rentabilidadeCarteira').textContent = 
        `${rentabilidade >= 0 ? '+' : ''}${rentabilidade.toFixed(2)}%`;
    
    // Atualizar tabela de comparativos
    document.getElementById('cdiValor').textContent = formatarMoeda(benchmarks.cdi);
    document.getElementById('selicValor').textContent = formatarMoeda(benchmarks.selic);
    
    const diffCDI = data.resumo.patrimonio_total - benchmarks.cdi;
    const diffSELIC = data.resumo.patrimonio_total - benchmarks.selic;
    
    const cdiDiferencaEl = document.getElementById('cdiDiferenca');
    const selicDiferencaEl = document.getElementById('selicDiferenca');
    
    cdiDiferencaEl.textContent = (diffCDI >= 0 ? '+' : '') + formatarMoeda(diffCDI);
    selicDiferencaEl.textContent = (diffSELIC >= 0 ? '+' : '') + formatarMoeda(diffSELIC);
    
    cdiDiferencaEl.className = 'fw-bold ' + (diffCDI >= 0 ? 'text-success' : 'text-danger');
    selicDiferencaEl.className = 'fw-bold ' + (diffSELIC >= 0 ? 'text-success' : 'text-danger');
    
    // Atualizar gráfico de evolução
    atualizarGraficoEvolucao(data.evolucao);
    
    // Atualizar gráfico de distribuição
    atualizarGraficoDistribuicao(data.distribuicao);
    
    // Atualizar gráfico comparativo
    atualizarGraficoComparativo(benchmarks);
    
    // Atualizar tabela
    atualizarTabela(investimentos);
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function atualizarGraficoEvolucao(dados) {
    const ctx = document.getElementById('graficoEvolucao').getContext('2d');
    
    if (graficoEvolucao) {
        graficoEvolucao.destroy();
    }
    
    graficoEvolucao = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dados.datas,
            datasets: [{
                label: 'Patrimônio Acumulado (R$)',
                data: dados.valores,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatarMoeda(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });
}

function atualizarGraficoDistribuicao(dados) {
    const ctx = document.getElementById('graficoDistribuicao').getContext('2d');
    
    if (graficoDistribuicao) {
        graficoDistribuicao.destroy();
    }
    
    const cores = [
        '#0d6efd', '#198754', '#ffc107', '#dc3545', 
        '#6f42c1', '#fd7e14', '#20c997', '#6610f2'
    ];
    
    graficoDistribuicao = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dados.tipos,
            datasets: [{
                data: dados.valores,
                backgroundColor: cores.slice(0, dados.tipos.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatarMoeda(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function atualizarTabela(dados) {
    const tbody = document.getElementById('tabelaInvestimentos');
    tbody.innerHTML = '';
    
    if (!dados || dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum investimento registrado</td></tr>';
        return;
    }
    
    dados.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatarData(item.data)}</td>
            <td>${item.ativo}</td>
            <td>${item.tipo_investimento}</td>
            <td>${formatarMoeda(item.valor_total)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Função para atualizar gráfico comparativo
function atualizarGraficoComparativo(benchmarks) {
    const ctx = document.getElementById('graficoComparativo').getContext('2d');
    
    if (graficoComparativo) {
        graficoComparativo.destroy();
    }
    
    graficoComparativo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: benchmarks.datas.map(d => formatarData(d)),
            datasets: [
                {
                    label: 'CDI Acumulado',
                    data: benchmarks.valoresCDI,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'SELIC Acumulado',
                    data: benchmarks.valoresSELIC,
                    borderColor: '#0dcaf0',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });
}

// Permitir upload ao pressionar Enter no input de arquivo
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csvFile').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            uploadCSV();
        }
    });
    
    // Carregar investimentos manuais do localStorage ao iniciar
    carregarInvestimentosManuaisLocalStorage();
});

// Funções para LocalStorage
function salvarInvestimentosLocalStorage(investimentos) {
    localStorage.setItem('investimentos_manuais', JSON.stringify(investimentos));
}

function carregarInvestimentosLocalStorage() {
    const dados = localStorage.getItem('investimentos_manuais');
    return dados ? JSON.parse(dados) : [];
}

function carregarInvestimentosManuaisLocalStorage() {
    const investimentos = carregarInvestimentosLocalStorage();
    atualizarTabelaManuais(investimentos);
    document.getElementById('totalManuais').textContent = `${investimentos.length} investimento(s)`;
}

async function adicionarInvestimento(event) {
    event.preventDefault();
    
    const data = document.getElementById('dataInvestimento').value;
    const tipoInvestimento = document.getElementById('tipoInvestimento').value;
    const ativo = document.getElementById('ativoInvestimento').value;
    const valorTotal = parseFloat(document.getElementById('valorInvestimento').value);
    
    // Esconder mensagens anteriores
    document.getElementById('errorManual').classList.add('d-none');
    document.getElementById('successManual').classList.add('d-none');
    document.getElementById('loadingManual').classList.remove('d-none');
    
    try {
        // Criar objeto de investimento
        const investimento = {
            data: data,
            tipo_investimento: tipoInvestimento.trim(),
            ativo: ativo.trim(),
            valor_total: valorTotal
        };
        
        // Carregar investimentos existentes do localStorage
        let investimentos = carregarInvestimentosLocalStorage();
        
        // Adicionar novo investimento
        investimentos.push(investimento);
        
        // Salvar no localStorage
        salvarInvestimentosLocalStorage(investimentos);
        
        document.getElementById('loadingManual').classList.add('d-none');
        
        // Mostrar sucesso
        const successDiv = document.getElementById('successManual');
        successDiv.textContent = 'Investimento adicionado com sucesso!';
        successDiv.classList.remove('d-none');
        
        // Limpar formulário
        document.getElementById('formInvestimento').reset();
        
        // Atualizar tabela
        carregarInvestimentosManuaisLocalStorage();
        
        // Esconder mensagem de sucesso após 3 segundos
        setTimeout(() => {
            successDiv.classList.add('d-none');
        }, 3000);
    } catch (error) {
        document.getElementById('loadingManual').classList.add('d-none');
        mostrarErroManual('Erro ao adicionar investimento: ' + error.message);
    }
}

async function removerInvestimento(index) {
    if (!confirm('Tem certeza que deseja remover este investimento?')) {
        return;
    }
    
    try {
        // Carregar investimentos do localStorage
        let investimentos = carregarInvestimentosLocalStorage();
        
        // Remover investimento pelo índice
        if (index >= 0 && index < investimentos.length) {
            investimentos.splice(index, 1);
            
            // Salvar no localStorage
            salvarInvestimentosLocalStorage(investimentos);
            
            // Atualizar tabela
            carregarInvestimentosManuaisLocalStorage();
        }
    } catch (error) {
        alert('Erro ao remover investimento: ' + error.message);
    }
}

async function limparInvestimentos() {
    if (!confirm('Tem certeza que deseja limpar todos os investimentos cadastrados?')) {
        return;
    }
    
    try {
        // Limpar localStorage
        localStorage.removeItem('investimentos_manuais');
        
        // Atualizar tabela
        carregarInvestimentosManuaisLocalStorage();
        document.getElementById('resumoSection').classList.add('d-none');
        alert('Lista de investimentos limpa com sucesso!');
    } catch (error) {
        alert('Erro ao limpar investimentos: ' + error.message);
    }
}

async function processarManuais() {
    // Esconder mensagens anteriores
    document.getElementById('errorManual').classList.add('d-none');
    document.getElementById('successManual').classList.add('d-none');
    document.getElementById('loadingManual').classList.remove('d-none');
    
    try {
        // Carregar investimentos do localStorage
        const investimentos = carregarInvestimentosLocalStorage();
        
        if (!investimentos || investimentos.length === 0) {
            document.getElementById('loadingManual').classList.add('d-none');
            mostrarErroManual('Nenhum investimento cadastrado. Adicione investimentos primeiro.');
            return;
        }
        
        // Preparar dados no mesmo formato da API
        const dadosProcessados = {
            resumo: {
                patrimonio_total: investimentos.reduce((sum, inv) => sum + inv.valor_total, 0),
                num_ativos: new Set(investimentos.map(inv => inv.ativo)).size,
                num_investimentos: investimentos.length,
                primeiro_investimento: investimentos.sort((a, b) => new Date(a.data) - new Date(b.data))[0].data,
                ultimo_investimento: investimentos.sort((a, b) => new Date(b.data) - new Date(a.data))[0].data
            },
            tabela: investimentos,
            evolucao: calcularEvolucao(investimentos),
            distribuicao: calcularDistribuicao(investimentos)
        };
        
        document.getElementById('loadingManual').classList.add('d-none');
        document.getElementById('resumoSection').classList.remove('d-none');
        atualizarDashboard(dadosProcessados);
    } catch (error) {
        document.getElementById('loadingManual').classList.add('d-none');
        mostrarErroManual('Erro ao processar investimentos: ' + error.message);
    }
}

function calcularEvolucao(investimentos) {
    const df = investimentos.sort((a, b) => new Date(a.data) - new Date(b.data));
    const patrimonioPorData = {};
    
    df.forEach(inv => {
        if (!patrimonioPorData[inv.data]) {
            patrimonioPorData[inv.data] = 0;
        }
        patrimonioPorData[inv.data] += inv.valor_total;
    });
    
    const datas = Object.keys(patrimonioPorData).sort();
    let acumulado = 0;
    const valores = [];
    
    datas.forEach(data => {
        acumulado += patrimonioPorData[data];
        valores.push(acumulado);
    });
    
    return {
        datas: datas,
        valores: valores
    };
}

function calcularDistribuicao(investimentos) {
    const distribuicao = {};
    
    investimentos.forEach(inv => {
        if (!distribuicao[inv.tipo_investimento]) {
            distribuicao[inv.tipo_investimento] = 0;
        }
        distribuicao[inv.tipo_investimento] += inv.valor_total;
    });
    
    return {
        tipos: Object.keys(distribuicao),
        valores: Object.values(distribuicao)
    };
}
