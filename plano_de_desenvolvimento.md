# Plano de Desenvolvimento - Monitor de Evolução de Patrimônio

## Objetivo
Criar uma aplicação web para importar dados de investimentos via CSV e visualizar a evolução do patrimônio ao longo do tempo.

## Funcionalidades Principais

### 1. Importação de CSV
- Upload de arquivo CSV com dados de investimentos
- Formato esperado do CSV:
  - data (YYYY-MM-DD)
  - tipo_investimento (Ações, FIIs, Tesouro Direto, CDB, etc.)
  - ativo (nome do ativo)
  - quantidade
  - preco_unitario
  - valor_total
  - observacoes (opcional)

### 2. Visualização de Dados
- Gráfico de linha mostrando evolução do patrimônio total
- Gráfico de pizza mostrando distribuição por tipo de investimento
- Tabela com histórico de investimentos
- Cards com resumo (patrimônio total, número de ativos, etc.)

### 3. Tecnologias Utilizadas
- **Backend**: Python com Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **Gráficos**: Chart.js
- **Processamento de CSV**: Pandas
- **Estilização**: Bootstrap 5

## Estrutura do Projeto

```
/workspace
├── app.py                 # Aplicação principal Flask
├── requirements.txt       # Dependências Python
├── templates/
│   └── index.html        # Página principal
├── static/
│   ├── css/
│   │   └── style.css     # Estilos customizados
│   └── js/
│       └── main.js       # Lógica do frontend
├── uploads/              # Pasta para arquivos CSV temporários
└── plano_de_desenvolvimento.md
```

## Passos de Implementação

1. ✅ Configurar estrutura do projeto
2. ✅ Criar backend Flask com endpoints para upload e processamento
3. ✅ Implementar parser de CSV
4. ✅ Criar frontend com formulário de upload
5. ✅ Implementar visualização de gráficos
6. ✅ Adicionar tabela de dados
7. ✅ Testar com dados de exemplo

## Como Usar

1. Instalar dependências: `pip install -r requirements.txt`
2. Executar aplicação: `python app.py`
3. Acessar no navegador: `http://localhost:5001`
4. Fazer upload do CSV com dados de investimentos
5. Visualizar gráficos e tabelas com a evolução do patrimônio
