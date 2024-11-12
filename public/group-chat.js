let selectedPersonas = [];
let currentModel = 'llama'; // Modelo padrão inicial
const personaColors = {}; // Armazena cores das personas

function goBack() {
  window.location.href = '/user-personas.html';
}

function loadLoggedUser() {
  fetch('/get-logged-user')
    .then(response => response.json())
    .then(data => {
      document.getElementById('username').innerText = data.username || 'Desconhecido';
      loadUserPersonas(data.username); // Carrega as personas do usuário
    })
    .catch(error => {
      console.error('Erro ao carregar o nome do usuário:', error);
      document.getElementById('username').innerText = 'Erro';
    });
}

async function loadUserPersonas(username) {
  try {
    const response = await fetch(`/user-personas/${encodeURIComponent(username)}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }

    const personas = await response.json();
    const personaList = document.getElementById('personaList');
    personaList.innerHTML = '';

    personas.forEach((persona) => {
      const personaWrapper = document.createElement('div');
      personaWrapper.classList.add('persona-wrapper');

      const circle = document.createElement('div');
      circle.classList.add('persona-circle');

      const img = document.createElement('img');
      img.src = persona.image;
      img.alt = persona.name;
      img.classList.add('persona-image');
      img.onclick = () => toggleSelectPersona(persona.name, persona.image);

      const name = document.createElement('div');
      name.classList.add('persona-name');
      name.textContent = persona.name;

      circle.appendChild(img);
      personaWrapper.appendChild(circle);
      personaWrapper.appendChild(name);
      personaList.appendChild(personaWrapper);
    });
  } catch (error) {
    console.error('Erro ao carregar personas:', error);
  }
}

function toggleSelectPersona(personaName, personaImage) {
  const index = selectedPersonas.findIndex(p => p.name === personaName);
  if (index === -1) {
    selectedPersonas.push({ name: personaName, image: personaImage });
  } else {
    selectedPersonas.splice(index, 1);
  }
  updateSelectedPersonasDisplay();
}

function updateSelectedPersonasDisplay() {
  const selectedDiv = document.getElementById('selectedPersonas');
  selectedDiv.innerHTML = '';
  selectedPersonas.forEach((persona) => {
    const img = document.createElement('img');
    img.src = persona.image;
    img.alt = persona.name;
    img.onclick = () => removeSelectedPersona(persona.name);
    selectedDiv.appendChild(img);
  });
}

function removeSelectedPersona(personaName) {
  selectedPersonas = selectedPersonas.filter(p => p.name !== personaName);
  updateSelectedPersonasDisplay();
}

function changeModel() {
  const modelSelect = document.getElementById('modelSelect');
  currentModel = modelSelect.value === 'gpt-4' ? 'gpt-4' : 'llama';
  document.getElementById('model-name').innerText = currentModel === 'gpt-4' ? 'GPT-4' : 'LLAMA3';
}

// Função para gerar uma cor aleatória
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

async function startGroupChat() {
  if (selectedPersonas.length === 0) {
    alert('Por favor, selecione ao menos uma persona.');
    return;
  }

  const userMessage = document.getElementById('userMessage').value.trim();
  if (!userMessage) {
    alert('Digite uma mensagem.');
    return;
  }

  const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];
  const loadingIcon = document.getElementById('loadingIcon');
  loadingIcon.style.display = 'inline-block';

  // Adiciona a mensagem do usuário ao chat
  addMessageToChat('Você', userMessage, 'user');

  document.getElementById('userMessage').value = '';

  let lastMessage = userMessage; // A primeira persona responde ao usuário
  const personaNames = selectedPersonas.map(p => p.name); // Lista com os nomes das personas no chat

  // Cada persona responde conforme a última mensagem
  for (const persona of selectedPersonas) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const route = currentModel === 'gpt-4' ? '/send-message-gpt-4-no-context' : '/send-message-llama-no-context';

      // Envia a última mensagem para a próxima persona na sequência, junto com a lista de participantes
      const response = await fetch(route, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          persona: persona.name,
          message: lastMessage,
          group: personaNames // Adiciona lista de todas as personas no grupo
        }),
      });

      const data = await response.json();
      if (data.reply) {
        // Define uma cor aleatória se a persona ainda não tiver uma
        if (!personaColors[persona.name]) {
          personaColors[persona.name] = getRandomColor();
        }

        // Adiciona a resposta da persona ao chat e atualiza `lastMessage`
        addMessageToChat(persona.name, data.reply, personaColors[persona.name]);
        lastMessage = data.reply; // Atualiza `lastMessage` para a resposta desta persona
      } else {
        addMessageToChat(persona.name, 'Desculpe, não consegui processar sua mensagem.', personaColors[persona.name]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      addMessageToChat(persona.name, 'Ocorreu um erro ao processar sua mensagem.', personaColors[persona.name]);
    }
  }

  loadingIcon.style.display = 'none';
}

function addMessageToChat(sender, message, colorClass = '') {
  const chatBox = document.getElementById('chatBox');
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  messageDiv.style.backgroundColor = colorClass;
  messageDiv.innerText = `${sender}: ${message}`;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    startGroupChat();
  }
}

async function logoutUser() {
  try {
    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];

    const response = await fetch('/logout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      }
    });
    if (response.ok) {
      window.location.href = 'index.html';
    } else {
      alert('Erro ao fazer logout.');
    }
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    alert('Erro ao tentar fazer logout.');
  }
}

window.onload = function() {
  loadLoggedUser();
};
