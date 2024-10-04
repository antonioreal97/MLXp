// Função de login
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!username || !password) {
    alert('Por favor, preencha todos os campos para o login.');
    return;
  }

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.status === 200) {
      window.location.href = data.redirectUrl;
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Erro ao realizar o login:', error);
    alert('Ocorreu um erro ao tentar fazer login.');
  }
}

// Função de registro
async function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const email = document.getElementById('email').value;

  if (!username || !password || !email) {
    alert('Por favor, preencha todos os campos para o cadastro.');
    return;
  }

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password, email })
    });

    const data = await response.json();
    alert(data.message);

    if (response.status === 201) {
      window.location.href = '/login.html';
    }

  } catch (error) {
    console.error('Erro ao realizar o cadastro:', error);
    alert('Ocorreu um erro ao tentar realizar o cadastro.');
  }
}
