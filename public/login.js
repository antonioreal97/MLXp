async function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const email = document.getElementById('email').value;

  if (!username || !password || !email) {
    alert('Por favor, preencha todos os campos para o cadastro.');
    return;
  }

  const response = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email })
  });

  const data = await response.json();
  alert(data.message);
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!username || !password) {
    alert('Por favor, preencha todos os campos para o login.');
    return;
  }

  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  if (response.status === 200) {
    // Redireciona para a página de personas se o login for bem-sucedido
    window.location.href = data.redirectUrl;
  } else {
    alert(data.message);
  }
}
