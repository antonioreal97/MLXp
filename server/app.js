require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const axios = require('axios'); // Para comunicação com o modelo local (Ollama)
const { Configuration, OpenAIApi } = require('openai'); // Para usar a API da OpenAI

const app = express();

app.use(bodyParser.json());
app.use(express.static('public')); // Serve arquivos estáticos

// Configura a API da OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Carrega a API Key do arquivo .env
});
const openai = new OpenAIApi(configuration);

// Variável para armazenar o usuário logado
let currentLoggedInUser = null;

// Carrega ou cria o arquivo JSON que simula a base de dados de usuários
const usersFilePath = path.join(__dirname, 'users.json');
if (!fs.existsSync(usersFilePath)) {
  fs.writeFileSync(usersFilePath, JSON.stringify([]));
}

// Função para ler o arquivo de usuários
const readUsers = () => {
  const data = fs.readFileSync(usersFilePath);
  return JSON.parse(data);
};

// Função para salvar usuários no arquivo 'users.json'
const saveUsers = (users) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Função de verificação de autenticação
const isAuthenticated = (req, res, next) => {
  if (!currentLoggedInUser) {
    return res.status(401).json({ message: 'Usuário não autenticado. Faça o login.' });
  }
  next(); // Usuário autenticado, pode continuar
};

// Rota de cadastro
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ message: 'Nome de usuário, senha e email são obrigatórios.' });
  }

  const users = readUsers();

  // Verifica se o usuário já existe
  const userExists = users.find((user) => user.username === username);
  if (userExists) {
    return res.status(400).json({ message: 'Usuário já existe.' });
  }

  // Hash da senha para segurança
  const hashedPassword = await bcrypt.hash(password, 10);

  // Adiciona o novo usuário no arquivo 'users.json'
  users.push({ username, password: hashedPassword, email });
  saveUsers(users); // Salva os usuários atualizados no arquivo

  res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
});

// Rota de login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const users = readUsers();

  // Procura o usuário pelo nome de usuário
  const user = users.find((user) => user.username === username);

  if (!user) {
    return res.status(400).json({ message: 'Usuário não encontrado.' });
  }

  // Compara a senha informada com a senha salva (hash)
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Senha incorreta.' });
  }

  // Se o login for bem-sucedido, armazena o usuário na variável de sessão
  currentLoggedInUser = { username };

  // Envia uma resposta de sucesso
  res.status(200).json({ message: 'Login bem-sucedido', redirectUrl: '/personas.html' });
});

// Rota de logout (limpa a sessão)
app.post('/logout', (req, res) => {
  currentLoggedInUser = null;
  res.status(200).json({ message: 'Logout bem-sucedido' });
});

// Carrega ou cria o arquivo JSON que simula a base de dados de personas
const personasFilePath = path.join(__dirname, 'personas.json');
if (!fs.existsSync(personasFilePath)) {
  fs.writeFileSync(personasFilePath, JSON.stringify([]));
}

// Função para ler o arquivo de personas
const readPersonas = () => {
  const data = fs.readFileSync(personasFilePath);
  return JSON.parse(data);
};

// Função para salvar as personas
const savePersonas = (personas) => {
  fs.writeFileSync(personasFilePath, JSON.stringify(personas, null, 2));
};

// Rota para listar todas as personas (somente autenticado)
app.get('/personas', isAuthenticated, (req, res) => {
  const personas = readPersonas();
  res.json(personas);
});

// Rota para criar uma nova persona (somente autenticado)
app.post('/create-persona', isAuthenticated, (req, res) => {
  const { name, description, image } = req.body;

  if (!name || !description) {
    return res.status(400).json({ message: 'Nome e descrição são obrigatórios.' });
  }

  const personas = readPersonas();

  const personaExists = personas.find((persona) => persona.name === name);
  if (personaExists) {
    return res.status(400).json({ message: 'Uma persona com esse nome já existe.' });
  }

  const newPersona = { name, description, image: image || '/images/default.png' };
  personas.push(newPersona);
  savePersonas(personas);

  res.status(201).json({ message: 'Persona criada com sucesso!' });
});

// Rota para obter o nome do usuário logado
app.get('/get-logged-user', (req, res) => {
  if (currentLoggedInUser) {
    res.json({ username: currentLoggedInUser.username });
  } else {
    res.status(401).json({ message: 'Usuário não autenticado' });
  }
});

// Rota para enviar mensagens para a OpenAI (GPT-4)
app.post('/send-message-openai', isAuthenticated, async (req, res) => {
  const { persona, message } = req.body;

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: `Você agora só vai responder como se você fosse a persona: ${persona}. Jamais saia do personagem.` },
        { role: 'user', content: message },
      ],
    });

    const aiMessage = response.data.choices[0].message.content;
    res.json({ reply: aiMessage });
  } catch (error) {
    console.error('Erro ao se comunicar com a OpenAI:', error);
    res.status(500).json({ error: 'Erro ao se comunicar com a OpenAI' });
  }
});

// Rota para obter o modelo atual (por exemplo, GPT-4)
app.get('/get-current-model', (req, res) => {
  res.json({ model: 'GPT-4' }); // Altere para o modelo real que você está usando
});

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
