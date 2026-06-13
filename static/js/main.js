let graficoEvolucao = null;
let graficoDistribuicao = null;

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
    // Atualizar cards de resumo
    document.getElementById('patrimonioTotal').textContent = 
        formatarMoeda(data.resumo.patrimonio_total);
    document.getElementById('numAtivos').textContent = data.resumo.num_ativos;
    document.getElementById('numInvestimentos').textContent = data.resumo.num_investimentos;
    document.getElementById('periodo').textContent = 
        `${formatarData(data.resumo.primeiro_investimento)} até ${formatarData(data.resumo.ultimo_investimento)}`;
    
    // Atualizar gráfico de evolução
    atualizarGraficoEvolucao(data.evolucao);
    
    // Atualizar gráfico de distribuição
    atualizarGraficoDistribuicao(data.distribuicao);
    
    // Atualizar tabela
    atualizarTabela(data.tabela);
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

// Permitir upload ao pressionar Enter no input de arquivo
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csvFile').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            uploadCSV();
        }
    });
    
    // Carregar investimentos manuais ao iniciar
    carregarInvestimentosManuais();
});
