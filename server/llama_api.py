import requests
import json

# Função para usar o Ollama no Docker
def send_to_llama(prompt):
    url = 'http://localhost:5000/api/generate'  # Tente sem o caminho /v1
    headers = {
        'Content-Type': 'application/json'
    }
    
    # Dados que serão enviados à API
    data = {
        'model': 'llama3',  # Verifique o nome correto do modelo no Ollama
        'prompt': prompt,
        'max_tokens': 100  # Limite máximo de tokens para a resposta
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()  # Verifica se ocorreu algum erro na resposta
        return response.json()  # Retorna a resposta da API em JSON
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

# Testando a função de integração com a API LLaMA3
if __name__ == "__main__":
    prompt_text = "Me fale sobre inteligência artificial"
    result = send_to_llama(prompt_text)
    print(result)  # Imprime a resposta gerada pela API
