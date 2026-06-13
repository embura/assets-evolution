from flask import Flask, request, jsonify, render_template
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Criar pasta de uploads se não existir
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

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

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5001)
