let selectedPersona = '';
const defaultPersonaImage = 'images/persona-main.png';
let currentModel = 'llama'; // Modelo padrão inicial

function loadLoggedUser() {
    fetch('/get-logged-user')
    .then(response => response.json())
    .then(data => {
        document.getElementById('username').innerText = data.username || 'Desconhecido';
        loadUserPersonas(data.username); // Carregar personas do usuário
    })
    .catch(error => {
        console.error('Erro ao carregar o nome do usuário:', error);
        document.getElementById('username').innerText = 'Erro';
    });
}

async function loadUserPersonas(username) {
    try {
        const response = await fetch(`/user-personas/${encodeURIComponent(username)}`);
        const personas = await response.json();
        const personaList = document.getElementById('personaList');

        personaList.innerHTML = '';

        personas.forEach((persona) => {
            const personaWrapper = document.createElement('div');
            personaWrapper.classList.add('persona-wrapper');

            const circle = document.createElement('div');
            circle.classList.add('persona-circle');

            const img = document.createElement('img');
            img.src = persona.image || 'images/default-persona.png';
            img.alt = persona.name;
            img.classList.add('persona-image');

            const name = document.createElement('div');
            name.classList.add('persona-name');
            name.textContent = persona.name;

            circle.appendChild(img);
            personaWrapper.appendChild(circle);
            personaWrapper.appendChild(name);

            personaWrapper.onclick = () => selectPersona(persona.name, persona.image);

            personaList.appendChild(personaWrapper);
        });
    } catch (error) {
        console.error('Erro ao carregar personas:', error);
    }
}

function selectPersona(personaName, personaImage) {
    selectedPersona = personaName;
    document.getElementById('selectedPersonaName').innerText = personaName;
    document.getElementById('selectedPersonaImage').style.backgroundImage = `url(${personaImage || defaultPersonaImage})`;
    document.getElementById('selectedPersonaImage').style.backgroundSize = 'cover';

    loadPersonaHistory(personaName); // Carregar histórico e descrição
    loadPersonaDescription(personaName);
}

// Função para carregar o histórico de conversa da persona do arquivo do usuário
async function loadPersonaHistory(personaName) {
    try {
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];
        const response = await fetch(`/load-persona-history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ persona: personaName })
        });

        const data = await response.json();

        const chatBox = document.getElementById('chatBox');
        chatBox.innerHTML = ''; // Limpa o chat antes de carregar

        // Obter o nome do usuário logado
        const username = document.getElementById('username').innerText;

        // Substituir 'user' e 'assistant' por nomes apropriados e aplicar estilos
        data.history.forEach(entry => {
            let sender = entry.role;

            if (sender === 'user') {
                sender = username; // Nome do usuário logado
                addMessageToChat(sender, entry.content, 'user');
            } else if (sender === 'assistant') {
                sender = personaName; // Nome da persona selecionada
                addMessageToChat(sender, entry.content, 'ai');
            }
        });
    } catch (error) {
        console.error('Erro ao carregar histórico da persona:', error);
    }
}

// Função para adicionar mensagens ao chat com estilo condicional
function addMessageToChat(sender, message, senderType) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', senderType === 'user' ? 'user' : 'ai'); // Classe de estilo com base no remetente
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`; // Usar innerHTML para preservar estilo e formatação
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Função para carregar a descrição da persona de `historico-chat.json`
async function loadPersonaDescription(personaName) {
    try {
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];
        const response = await fetch('/load-persona-description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ persona: personaName })
        });

        const data = await response.json();

        if (data.description) {
            document.getElementById('personaDescription').innerText = data.description;
        } else {
            // Gera uma nova descrição se não estiver disponível
            await generatePersonaDescription(personaName);
        }
    } catch (error) {
        console.error('Erro ao carregar descrição da persona:', error);
    }
}

