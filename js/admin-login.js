document.querySelector('[data-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';
  try {
    const { data } = await API.post('/api/admin/login', { password: e.target.password.value });
    localStorage.setItem('adminToken', data.token);
    window.location.href = './';
  } catch (err) {
    const field = document.querySelector('[data-field="password"]');
    field.classList.add('invalid');
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
});
