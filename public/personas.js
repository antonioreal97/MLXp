let selectedPersona = '';
const defaultPersonaImage = 'images/persona-main.png';
let currentModel = 'llama'; // Valor padrão inicial

function loadLoggedUser() {
    fetch('/get-logged-user')
    .then(response => response.json())
    .then(data => {
        document.getElementById('username').innerText = data.username || 'Desconhecido';
        loadPersonas(); // Carregar personas públicas
    })
    .catch(error => {
        console.error('Erro ao carregar o nome do usuário:', error);
        document.getElementById('username').innerText = 'Erro';
    });
}

function loadPersonas() {
    fetch('/personas.json')
    .then(response => response.json())
    .then(personas => {
        const personaList = document.getElementById('personaList');
        personaList.innerHTML = '';

        if (personas.length > 0) {
            personas.forEach(persona => displayPersona(persona, personaList));
        } else {
            personaList.innerHTML = '<p>Nenhuma persona disponível no momento.</p>';
        }
    })
    .catch(error => console.error('Erro ao carregar personas:', error));
}

function displayPersona(persona, container) {
    const personaWrapper = document.createElement('div');
    personaWrapper.classList.add('persona-wrapper');

    // Círculo azul para a imagem
    const circle = document.createElement('div');
    circle.classList.add('persona-circle');

    // Imagem da persona
    const img = document.createElement('img');
    img.src = persona.image || 'images/default-persona.png'; // Imagem padrão se não houver
    img.alt = persona.name;
    img.classList.add('persona-image');

    // Nome da persona
    const name = document.createElement('div');
    name.classList.add('persona-name');
    name.textContent = persona.name;

    // Colocando imagem no círculo e adicionando ao wrapper
    circle.appendChild(img);
    personaWrapper.appendChild(circle);
    personaWrapper.appendChild(name);

    // Passa a descrição também para `selectPersona`
    personaWrapper.onclick = () => selectPersona(persona.name, persona.image, persona.description);

    container.appendChild(personaWrapper);
}

function selectPersona(personaName, personaImage, personaDescription) {
    selectedPersona = personaName;
    document.getElementById('selectedPersonaName').innerText = personaName;
    document.getElementById('selectedPersonaImage').style.backgroundImage = `url(${personaImage || defaultPersonaImage})`;
    document.getElementById('selectedPersonaImage').style.backgroundSize = 'cover';

    // Exibe a descrição diretamente do arquivo JSON
    document.getElementById('personaDescription').innerText = personaDescription || 'Descrição não disponível.';
}

function changeModel() {
    const modelSelect = document.getElementById('modelSelect');
    currentModel = modelSelect.value === 'gpt-4' ? 'gpt-4' : 'llama3'; // Define se o modelo é GPT-4 ou LLaMA
    document.getElementById('model-name').innerText = modelSelect.options[modelSelect.selectedIndex].text;
}

async function sendMessage(noContext = false) {
    const messageInput = document.getElementById('userMessage');
    const message = messageInput.value.trim();
    const loadingIcon = document.getElementById('loadingIcon');
    const sendButton = document.querySelector('button');

    if (message === '' || selectedPersona === '') {
        alert('Por favor, selecione uma persona e digite uma mensagem.');
        return;
    }

    loadingIcon.style.display = 'inline-block'; // Exibe o ícone de loading
    sendButton.disabled = true;

    addMessageToChat('Você', message);
    messageInput.value = '';

    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];

    try {
        // Definir a URL da rota sem contexto
        let route;
        if (currentModel === 'gpt-4') {
            route = '/send-message-gpt-4-no-context';
        } else if (currentModel === 'llama' || currentModel === 'llama3') {
            route = '/send-message-llama-no-context';
        } else {
            throw new Error('Modelo desconhecido');
        }

        // Fazendo a requisição à rota correta
        const response = await fetch(route, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ persona: selectedPersona, message })
        });

        const data = await response.json();
        if (data.reply) {
            addMessageToChat(selectedPersona, data.reply); // Exibe a resposta da persona
        } else {
            addMessageToChat(selectedPersona, 'Desculpe, não consegui processar sua mensagem.');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        addMessageToChat(selectedPersona, 'Ocorreu um erro ao processar sua mensagem.');
    } finally {
        loadingIcon.style.display = 'none'; // Esconde o ícone de loading
        sendButton.disabled = false;
    }
}

function addMessageToChat(sender, message) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'Você' ? 'user' : 'ai');
    messageDiv.innerText = `${sender}: ${message}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Rola automaticamente para a última mensagem
}

function createNewPersona() {
    window.location.href = 'create-persona.html'; // Redireciona para a página de criação de persona
}

function accessUserPersonas() {
    window.location.href = 'user-personas.html'; // Redireciona para a página das personas criadas
}

// Função para redirecionar para a página de geração de imagem
function accessArtPersona() {
    window.location.href = 'artPersona.html'; // Redireciona para a página de geração de imagem
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage(true); // Chama a função para enviar sem contexto
    }
}

// Função para fazer o logout do usuário
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
            window.location.href = 'index.html'; // Redireciona para a página de login (index.html)
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
