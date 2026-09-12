const API_URL = 'https://script.google.com/macros/s/AKfycbwIzQlz_v2HPai2eRfnd24BZ8JYNo5ybq-iw99gga9cv3aeeypiOLi4z8pYf_r8hpf7/exec';
const SESSION_COOKIE = 'vrai_session';
let sessionToken = null;

const dashboardView = document.getElementById('dashboard-view');
const letterForm = document.getElementById('letter-form');
const letterMessage = document.getElementById('letter-message');
const logoutButton = document.getElementById('logout-button');
const sheetSelect = document.getElementById('sheet');
const resultPanel = document.getElementById('result-panel');

function showMessage(element, message) {
    element.textContent = message || '';
    element.hidden = !message;
}

function setBusy(button, busy) {
    button.disabled = busy;
    button.dataset.originalText ||= button.textContent;
    button.textContent = busy ? 'Memproses...' : button.dataset.originalText;
}

function setSessionCookie(token) {
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Secure; SameSite=Lax`;
}

function getSessionCookie() {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${SESSION_COOKIE}=`));
    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null;
}

function clearSessionCookie() {
    document.cookie = `${SESSION_COOKIE}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
}

async function request(payload) {
    if (!API_URL || API_URL.startsWith('PASTE_')) throw new Error('URL Google Apps Script belum dikonfigurasi.');
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Server tidak dapat dihubungi.');
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Permintaan tidak dapat diproses.');
    return data;
}

function showDashboard(data) {
    dashboardView.hidden = false;
    logoutButton.hidden = false;
    document.getElementById('session-user').textContent = data.username;
    sheetSelect.replaceChildren(...data.sheets.map((sheet) => {
        const option = document.createElement('option');
        option.value = sheet.name;
        option.textContent = `${sheet.code} - ${sheet.label}`;
        return option;
    }));
}

async function checkSession() {
    const cookieToken = getSessionCookie();
    if (!cookieToken) return redirectToPortal();
    try {
        sessionToken = cookieToken;
        showDashboard(await request({ action: 'session', token: sessionToken }));
    } catch (error) {
        sessionToken = null;
        clearSessionCookie();
        redirectToPortal();
    }
}

function redirectToPortal() {
    window.location.replace('/?next=' + encodeURIComponent('/vrai-management/'));
}

letterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(letterMessage, '');
    resultPanel.hidden = true;
    const button = letterForm.querySelector('button[type="submit"]');
    setBusy(button, true);
    const formData = new FormData(letterForm);
    try {
        const data = await request({
            action: 'create',
            token: sessionToken,
            sheet: formData.get('sheet'),
            date: formData.get('date'),
            subject: formData.get('subject'),
            destination: formData.get('destination'),
            personInCharge: formData.get('personInCharge'),
            notes: formData.get('notes')
        });
        document.getElementById('result-number').textContent = data.number;
        document.getElementById('result-sheet').textContent = `Sheet ${data.sheet} | Baris ${data.row}`;
        document.getElementById('result-url').value = data.qrUrl;
        document.getElementById('result-qr').src = `https://quickchart.io/qr?text=${encodeURIComponent(data.qrUrl)}&size=240`;
        resultPanel.hidden = false;
        requestAnimationFrame(() => {
            resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            resultPanel.focus({ preventScroll: true });
        });
    } catch (error) {
        if (error.message.includes('Sesi')) {
            sessionToken = null;
            clearSessionCookie();
            redirectToPortal();
        }
        showMessage(letterMessage, error.message);
    } finally {
        setBusy(button, false);
    }
});

document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const source = document.getElementById(button.dataset.copy);
    const text = source.value || source.textContent;
    try {
        await navigator.clipboard.writeText(text);
        const original = button.textContent;
        button.textContent = 'Tersalin';
        setTimeout(() => { button.textContent = original; }, 1200);
    } catch (error) {
        showMessage(letterMessage, 'Penyalinan gagal. Salin secara manual.');
    }
});

logoutButton.addEventListener('click', async () => {
    const token = sessionToken;
    sessionToken = null;
    clearSessionCookie();
    try { await request({ action: 'logout', token }); } catch (error) { /* Local logout still succeeds. */ }
    window.location.replace('/');
});

checkSession();
