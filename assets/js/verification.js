
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
    const retryButton = document.getElementById('retry-button');

    function setText(id, value) {
        document.getElementById(id).textContent = value || '-';
    }

    function hideStates() {
        loader.hidden = true;
        emptyState.hidden = true;
        invalidState.hidden = true;
        result.hidden = true;
        retryButton.hidden = true;
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
        if (data?.code === 'INVALID_FORMAT' || data?.code === 'ID_TOO_LONG') {
            emptyState.hidden = false;
            emptyState.querySelector('.state-title').textContent = 'Nomor tidak valid.';
            emptyState.querySelector('.state-copy').textContent = data.pesan || 'Format nomor surat tidak sesuai.';
            surfaceLabel.textContent = 'Format tidak valid';
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
                if (!response.ok) {
                    const error = new Error(`HTTP ${response.status}`);
                    error.name = 'HttpError';
                    throw error;
                }
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
        const cacheKey = `surat-v5-${idSurat}-${kodeSurat || 'record'}`;
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
                retryButton.hidden = false;
                return;
            }
            hideStates();
            emptyState.hidden = false;
            const timedOut = error?.name === 'TimeoutError';
            const serverError = error?.code === 'SERVER_ERROR' || error?.name === 'HttpError';
            const offline = error?.name === 'TypeError';
            emptyState.querySelector('.state-title').textContent = timedOut
                ? 'Layanan terlalu lama.'
                : serverError ? 'Layanan sedang bermasalah.' : offline ? 'Koneksi tidak tersedia.' : 'Permintaan gagal.';
            emptyState.querySelector('.state-copy').textContent = timedOut
                ? 'Server membutuhkan waktu lebih lama dari biasanya. Coba ulangi beberapa saat lagi.'
                : serverError ? 'Server verifikasi sedang tidak dapat memproses permintaan. Coba lagi nanti.'
                    : offline ? 'Periksa koneksi internet, lalu coba ulangi pemeriksaan.'
                        : 'Data belum dapat dimuat. Coba ulangi pemeriksaan.';
            surfaceLabel.textContent = timedOut ? 'Waktu habis' : serverError ? 'Server bermasalah' : offline ? 'Tidak terhubung' : 'Permintaan gagal';
            retryButton.hidden = false;
        }
    }

    retryButton.addEventListener('click', async () => {
        retryButton.disabled = true;
        await loadDocument();
        retryButton.disabled = false;
    });

    loadDocument();
