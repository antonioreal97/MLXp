function accessMainPage() {
    window.location.href = '/personas.html'; // Redireciona para a página principal de personas
  }

  // Função para obter o token CSRF dos cookies
  function getCSRFToken() {
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='));
    return csrfCookie ? csrfCookie.split('=')[1] : '';
  }

  async function generateImage() {
    const prompt = document.getElementById('imagePrompt').value.trim();
    if (!prompt) {
      alert('Por favor, insira um prompt para gerar a imagem.');
      return;
    }

    const csrfToken = getCSRFToken(); // Obtém o token CSRF dos cookies

    // Exibe o ícone de loading
    document.getElementById('loadingIcon').style.display = 'block';
    document.getElementById('generatedImage').innerHTML = ''; // Limpa a imagem anterior, se houver

    try {
      // Fazendo a chamada ao backend para gerar imagem
      const response = await fetch('/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken, // Inclui o token CSRF no cabeçalho
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorMessage = await response.json();
        alert(`Erro ao gerar a imagem: ${errorMessage.message}`);
        return;
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      // Adiciona um timestamp para evitar problemas de cache
      const timestamp = new Date().getTime();
      const fullImageUrl = `${imageUrl}?timestamp=${timestamp}`;

      // Atualiza a div para exibir a imagem gerada
      document.getElementById('generatedImage').innerHTML = `<img src="${fullImageUrl}" alt="Imagem gerada" class="img-fluid"/>`;

    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      alert('Erro ao gerar imagem. Por favor, tente novamente.');
    } finally {
      // Oculta o ícone de loading após a conclusão
      document.getElementById('loadingIcon').style.display = 'none';
    }
  }

  window.onload = () => {
    // Carrega o nome do usuário logado ao carregar a página
    fetch('/get-logged-user')
      .then(response => {
        if (response.status === 401) {
          window.location.href = '/'; 
        }
        return response.json();
      })
      .then(data => {
        document.getElementById('username').innerText = data.username || 'Desconhecido';
      })
      .catch(error => {
        console.error('Erro ao carregar o nome do usuário:', error);
        document.getElementById('username').innerText = 'Erro';
      });
  };