document.addEventListener('DOMContentLoaded', () => {
    const verifyForm = document.getElementById('verifyForm');
    const emailInput = document.getElementById('email');

    // 1. Kayıt sayfasından yönlendirilen email'i localStorage'dan al
    const emailForVerification = localStorage.getItem('emailForVerification');

    if (!emailForVerification) {
        alert('Doğrulama yapılacak kullanıcı bulunamadı. Lütfen tekrar kayıt olun.');
        window.location.href = '/register.html';
        return;
    }

    emailInput.value = emailForVerification;

    // 2. Form gönderildiğinde
    verifyForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = emailInput.value;

        // --- GÜNCELLENDİ ---
        // Kullanıcının girdiği koddaki olası boşlukları temizle
        const code = document.getElementById('code').value.trim();
        // --- GÜNCELLEME SONU ---

        if (!code) {
            alert('Lütfen doğrulama kodunu girin.');
            return;
        }

        try {
            const response = await fetch('/api/verify-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, code: code })
            });

            const data = await response.json();

            if (data.success) {
                // DOĞRULAMA BAŞARILI!
                localStorage.setItem('token', data.token);
                localStorage.removeItem('emailForVerification');
                alert('Telefon numaranız başarıyla doğrulandı. Panele yönlendiriliyorsunuz.');
                window.location.href = '/dashboard.html';
            } else {
                alert('Doğrulama Başarısız: ' + data.message);
            }

        } catch (error) {
            console.error('Doğrulama fetch hatası:', error);
            alert('Sunucuya bağlanırken bir hata oluştu.');
        }
    });
});

