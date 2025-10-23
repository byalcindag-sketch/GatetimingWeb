document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');

    // 1. Çıkış Yap Butonu İşlevi
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault(); // Linkin varsayılan davranışını engelle
            localStorage.removeItem('token'); // Token'ı sil
            window.location.href = '/'; // Giriş sayfasına yönlendir
        });
    }

    // 2. Token Kontrolü
    if (!token) {
        // Token yoksa, kullanıcı giriş yapmamıştır. Giriş sayfasına at.
        window.location.href = '/';
        return; // Kodun devamının çalışmasını engelle
    }

    // 3. Token Varsa, Kullanıcı Bilgilerini Çek
    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Token'ı başlığa ekliyoruz
            }
        });

        const data = await response.json();

        if (data.success) {
            // Başarılı! Hoş geldiniz mesajını güncelle.
            if (welcomeMessage) {
                welcomeMessage.textContent = `Hoş Geldiniz, ${data.user.email}!`;
            }
        } else {
            // Token geçersiz veya süresi dolmuş.
            localStorage.removeItem('token'); // Geçersiz token'ı sil
            alert('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
            window.location.href = '/'; // Giriş sayfasına at
        }
    } catch (error) {
        console.error('Profil alınırken hata:', error);
        localStorage.removeItem('token');
        window.location.href = '/'; // Bir hata olursa güvenli çıkış yap
    }
});
