
    const API_URL = "https://script.google.com/macros/s/AKfycbw-uwGdrzohv57CtzPMu9ZteTCLRKL0cafBVEgxWBDkUNtVt8dpe_SAqURi_AjTzb54/exec";
    const CACHE_LIFETIME = 5 * 60 * 1000;
    const STALE_CACHE_LIFETIME = 24 * 60 * 60 * 1000;
    const REQUEST_TOTAL_TIMEOUT = 60000;
    const REQUEST_ATTEMPTS = 2;
    const params = new URLSearchParams(window.location.search);
    const idSurat = params.get('id')?.trim() || '';
    const kodeSurat = params.get('kode')?.trim() || '';

    const loader = document.getElementById('loader');
    const emptyState = document.getElementById('empty-state');
    const invalidState = document.getElementById('invalid-state');
    const result = document.getElementById('result');
    const surfaceLabel = document.getElementById('surface-label');
    const surfaceId = document.getElementById('surface-id');

    function setText(id, value) {
        document.getElementById(id).textContent = value || '-';
    }

    function hideStates() {
        loader.hidden = true;
        emptyState.hidden = true;
        invalidState.hidden = true;
        result.hidden = true;
    }

    function showData(data) {
        hideStates();
        if (data?.code === 'DUPLICATE_NUMBER') {
            emptyState.hidden = false;
            emptyState.querySelector('.state-title').textContent = 'Nomor ganda.';
            emptyState.querySelector('.state-copy').textContent = 'Nomor surat ini tercatat lebih dari satu kali. Hubungi administrator untuk memperbaiki data resminya.';
            surfaceLabel.textContent = 'Data tidak konsisten';
            return;
        }
        if (!data || !data.ditemukan) {
            emptyState.hidden = false;
            surfaceLabel.textContent = 'Tidak ditemukan';
            return;
        }
        if (kodeSurat && data.terverifikasi === false) {
            invalidState.hidden = false;
            surfaceLabel.textContent = 'Pemeriksaan gagal';
            return;
        }

        const nomor = String(data.nomor || '');
        let typeTitle = 'Dokumen sekolah';
        if (nomor.includes('/SK/')) typeTitle = 'Surat keputusan';
        else if (nomor.includes('/SU/')) typeTitle = 'Surat undangan';
        else if (nomor.includes('/SKet/')) typeTitle = 'Surat keterangan';
        document.getElementById('result-kicker').textContent = typeTitle;
        document.getElementById('result-title').textContent = 'Dokumen terverifikasi';
        setText('document-number', nomor);
        setText('document-date', data.tanggal);
        setText('document-status', data.terverifikasi === false ? 'Kode tidak cocok' : 'Terverifikasi');
        setText('document-subject', data.perihal);
        setText('document-recipient', data.tujuan);
        setText('document-owner', data.pj);
        setText('document-code', data.kodeVerifikasi);
        setText('verification-method', data.metodeVerifikasi || 'Fingerprint data');
        setText('verification-message', data.pesanVerifikasi || 'Nomor ini cocok dengan catatan resmi sekolah.');
        surfaceLabel.textContent = 'Pemeriksaan berhasil';
        result.hidden = false;
    }

    function showNoId() {
        hideStates();
        emptyState.hidden = false;
        emptyState.querySelector('.state-title').textContent = 'Scan dokumen untuk mulai.';
        emptyState.querySelector('.state-copy').textContent = 'Buka tautan verifikasi dari QR pada dokumen resmi untuk melihat catatannya.';
        surfaceLabel.textContent = 'Menunggu nomor';
    }

    async function requestDocument(url) {
        let lastError;
        const deadline = Date.now() + REQUEST_TOTAL_TIMEOUT;
        for (let attempt = 0; attempt < REQUEST_ATTEMPTS; attempt += 1) {
            const remainingTime = deadline - Date.now();
            if (remainingTime <= 0) break;
            const controller = new AbortController();
            const attemptsLeft = REQUEST_ATTEMPTS - attempt;
            const attemptTimeout = Math.min(remainingTime, Math.max(10000, Math.floor(remainingTime / attemptsLeft)));
            const timeoutId = setTimeout(() => controller.abort(), attemptTimeout);
            try {
                const response = await fetch(url, { redirect: 'follow', cache: 'no-store', signal: controller.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (data.code === 'SERVER_ERROR') {
                    const error = new Error(data.pesan || 'Layanan verifikasi sedang tidak tersedia.');
                    error.code = data.code;
                    throw error;
                }
                return data;
            } catch (error) {
                lastError = error.name === 'AbortError' ? Object.assign(new Error('Permintaan melewati batas waktu.'), { name: 'TimeoutError' }) : error;
                if (attempt + 1 < REQUEST_ATTEMPTS && Date.now() < deadline) {
                    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, deadline - Date.now())));
                }
            } finally {
                clearTimeout(timeoutId);
            }
        }
        throw lastError || Object.assign(new Error('Permintaan melewati batas waktu.'), { name: 'TimeoutError' });
    }

    async function loadDocument() {
        if (!idSurat) {
            showNoId();
            return;
        }

        surfaceId.textContent = idSurat;
        const cacheKey = `surat-v4-${idSurat}-${kodeSurat || 'record'}`;
        let cachedRecord;
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey));
            if (cached && Date.now() - cached.savedAt < STALE_CACHE_LIFETIME) {
                cachedRecord = cached;
                showData(cached.data);
                surfaceLabel.textContent = Date.now() - cached.savedAt < CACHE_LIFETIME
                    ? 'Data tersimpan'
                    : 'Memperbarui data';
                if (Date.now() - cached.savedAt < CACHE_LIFETIME) return;
            }
        } catch (error) {
            localStorage.removeItem(cacheKey);
        }

        const query = new URLSearchParams({ id: idSurat });
        if (kodeSurat) query.set('kode', kodeSurat);
        try {
            const data = await requestDocument(`${API_URL}?${query.toString()}`);
            localStorage.setItem(cacheKey, JSON.stringify({ data, savedAt: Date.now() }));
            showData(data);
        } catch (error) {
            if (cachedRecord) {
                surfaceLabel.textContent = 'Data tersimpan';
                return;
            }
            hideStates();
            emptyState.hidden = false;
            const timedOut = error?.name === 'TimeoutError';
            emptyState.querySelector('.state-title').textContent = timedOut ? 'Layanan terlalu lama.' : 'Layanan belum merespons.';
            emptyState.querySelector('.state-copy').textContent = timedOut
                ? 'Server membutuhkan waktu lebih lama dari biasanya. Silakan buka kembali QR dokumen beberapa saat lagi.'
                : 'Data belum dapat dimuat. Periksa koneksi internet lalu coba buka kembali QR dokumen.';
            surfaceLabel.textContent = timedOut ? 'Waktu habis' : 'Permintaan gagal';
        }
    }

    loadDocument();
