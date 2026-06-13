from flask import Flask, request, jsonify, render_template
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Criar pasta de uploads se não existir
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Armazenamento temporário de investimentos manuais (em memória)
investimentos_manuais = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Apenas arquivos CSV são permitidos'}), 400
    
    try:
        # Salvar arquivo temporariamente
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'investimentos.csv')
        file.save(filepath)
        
        # Ler e processar CSV
        df = pd.read_csv(filepath)
        
        # Validar colunas necessárias
        required_columns = ['data', 'tipo_investimento', 'ativo', 'valor_total']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return jsonify({
                'error': f'Colunas faltando no CSV: {", ".join(missing_columns)}'
            }), 400
        
        # Processar dados
        df['data'] = pd.to_datetime(df['data'])
        df = df.sort_values('data')
        
        # Calcular patrimônio acumulado por data
        patrimonio_por_data = df.groupby('data')['valor_total'].sum().cumsum()
        
        # Calcular distribuição por tipo de investimento
        distribuicao = df.groupby('tipo_investimento')['valor_total'].sum()
        
        # Preparar dados para o frontend
        dados_evolucao = {
            'datas': patrimonio_por_data.index.strftime('%Y-%m-%d').tolist(),
            'valores': patrimonio_por_data.values.tolist()
        }
        
        dados_distribuicao = {
            'tipos': distribuicao.index.tolist(),
            'valores': distribuicao.values.tolist()
        }
        
        # Resumo
        resumo = {
            'patrimonio_total': float(df['valor_total'].sum()),
            'num_ativos': len(df['ativo'].unique()),
            'num_investimentos': len(df),
            'primeiro_investimento': df['data'].min().strftime('%Y-%m-%d'),
            'ultimo_investimento': df['data'].max().strftime('%Y-%m-%d')
        }
        
        # Dados da tabela (últimos 50 investimentos)
        tabela_dados = df.tail(50).to_dict('records')
        for row in tabela_dados:
            row['data'] = row['data'].strftime('%Y-%m-%d')
        
        return jsonify({
            'sucesso': True,
            'evolucao': dados_evolucao,
            'distribuicao': dados_distribuicao,
            'resumo': resumo,
            'tabela': tabela_dados
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao processar arquivo: {str(e)}'}), 500

@app.route('/adicionar_investimento', methods=['POST'])
def adicionar_investimento():
    """Adiciona um investimento manualmente"""
    global investimentos_manuais
    
    try:
        data = request.json
        
        # Validar campos obrigatórios
        required_fields = ['data', 'tipo_investimento', 'ativo', 'valor_total']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Campo obrigatório faltando: {field}'}), 400
        
        # Converter valor para float
        try:
            valor = float(data['valor_total'])
            if valor <= 0:
                return jsonify({'error': 'O valor deve ser positivo'}), 400
        except ValueError:
            return jsonify({'error': 'Valor inválido'}), 400
        
        # Validar formato da data
        try:
            datetime.strptime(data['data'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
        
        # Criar investimento
        investimento = {
            'data': data['data'],
            'tipo_investimento': data['tipo_investimento'].strip(),
            'ativo': data['ativo'].strip(),
            'valor_total': valor
        }
        
        # Adicionar à lista
        investimentos_manuais.append(investimento)
        
        return jsonify({
            'sucesso': True,
            'mensagem': 'Investimento adicionado com sucesso!',
            'total_investimentos': len(investimentos_manuais)
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao adicionar investimento: {str(e)}'}), 500

@app.route('/listar_investimentos', methods=['GET'])
def listar_investimentos():
    """Lista todos os investimentos manuais cadastrados"""
    global investimentos_manuais
    
    if not investimentos_manuais:
        return jsonify({
            'investimentos': [],
            'total': 0,
            'patrimonio_total': 0
        })
    
    # Ordenar por data
    investimentos_ordenados = sorted(investimentos_manuais, key=lambda x: x['data'])
    
    # Calcular patrimônio total
    patrimonio_total = sum(inv['valor_total'] for inv in investimentos_ordenados)
    
    return jsonify({
        'investimentos': investimentos_ordenados,
        'total': len(investimentos_ordenados),
        'patrimonio_total': patrimonio_total
    })

@app.route('/remover_investimento/<int:index>', methods=['DELETE'])
def remover_investimento(index):
    """Remove um investimento da lista manual"""
    global investimentos_manuais
    
    if index < 0 or index >= len(investimentos_manuais):
        return jsonify({'error': 'Índice inválido'}), 400
    
    investimento_removido = investimentos_manuais.pop(index)
    
    return jsonify({
        'sucesso': True,
        'mensagem': f'Investimento {investimento_removido["ativo"]} removido com sucesso!',
        'total_investimentos': len(investimentos_manuais)
    })

@app.route('/processar_manuais', methods=['POST'])
def processar_manuais():
    """Processa os investimentos manuais e retorna os dados para o dashboard"""
    global investimentos_manuais
    
    if not investimentos_manuais:
        return jsonify({'error': 'Nenhum investimento manual cadastrado'}), 400
    
    try:
        # Criar DataFrame a partir dos investimentos manuais
        df = pd.DataFrame(investimentos_manuais)
        df['data'] = pd.to_datetime(df['data'])
        df = df.sort_values('data')
        
        # Calcular patrimônio acumulado por data
        patrimonio_por_data = df.groupby('data')['valor_total'].sum().cumsum()
        
        # Calcular distribuição por tipo de investimento
        distribuicao = df.groupby('tipo_investimento')['valor_total'].sum()
        
        # Preparar dados para o frontend
        dados_evolucao = {
            'datas': patrimonio_por_data.index.strftime('%Y-%m-%d').tolist(),
            'valores': patrimonio_por_data.values.tolist()
        }
        
        dados_distribuicao = {
            'tipos': distribuicao.index.tolist(),
            'valores': distribuicao.values.tolist()
        }
        
        # Resumo
        resumo = {
            'patrimonio_total': float(df['valor_total'].sum()),
            'num_ativos': len(df['ativo'].unique()),
            'num_investimentos': len(df),
            'primeiro_investimento': df['data'].min().strftime('%Y-%m-%d'),
            'ultimo_investimento': df['data'].max().strftime('%Y-%m-%d')
        }
        
        # Dados da tabela (últimos 50 investimentos)
        tabela_dados = df.tail(50).to_dict('records')
        for row in tabela_dados:
            row['data'] = row['data'].strftime('%Y-%m-%d')
        
        return jsonify({
            'sucesso': True,
            'evolucao': dados_evolucao,
            'distribuicao': dados_distribuicao,
            'resumo': resumo,
            'tabela': tabela_dados
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao processar investimentos: {str(e)}'}), 500

@app.route('/limpar_investimentos', methods=['POST'])
def limpar_investimentos():
    """Limpa todos os investimentos manuais"""
    global investimentos_manuais
    investimentos_manuais = []
    
    return jsonify({
        'sucesso': True,
        'mensagem': 'Lista de investimentos limpa com sucesso!'
    })

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5001)
