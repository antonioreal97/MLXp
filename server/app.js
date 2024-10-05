require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Configuration, OpenAIApi } = require('openai'); // Para usar a API da OpenAI
const csrf = require('csurf'); // Middleware CSRF
const cookieParser = require('cookie-parser'); // Para gerenciar cookies

const app = express();

app.use(bodyParser.json());
app.use(express.static('public')); // Serve arquivos estáticos
app.use(cookieParser()); // Utiliza o cookie-parser para gerenciar cookies
app.use(csrf({ cookie: true })); // Configura o middleware CSRF com cookies

// Middleware para enviar o token CSRF para o cliente via cookies
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken()); // Envia o token CSRF ao cliente
  next();
});

// Configura a API da OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Carrega a API Key do arquivo .env
});
const openai = new OpenAIApi(configuration);

// Variável para armazenar o usuário logado
let currentLoggedInUser = null;

// Função para garantir que o diretório users exista
const ensureUsersDirectoryExists = () => {
  const usersDirPath = path.join(__dirname, 'users');
  if (!fs.existsSync(usersDirPath)) {
    fs.mkdirSync(usersDirPath);
  }

  const externalUsersDirPath = path.join(__dirname, '..', 'users');
  if (!fs.existsSync(externalUsersDirPath)) {
    fs.mkdirSync(externalUsersDirPath);
  }
};

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

// Função para salvar personas no arquivo específico do usuário
const saveUserPersonas = (username, personas) => {
  ensureUsersDirectoryExists(); // Garante que as pastas 'users' existam
  const userFilePath = path.join(__dirname, 'users', `${username}.json`);
  fs.writeFileSync(userFilePath, JSON.stringify(personas, null, 2));

  // Grava também no arquivo fora da pasta 'server'
  const externalUserFilePath = path.join(__dirname, '..', 'users', `${username}.json`);
  fs.writeFileSync(externalUserFilePath, JSON.stringify(personas, null, 2));
};

// Função para ler o arquivo de personas de um usuário
const readUserPersonas = (username) => {
  ensureUsersDirectoryExists(); // Garante que as pastas 'users' existam
  const userFilePath = path.join(__dirname, 'users', `${username}.json`);
  if (!fs.existsSync(userFilePath)) {
    return [];
  }
  const data = fs.readFileSync(userFilePath);
  return JSON.parse(data);
};

// Função para carregar todas as personas públicas
const loadPublicPersonas = () => {
  const publicPersonasFilePath = path.join(__dirname, 'personas.json'); // Supondo que personas.json contém as personas públicas
  if (!fs.existsSync(publicPersonasFilePath)) {
    return [];
  }
  const data = fs.readFileSync(publicPersonasFilePath);
  return JSON.parse(data).filter(persona => persona.public);
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

// Rota para listar as personas criadas pelo usuário
app.get('/user-personas/:username', isAuthenticated, (req, res) => {
  const { username } = req.params;
  const userPersonas = readUserPersonas(username); // Lê as personas do usuário
  if (userPersonas) {
    res.json(userPersonas); // Envia as personas do usuário
  } else {
    res.status(404).json({ message: 'Nenhuma persona encontrada.' });
  }
});

// Rota para criar uma nova persona (somente autenticado)
app.post('/create-persona', isAuthenticated, (req, res) => {
  const { name, description, image, public: isPublic } = req.body;

  if (!name || !description) {
    return res.status(400).json({ message: 'Nome e descrição são obrigatórios.' });
  }

  // Lê as personas existentes do arquivo do usuário
  const userPersonas = readUserPersonas(currentLoggedInUser.username);

  // Verifica se a persona já existe
  const personaExists = userPersonas.find((persona) => persona.name === name);
  if (personaExists) {
    return res.status(400).json({ message: 'Você já tem uma persona com esse nome.' });
  }

  // Cria uma nova persona
  const newPersona = {
    name,
    description,
    image: image || '/images/default.png',
    owner: currentLoggedInUser.username,
    public: isPublic || false,
  };

  // Adiciona a nova persona à lista e salva no arquivo do usuário
  userPersonas.push(newPersona);
  saveUserPersonas(currentLoggedInUser.username, userPersonas);

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
        { role: 'system', content: `Você agora só vai responder como se você fosse a persona: ${persona}. Jamais saia do personagem mesmo que você estiver interagindo com outra personalidade.` },
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

// Rota para carregar formulário com token CSRF
app.get('/get-csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
