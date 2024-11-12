// Função para ajustar a intensidade do efeito flutuante
function intensifyFloatEffect() {
  const username = document.getElementById('username').value.length;
  const password = document.getElementById('password').value.length;
  const logo = document.getElementById('logo');

  // Soma dos caracteres inseridos
  const totalLength = username + password;

  // Defina o intervalo de intensidade de 10s (padrão) até 3s (intensidade máxima)
  let animationDuration = 10 - Math.min(totalLength / 3, 6); // Intensifica conforme a digitação
  logo.style.animationDuration = `${animationDuration}s`;
}

// Efeito parallax para a imagem de fundo
document.addEventListener('mousemove', function(e) {
  const background = document.querySelector('.background');
  const amountMovedX = (e.clientX / window.innerWidth * 30) - 15;
  const amountMovedY = (e.clientY / window.innerHeight * 30) - 15;
  background.style.transform = `translate(${amountMovedX}px, ${amountMovedY}px) scale(1.05)`;
});

document.querySelector('.overlay').addEventListener('click', function() {
  window.location.href = 'index.html';
});

let isRegistering = false;

function toggleRegister() {
  const emailField = document.getElementById('email');
  const registerButton = document.querySelector('.btn-register');
  const loginButton = document.querySelector('.btn-login');

  if (!isRegistering) {
      emailField.style.display = 'block';
      registerButton.innerText = 'FINALIZAR CADASTRO';
      loginButton.style.display = 'none';
      isRegistering = true;
  } else {
      register();
  }
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];

  if (!username || !password) {
      alert-warning('Por favor, preencha todos os campos de login.');
      return;
  }

  toggleButtonLoading('btn-login', true);

  try {
      const response = await fetch('/login', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'CSRF-Token': csrfToken
          },
          body: JSON.stringify({ username, password })
      });

      if (response.ok) {
          const data = await response.json();
          window.location.href = data.redirectUrl;
      } else {
          const data = await response.json();
          alert(data.message);
      }
  } catch (error) {
      console.error('Erro ao realizar o login:', error);
      alert-warning('Ocorreu um erro ao tentar fazer login.');
  } finally {
      toggleButtonLoading('btn-login', false);
  }
}

async function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const email = document.getElementById('email').value;
  const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN=')).split('=')[1];

  if (!username || !password || !email) {
      alert-warning('Por favor, preencha todos os campos para realizar o cadastro.');
      return;
  }

  toggleButtonLoading('btn-register', true);

  try {
      const response = await fetch('/register', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'CSRF-Token': csrfToken
          },
          body: JSON.stringify({ username, password, email })
      });

      if (response.ok) {
          alert-success('Cadastro realizado com sucesso!');
          resetToLogin();
      } else {
          const data = await response.json();
          alert(data.message);
      }
  } catch (error) {
      console.error('Erro ao realizar o cadastro:', error);
      alert-warning('Ocorreu um erro ao tentar realizar o cadastro.');
  } finally {
      toggleButtonLoading('btn-register', false);
  }
}

function toggleButtonLoading(buttonClass, isLoading) {
  const button = document.querySelector(`.${buttonClass}`);
  if (!button) return;

  const icon = button.querySelector('.loading-icon');
  if (!icon) return;

  if (isLoading) {
      button.classList.add('disabled', 'loading');
      icon.style.display = 'block';
  } else {
      button.classList.remove('disabled', 'loading');
      icon.style.display = 'none';
  }
}

function resetToLogin() {
  const emailField = document.getElementById('email');
  const registerButton = document.querySelector('.btn-register');
  const loginButton = document.querySelector('.btn-login');

  emailField.style.display = 'none';
  registerButton.innerText = 'CADASTRO';
  loginButton.style.display = 'block';
  isRegistering = false;

  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('email').value = '';
}