// Função para gerar e salvar a descrição da persona usando o modelo selecionado
async function generatePersonaDescription(personaName) {
    try {
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];
        const model = currentModel || 'llama'; // Usa o modelo selecionado ou define como 'llama' por padrão

        const response = await fetch('/generate-description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ persona: personaName, model })
        });

        const data = await response.json();
        const description = data.description || 'Descrição não disponível.';
        document.getElementById('personaDescription').innerText = description;

        // Salvar a descrição gerada no `historico-chat.json`
        await fetch('/save-persona-description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ persona: personaName, description })
        });
    } catch (error) {
        console.error('Erro ao gerar a descrição da persona:', error);
    }
}

// Função para enviar uma mensagem à persona
async function sendMessage() {
    const messageInput = document.getElementById('userMessage');
    const message = messageInput.value.trim();
    const loadingIcon = document.getElementById('loadingIcon');
    const sendButton = document.querySelector('button');
    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];

    if (message === '' || selectedPersona === '') {
        alert('Por favor, selecione uma persona e digite uma mensagem.');
        return;
    }

    loadingIcon.style.display = 'inline-block';
    sendButton.disabled = true;

    addMessageToChat('Você', message);
    messageInput.value = '';

    try {
        const route = currentModel === 'gpt-4' ? '/send-message-gpt-4' : '/send-message-llama';
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
            addMessageToChat(selectedPersona, data.reply);

            // Salva a mensagem e resposta no histórico
            saveMessageToHistory(selectedPersona, 'Você', message);
            saveMessageToHistory(selectedPersona, selectedPersona, data.reply);
        } else {
            addMessageToChat(selectedPersona, 'Desculpe, não consegui processar sua mensagem.');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        addMessageToChat(selectedPersona, 'Ocorreu um erro ao processar sua mensagem.');
    } finally {
        loadingIcon.style.display = 'none';
        sendButton.disabled = false;
    }
}

// Função para adicionar mensagens ao chat
function addMessageToChat(sender, message) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'Você' ? 'user' : 'ai');
    messageDiv.innerText = `${sender}: ${message}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Função para salvar mensagens no histórico
async function saveMessageToHistory(personaName, sender, message) {
    try {
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];
        await fetch('/save-message-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                persona: personaName,
                sender,
                message
            })
        });
    } catch (error) {
        console.error('Erro ao salvar mensagem no histórico:', error);
    }
}

// Função para limpar o histórico de conversa com a persona selecionada
async function clearPersonaHistory() {
    if (!selectedPersona) {
        alert('Por favor, selecione uma persona para limpar o histórico.');
        return;
    }

    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];
    
    try {
        const response = await fetch('/clear-persona-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ persona: selectedPersona })
        });

        if (response.ok) {
            alert('Histórico de conversa limpo com sucesso.');
            document.getElementById('chatBox').innerHTML = ''; // Limpa o chat visualmente
            document.getElementById('personaDescription').innerText = 'Selecione uma persona para ver a descrição...';
        } else {
            alert('Erro ao limpar o histórico de conversa.');
        }
    } catch (error) {
        console.error('Erro ao limpar histórico de conversa:', error);
    }
}

// Função para alternar o modelo (GPT-4 ou Llama)
function changeModel() {
    const modelSelect = document.getElementById('modelSelect');
    currentModel = modelSelect.value === 'gpt-4' ? 'gpt-4' : 'llama';
    document.getElementById('model-name').innerText = currentModel === 'gpt-4' ? 'GPT-4' : 'LLAMA3';
}

// Redireciona para a página de edição de personas
function redirectToEdit() {
    window.location.href = 'edit-personas.html';
}

// Retorna para a página de lista de personas
function returnToPersonas() {
    window.location.href = 'personas.html';
}

// Envia mensagem ao pressionar Enter
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Função para fazer o logout do usuário
async function logoutUser() {
    try {
        const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='));
        if (!csrfCookie) {
            alert('Erro: Token CSRF não encontrado. Atualize a página e tente novamente.');
            return;
        }
        
        const csrfToken = csrfCookie.split('=')[1];
        
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
        alert('Erro ao tentar fazer logout. Verifique sua conexão com o servidor.');
    }
}

window.onload = function() {
    loadLoggedUser();
};
