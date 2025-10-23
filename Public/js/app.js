/*
  Bu dosya, Gatetiming projesinin frontend (tarayıcı) tarafı
  JavaScript mantığını (Dil, Kayıt, Giriş) içerir.
*/

document.addEventListener('DOMContentLoaded', () => {

    // === BÖLÜM 1: DİL DEĞİŞTİRME MANTIĞI ===
    const languageSwitcher = document.querySelector('.lang-switcher');

    const setLanguage = (lang) => {
        if (typeof translations === 'undefined') {
            console.error('Hata: translations.js dosyası yüklenemedi.');
            return;
        }

        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.dataset.key;
            if (translations[lang] && translations[lang][key]) {
                const translation = translations[lang][key];
                if (element.placeholder !== undefined) {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        const titleElement = document.querySelector('title');
        if (titleElement) {
            const titleKey = titleElement.dataset.key;
            if (titleKey && translations[lang] && translations[lang][titleKey]) {
                document.title = translations[lang][titleKey];
            }
        }

        if (languageSwitcher) {
            const activeButton = languageSwitcher.querySelector('button.active');
            if (activeButton) activeButton.classList.remove('active');
            const newActiveButton = languageSwitcher.querySelector(`button[data-lang='${lang}']`);
            if (newActiveButton) newActiveButton.classList.add('active');
        }
    };

    window.setLanguage = setLanguage;
    const currentActiveLang = languageSwitcher ? (languageSwitcher.querySelector('button.active') ? languageSwitcher.querySelector('button.active').dataset.lang : 'tr') : 'tr';
    setLanguage(currentActiveLang);


    // === BÖLÜM 2: KAYIT FORMU MANTIĞI (intl-tel-input ile güncellendi) ===

    const kayitFormu = document.getElementById('kayitFormu');
    const phoneInput = document.querySelector("#phone"); // Telefon input'unu seç
    let phoneInputInstance = null; // Telefon kütüphanesi örneğini (instance) tutmak için

    // Eğer sayfada kayıt formu ve telefon input'u varsa (yani register.html'de isek)
    if (kayitFormu && phoneInput) {

        // Telefon kütüphanesini başlat
        phoneInputInstance = window.intlTelInput(phoneInput, {
            initialCountry: "tr", // Varsayılan olarak Türkiye bayrağı ile başla
            nationalMode: false, // Ülke kodunu (+90) her zaman göster
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js", // Gerekli yardımcı script
        });

        // Kayıt formu gönderildiğinde
        kayitFormu.addEventListener('submit', async (event) => {
            event.preventDefault(); // Formun sayfayı yenilemesini engelle

            // 1. Kütüphaneden numaranın geçerli olup olmadığını kontrol et
            if (!phoneInputInstance.isValidNumber()) {
                alert('Lütfen geçerli bir telefon numarası girin.');
                return; // Geçersizse işlemi durdur
            }

            // 2. Kütüphaneden tam uluslararası numarayı al (örn: +90532...)
            // Sunucumuz + işaretini istemiyordu, onu 90 ile değiştirelim.
            // Önce tam numarayı al: +90532...
            let phone = phoneInputInstance.getNumber();
            // Sonra başındaki + işaretini kaldır: 90532...
            if (phone.startsWith('+')) {
                phone = phone.substring(1);
            }

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Sunucuya gönderilecek JSON verisini hazırla
            const kayitVerisi = { email, phone, password };

            try {
                // Sunucuya /api/register adresine POST isteği gönder
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(kayitVerisi)
                });
                const data = await response.json(); // Sunucudan gelen cevabı oku

                if (data.success) {
                    // Kayıt başarılıysa (veya "zaten kayıtlı ama onaysız" ise)
                    // Kullanıcının email'ini tarayıcıda sakla (verify.html'de kullanmak için)
                    localStorage.setItem('emailForVerification', email);
                    alert(data.message); // Sunucudan gelen mesajı göster (örn: "Yeni kod gönderdik")
                    window.location.href = '/verify.html'; // Doğrulama sayfasına yönlendir
                } else {
                    alert('Kayıt Başarısız: ' + data.message);
                }
            } catch (error) {
                console.error('Kayıt fetch hatası:', error);
                alert('Sunucuya bağlanırken bir hata oluştu.');
            }
        });
    }


    // === BÖLÜM 3: GİRİŞ FORMU MANTIĞI (2. adım doğrulamaya yönlendirecek şekilde güncellendi) ===

    const loginFormu = document.getElementById('loginFormu');

    // Eğer sayfada giriş formu varsa (yani login.html'de isek)
    if (loginFormu) {
        loginFormu.addEventListener('submit', async (event) => {
            event.preventDefault(); // Formun sayfayı yenilemesini engelle

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginVerisi = { email, password };

            try {
                // Sunucuya /api/login adresine POST isteği gönder
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginVerisi)
                });
                const data = await response.json(); // Sunucudan gelen cevabı oku

                if (data.success) {
                    // GİRİŞ BAŞARILI (ADIM 1)
                    // (Sunucu şifrenin doğru olduğunu onayladı ve kod gönderdi)

                    // Email'i tarayıcıda sakla (verify.html'de kullanmak için)
                    localStorage.setItem('emailForVerification', email);
                    alert('Giriş bilgileri doğru. Lütfen WhatsApp\'ınıza gelen 2. adım doğrulama kodunu girin.');
                    window.location.href = '/verify.html'; // Doğrulama sayfasına yönlendir
                } else {
                    alert('Giriş Başarısız: ' + data.message);
                }
            } catch (error) {
                console.error('Giriş fetch hatası:', error);
                alert('Sunucuya bağlanırken bir hata oluştu.');
            }
        });
    }
});

