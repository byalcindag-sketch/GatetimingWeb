document.addEventListener('DOMContentLoaded', async () => {
    // === 1. GEREKLİ ELEMENTLERİ SEÇME ===
    const token = localStorage.getItem('token');
    const welcomeHeader = document.getElementById('welcome-header');
    const welcomeEmail = document.getElementById('welcome-email');
    const logoutButton = document.getElementById('logout-button');
    const profileForm = document.getElementById('profileForm');
    const phoneStatusBadge = document.querySelector('#phone-status .status-badge');
    const emailStatusBadge = document.querySelector('#email-status .status-badge');


    // === 2. ÇIKIŞ YAP VE TOKEN KONTROLÜ ===
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    if (!token) {
        window.location.href = '/';
        return;
    }

    // === 3. KULLANICI BİLGİLERİNİ SUNUCUDAN ÇEKME VE EKRANA YERLEŞTİRME ===
    try {
        const response = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            const user = data.user;

            // Karşılama mesajlarını doldur
            welcomeHeader.textContent = `Hoş Geldin, ${user.firstName || 'Kullanıcı'}!`;
            welcomeEmail.textContent = user.email;

            // Form alanlarını doldur (eğer veri varsa)
            document.getElementById('firstName').value = user.firstName || '';
            document.getElementById('lastName').value = user.lastName || '';
            document.getElementById('nationalId').value = user.nationalId || '';

            // Doğrulama durumlarını güncelle
            if (user.isPhoneVerified) {
                phoneStatusBadge.textContent = 'Doğrulandı';
                phoneStatusBadge.classList.add('verified');
            } else {
                phoneStatusBadge.textContent = 'Doğrulanmadı';
                phoneStatusBadge.classList.add('unverified');
            }

            if (user.isEmailVerified) {
                emailStatusBadge.textContent = 'Doğrulandı';
                emailStatusBadge.classList.add('verified');
            } else {
                emailStatusBadge.textContent = 'Doğrulanmadı';
                emailStatusBadge.classList.add('unverified');
            }

        } else {
            // Token geçersizse kullanıcıyı dışarı at
            localStorage.removeItem('token');
            alert('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Profil alınırken hata:', error);
        localStorage.removeItem('token');
        window.location.href = '/';
    }

    // === 4. PROFİL GÜNCELLEME FORMU MANTIĞI ===
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Formun sayfayı yenilemesini engelle

        // Formdaki güncel verileri al
        const updatedData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            nationalId: document.getElementById('nationalId').value
        };

        // Sunucuya göndermek için token'ı al
        const token = localStorage.getItem('token');

        try {
            // Sunucuya PUT isteği gönder
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Kimlik doğrulama için token'ı ekle
                },
                body: JSON.stringify(updatedData) // Güncel verileri JSON formatında gönder
            });

            const result = await response.json();

            if (result.success) {
                alert(result.message); // Başarılı mesajını göster

                // Hoş geldin mesajını da yeni ad ile güncelle
                const welcomeHeader = document.getElementById('welcome-header');
                if (updatedData.firstName) {
                    welcomeHeader.textContent = `Hoş Geldin, ${updatedData.firstName}!`;
                }

            } else {
                // Sunucudan gelen hata mesajını göster
                alert('Güncelleme Başarısız: ' + result.message);
            }

        } catch (error) {
            console.error('Profil güncelleme fetch hatası:', error);
            alert('Sunucuya bağlanırken bir hata oluştu.');
        }
    });
});