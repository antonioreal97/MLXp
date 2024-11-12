require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const axios = require('axios'); // Usando axios para fazer requisições HTTP
const csrf = require('csurf'); // Middleware CSRF
const cookieParser = require('cookie-parser'); // Para gerenciar cookies
const { Configuration, OpenAIApi } = require('openai'); // Para usar a API da OpenAI

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public'))); // Serve arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '..', 'server')));
app.use(cookieParser()); // Utiliza o cookie-parser para gerenciar cookies
app.use(csrf({ cookie: true })); // Configura o middleware CSRF com cookies

// Middleware para enviar o token CSRF para o cliente via cookies
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken()); // Envia o token CSRF ao cliente
  next();
});

// Configura a API da OpenAI para GPT-4
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

  if (!currentLoggedInUser || !currentLoggedInUser.username) {
    return res.status(401).json({ message: 'Usuário não autenticado.' });
  }

  if (!name || !description) {
    return res.status(400).json({ message: 'Nome e descrição são obrigatórios.' });
  }

  const userPersonas = readUserPersonas(currentLoggedInUser.username);
  const personaExists = userPersonas.find((persona) => persona.name.toLowerCase() === name.toLowerCase());
  if (personaExists) {
    return res.status(409).json({ message: 'Você já tem uma persona com esse nome.' });
  }

  const newPersona = {
    name,
    description,
    image: image || '/images/default.png',
    owner: currentLoggedInUser.username,
    public: isPublic || false,
    messages: []
  };

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

// Função para garantir o arquivo de histórico de conversas
const chatHistoryFilePath = path.join(__dirname, 'historico-chat.json');

const loadChatHistory = () => {
  if (!fs.existsSync(chatHistoryFilePath)) fs.writeFileSync(chatHistoryFilePath, JSON.stringify({}));
  const data = fs.readFileSync(chatHistoryFilePath);
  return JSON.parse(data);
};

const saveChatHistory = (history) => {
  fs.writeFileSync(chatHistoryFilePath, JSON.stringify(history, null, 2));
};

// Rota para carregar o histórico de uma persona
app.post('/load-persona-history', isAuthenticated, (req, res) => {
  const { persona } = req.body;
  const userPersonas = readUserPersonas(currentLoggedInUser.username);
  const currentPersona = userPersonas.find(p => p.name === persona);
  res.json({ history: currentPersona ? currentPersona.messages : [] });
});

app.post('/load-persona-description', isAuthenticated, (req, res) => {
  const { persona } = req.body;
  const chatHistory = loadChatHistory();
  res.json({ description: chatHistory[persona]?.description || '' });
});

app.post('/save-persona-description', isAuthenticated, (req, res) => {
  const { persona, description } = req.body;
  const chatHistory = loadChatHistory();
  chatHistory[persona] = chatHistory[persona] || {};
  chatHistory[persona].description = description;
  saveChatHistory(chatHistory);
  res.status(200).json({ message: 'Descrição salva com sucesso.' });
});

app.post('/generate-description', isAuthenticated, async (req, res) => {
  const { persona, model } = req.body;
  const route = model === 'gpt-4' ? 'gpt-4' : 'llama3';
  
  try {
    const description = await generateDescriptionForModel(route, persona);
    const chatHistory = loadChatHistory();
    chatHistory[persona] = chatHistory[persona] || {};
    chatHistory[persona].description = description;
    saveChatHistory(chatHistory);

    res.json({ description });
  } catch (error) {
    console.error('Erro ao gerar descrição:', error);
    res.status(500).json({ error: 'Erro ao gerar a descrição da persona.' });
  }
});

