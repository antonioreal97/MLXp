// Funções de alerta
function alertSuccess(message) {
    const alertBox = document.getElementById('alertSuccess');
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    setTimeout(() => alertBox.style.display = 'none', 3000);
  }

  function alertWarning(message) {
    const alertBox = document.getElementById('alertWarning');
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    setTimeout(() => alertBox.style.display = 'none', 3000);
  }

  // Efeito parallax para a imagem de fundo
  document.addEventListener('mousemove', function(e) {
    const background = document.querySelector('.background');
    const amountMovedX = (e.clientX / window.innerWidth * 30) - 15;
    const amountMovedY = (e.clientY / window.innerHeight * 30) - 15;
    background.style.transform = `translate(${amountMovedX}px, ${amountMovedY}px) scale(1.05)`;
  });

  // Função para criar uma nova persona
  async function createPersona() {
    const name = document.getElementById('personaName').value;
    const description = document.getElementById('personaDescription').value;
    const image = document.getElementById('personaImage').value || '/images/default.png'; // Define uma imagem padrão se o campo estiver vazio
    const isPublic = document.getElementById('personaPublic').checked; // Verifica se a persona deve ser pública

    if (!name || !description) {
      alertWarning('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      // Obtendo o token CSRF do cookie
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];

      const response = await fetch('/create-persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken // Adicionando o token CSRF ao cabeçalho
        },
        body: JSON.stringify({ name, description, image, public: isPublic }), // Inclui o campo 'public'
      });

      if (response.status === 201) {
        alertSuccess('Persona criada com sucesso!');
        window.location.href = '/user-personas.html'; // Redireciona para a página de personas criadas
      } else {
        const data = await response.json();
        alertWarning('Erro ao criar persona: ' + (data.message || 'Erro desconhecido.'));
      }
    } catch (error) {
      console.error('Erro ao criar persona:', error);
      alertWarning('Erro ao criar persona.');
    }
  }

  // Função para redirecionar quando clicar fora da caixa de criação de persona
  document.getElementById('overlay').addEventListener('click', function() {
    window.location.href = '/personas.html'; // Redireciona para a página personas.html
  });