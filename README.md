# Projeto MLX - Interação com Personas

## Descrição do Projeto

O **MLX** é uma aplicação web inovadora que possibilita a interação com personagens, também conhecidos como personas, que são criados pelos próprios usuários ou pré-definidos pelo sistema. Cada persona tem uma personalidade distinta, que se reflete em suas respostas durante as interações. Usando o poderoso modelo **GPT-4** da OpenAI e o LLAMA3 da Meta, o MLX cria um ambiente dinâmico e imersivo onde essas personas podem participar de conversas tanto individuais quanto em grupo.

### Potencial e Aplicações

O **MLX** tem um potencial de alcance significativo, especialmente em áreas como:

- **Educação**: Criação de personas como figuras históricas ou especialistas para interação com estudantes.
- **Entretenimento**: Fãs podem criar versões interativas de personagens fictícios para interações divertidas.
- **Treinamento e Simulação**: Empresas podem usar o sistema para simulações de atendimento ao cliente e vendas.
- **Desenvolvimento Pessoal**: Usuários podem criar personas motivacionais ou instrutores virtuais para orientação em várias áreas.

## Funcionalidades Principais

- **Cadastro e Login de Usuários**: Usuários podem se cadastrar e acessar o sistema de forma personalizada.
- **Criação de Personas**: Usuários definem o nome, descrição e imagem de suas personas.
- **Interação Individual**: O usuário pode conversar diretamente com uma persona.
- **Chat em Grupo**: Interação simultânea com múltiplas personas em uma sala de chat.
- **Manutenção de Contexto**: As personas retêm o histórico de conversas, promovendo uma experiência contínua.
- **Respostas Dinâmicas com GPT-4**: Gera respostas altamente contextuais e personalizadas.

## Tecnologias Utilizadas

- **Node.js** e **Express.js**: Backend para manipulação de dados e integração com a API OpenAI.
- **OpenAI API (GPT-4)**: Geração de respostas personalizadas para interações com personas.
- **Axios**: Realiza requisições HTTP com a API da OpenAI.
- **Bootstrap**: Framework front-end para a criação de uma interface visual e responsiva.
- **HTML/CSS/JavaScript**: Para a construção da interface e interação com o sistema.

## Detalhes da Estrutura

- `public/`: Arquivos relacionados ao frontend, como HTML, CSS e JavaScript.
- `server/`: Contém o backend, incluindo configurações de rotas e integração com a API OpenAI.
- `app.js`: Lógica para criação e gerenciamento de personas e gerencia as chamadas para a API OpenAI e outros modelos de IA.
- `README.md`: Documentação do projeto.

## Como Executar o Projeto

Para rodar o projeto MLX em sua máquina local, siga os passos abaixo:

1. Clone este repositório:

    ```bash
    git clone https://github.com/antonioreal97/MLXp.git
    cd MLXp
    ```

2. Instale as dependências: Certifique-se de que o Node.js e o npm estão instalados. Execute:

    ```bash
    npm install
    ```

3. Configuração das Variáveis de Ambiente: Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis de ambiente:

    ```plaintext
    OPENAI_API_KEY=your_openai_api_key
    HUGGING_FACE_API_TOKEN=your_hugging_face_api_key
    ```

4. Execute o Servidor: Inicie o servidor com o comando:

    ```bash
    node server/app.js
    ```

5. O servidor estará disponível em [http://localhost:3000](http://localhost:3000).

6. Acesse a Aplicação: Abra o navegador e acesse [http://localhost:3000](http://localhost:3000) para ver a aplicação em execução.

## Estrutura do Projeto

```plaintext
projeto-chat/
├── public/
│   ├── paginas.html        # Páginas HTML
│   ├── styles.css          # Estilos personalizados
│   └── script.js           # Scripts do frontend
│
├── server/
│   ├── app.js              # Configurações e inicialização do servidor
│   ├── historico-chat.json # Arquivo com o histórico de descrição de cada Persona (pessoal)
│   └── users.json          # Arquivo com as informações de login dos usuários
│
├── users                   # Pasta com as Personas criadas pelo usuário
├── package.json            # Dependências e configurações do Node.js
└── README.md               # Documentação do projeto