// Função auxiliar para gerar a descrição com o modelo correto
const generateDescriptionForModel = async (model, persona) => {
  if (model === 'gpt-4') {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Descreva a persona ${persona} em até 50 caracteres.` }],
    });
    return response.data.choices[0].message.content;
  } else {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt: `Descreva a persona ${persona} em até 50 caracteres.`,
      stream: false
    });
    return response.data.response;
  }
};

// Rota para enviar mensagens para a OpenAI (GPT-4) com histórico de contexto
app.post('/send-message-gpt-4', isAuthenticated, async (req, res) => {
  const { persona, message } = req.body;
  const userPersonas = readUserPersonas(currentLoggedInUser.username);
  const currentPersona = userPersonas.find(p => p.name === persona);

  if (!currentPersona) {
    return res.status(404).json({ message: 'Persona não encontrada.' });
  }

  // Seleciona as últimas 10 mensagens para contexto
  const contextMessages = currentPersona.messages.slice(-10).map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  contextMessages.push({ role: 'user', content: message });

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: `Você agora só vai responder como se fosse a persona: ${persona}. Jamais saia do personagem.` },
        ...contextMessages
      ],
    });

    const aiMessage = response.data.choices[0].message.content;

    currentPersona.messages.push({ role: 'user', content: message });
    currentPersona.messages.push({ role: 'assistant', content: aiMessage });
    saveUserPersonas(currentLoggedInUser.username, userPersonas);

    res.json({ reply: aiMessage });
  } catch (error) {
    console.error('Erro ao se comunicar com a OpenAI:', error);
    res.status(500).json({ error: 'Erro ao se comunicar com a OpenAI' });
  }
});

// Rota para limpar o histórico de conversas de uma persona
app.post('/clear-persona-history', isAuthenticated, (req, res) => {
  const { persona } = req.body;

  if (!persona) {
    return res.status(400).json({ message: 'Nome da persona não fornecido.' });
  }

  const userPersonas = readUserPersonas(currentLoggedInUser.username);
  const currentPersona = userPersonas.find(p => p.name === persona);

  if (!currentPersona) {
    return res.status(404).json({ message: 'Persona não encontrada.' });
  }

  currentPersona.messages = [];
  saveUserPersonas(currentLoggedInUser.username, userPersonas);

  res.status(200).json({ message: 'Histórico de conversa da persona foi limpo com sucesso.' });
});

// Rota para enviar mensagens para o LLaMA rodando localmente com histórico de contexto
app.post('/send-message-llama', isAuthenticated, async (req, res) => {
  const { persona, message } = req.body;
  const userPersonas = readUserPersonas(currentLoggedInUser.username);
  const currentPersona = userPersonas.find(p => p.name === persona);

  if (!currentPersona) {
    return res.status(404).json({ message: 'Persona não encontrada.' });
  }

  // Garantir que `messages` é um array
  if (!Array.isArray(currentPersona.messages)) {
    currentPersona.messages = [];
  }

  const contextMessages = currentPersona.messages.slice(-10).map(msg => msg.content).join('\n');

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt: `Para melhor experiência do usuário, se comporte como ${persona}.\n\n${contextMessages}\nUsuário: ${message}\nResposta:`,
      stream: false
    });

    const generatedText = response.data.response;

    currentPersona.messages.push({ role: 'user', content: message });
    currentPersona.messages.push({ role: 'assistant', content: generatedText });
    saveUserPersonas(currentLoggedInUser.username, userPersonas);

    res.json({ reply: generatedText });
  } catch (error) {
    console.error('Erro ao se comunicar com o Ollama/LLaMA:', error);
    res.status(500).json({ error: 'Erro ao se comunicar com o Ollama/LLaMA' });
  }
});

// Rota para enviar uma mensagem única para GPT-4 sem histórico de contexto
app.post('/send-message-gpt-4-no-context', isAuthenticated, async (req, res) => {
  const { persona, message } = req.body;

  if (!persona || !message) {
    return res.status(400).json({ message: 'Persona ou mensagem não fornecidos.' });
  }

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: `Você agora só vai responder como se fosse a persona: ${persona}. Jamais saia do personagem.` },
        { role: 'user', content: message }
      ],
    });

    const aiMessage = response.data.choices[0].message.content;

    // Responde com a mensagem gerada, sem adicionar ao histórico
    res.json({ reply: aiMessage });
  } catch (error) {
    console.error('Erro ao se comunicar com a OpenAI:', error);
    res.status(500).json({ error: 'Erro ao se comunicar com a OpenAI' });
  }
});

// Rota para enviar uma mensagem única para LLaMA sem histórico de contexto
app.post('/send-message-llama-no-context', isAuthenticated, async (req, res) => {
  const { persona, message } = req.body;

  if (!persona || !message) {
    return res.status(400).json({ message: 'Persona ou mensagem não fornecidos.' });
  }

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt: `Para melhor experiência do usuário, se comporte como ${persona}.\n\nUsuário: ${message}\nResposta:`,
      stream: false
    });

    const generatedText = response.data.response;

    // Responde com a mensagem gerada, sem adicionar ao histórico
    res.json({ reply: generatedText });
  } catch (error) {
    console.error('Erro ao se comunicar com o Ollama/LLaMA:', error);
    res.status(500).json({ error: 'Erro ao se comunicar com o Ollama/LLaMA' });
  }
});

// Rota para gerar a descrição da persona (baseada no modelo selecionado)
app.post('/generate-description', isAuthenticated, async (req, res) => {
  const { persona, model = 'llama3' } = req.body; // Padrão para 'llama3' se não for fornecido

  try {
    const description = await generateDescriptionForModel(model, persona);
    const chatHistory = loadChatHistory();
    chatHistory[persona] = chatHistory[persona] || {};
    chatHistory[persona].description = description;
    saveChatHistory(chatHistory);

    res.json({ description });
  } catch (error) {
    console.error('Erro ao gerar descrição:', error);
    res.status(500).json({ error: 'Erro ao gerar a descrição da persona.' });
  }
});

// Rota para atualizar uma persona existente
app.post('/update-persona', isAuthenticated, (req, res) => {
  const { originalName, name, description, image } = req.body;

  if (!originalName || !name || !description) {
    return res.status(400).json({ message: 'Nome e descrição são obrigatórios.' });
  }

  const userPersonas = readUserPersonas(currentLoggedInUser.username);
  const personaIndex = userPersonas.findIndex((persona) => persona.name === originalName);

  if (personaIndex === -1) {
    return res.status(404).json({ message: 'Persona não encontrada.' });
  }

  userPersonas[personaIndex] = {
    ...userPersonas[personaIndex],
    name,
    description,
    image: image || userPersonas[personaIndex].image 
  };

  saveUserPersonas(currentLoggedInUser.username, userPersonas);
  res.status(200).json({ message: 'Persona atualizada com sucesso!' });
});

// Rota para excluir uma persona
app.delete('/delete-persona', isAuthenticated, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Nome da persona não fornecido' });
  }

  const userPersonas = readUserPersonas(currentLoggedInUser.username);
  const personaIndex = userPersonas.findIndex((persona) => persona.name === name);

  if (personaIndex === -1) {
    return res.status(404).json({ message: 'Persona não encontrada.' });
  }

  userPersonas.splice(personaIndex, 1);
  saveUserPersonas(currentLoggedInUser.username, userPersonas);

  res.status(200).json({ message: 'Persona excluída com sucesso!' });
});

// Rota para geração de imagem com o modelo da Hugging Face
app.post('/generate-image', isAuthenticated, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt para geração de imagem não fornecido.' });
  }

  const apiKey = process.env.HUGGING_FACE_API_TOKEN;

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large',
      {
        inputs: prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    // Verifica se o diretório 'public-image' existe e o cria se necessário
    const outputDir = path.join(__dirname, 'public-image');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputFilePath = path.join(outputDir, 'generated-image.png');
    fs.writeFileSync(outputFilePath, response.data);

    res.json({ imageUrl: '/public-image/generated-image.png' });
  } catch (error) {
    console.error('Erro ao gerar imagem:', error);
    res.status(500).json({ message: 'Erro ao gerar imagem.' });
  }
});

// Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
