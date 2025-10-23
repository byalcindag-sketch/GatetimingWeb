// 1. Gerekli Paketleri Yükle
require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize'); // Sequelize'yi ve Gerekli Tipleri Yükle

// 2. Uygulama ve Port Ayarları
const app = express();
const PORT = 3000;

// 3. Middleware (Ara Yazılımlar)
app.use(express.json());
app.use(express.static('public'));

// === VERİTABANI BAĞLANTISI (server.js içine taşındı) ===
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'gatetiming.sqlite')
});

// === KULLANICI MODELİ (server.js içine taşındı) ===
const User = sequelize.define('User', {

    firstName: {
        type: DataTypes.STRING,
        allowNull: true // Başlangıçta boş olabilir
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nationalId: {
        type: DataTypes.STRING,
        allowNull: true,
        // unique: true // Gerekirse TC Kimlik No'yu eşsiz yapabilirsiniz
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPhoneVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    phoneVerificationCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phoneVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    // Diğer model seçenekleri
});
// ==================================================


// 4. Yardımcı Fonksiyon: WhatsApp Kodu Gönderme
async function sendWhatsAppCode(phoneNumber, code) {
    const serviceUrl = 'http://84.51.58.178:4001/send-message';
    const message = `GatetimingWeb doğrulama kodunuz: ${code}`;

    // Not: Telefon formatlama (90 ekleme) mantığı kaldırıldı.
    // Artık intl-tel-input kütüphanesinden +90... formatında alacağız.
    console.log(`WhatsApp servisine istek gönderiliyor: ${phoneNumber} -> ${message}`);

    try {
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: phoneNumber, // +90532... formatında olmalı
                message: message
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`WhatsApp servis hatası: ${response.status} - ${errorBody}`);
            throw new Error('WhatsApp servisi mesajı gönderemedi.');
        }

        const data = await response.json();
        console.log('WhatsApp servis yanıtı:', data);
        return true;

    } catch (error) {
        console.error('WhatsApp servisine bağlanırken HATA oluştu:', error.message);
        throw error;
    }
}

// 5. Ana (Korumasız) Rotalar
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 6. API Rotaları (Kimlik Doğrulama)

// === YENİ KULLANICI KAYIT ===
// (Bu akışta değişiklik yok, sadece telefon numarası artık +90... formatında gelecek)
app.post('/api/register', async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const newUser = await User.create({
            email: email,
            phone: phone,
            password: hashedPassword,
            phoneVerificationCode: verificationCode,
            phoneVerificationExpires: expiresAt,
            isPhoneVerified: false
        });

        await sendWhatsAppCode(newUser.phone, verificationCode);

        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı! Doğrulama kodu gönderildi.'
        });

    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            try {
                const { email, phone } = req.body;
                const existingUser = await User.findOne({
                    where: { [Op.or]: [{ email: email }, { phone: phone }] }
                });

                if (!existingUser) {
                    throw new Error('Kullanıcı bulunamadı ama Unique hatası alındı.');
                }
                if (existingUser.isPhoneVerified) {
                    return res.status(400).json({ success: false, message: 'Bu e-posta adresi veya telefon numarası zaten kullanılıyor.' });
                }

                console.log('Mevcut ama onaysız kullanıcı. Yeni kod gönderiliyor...');
                const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                const newExpires = new Date(Date.now() + 10 * 60 * 1000);
                existingUser.phoneVerificationCode = newCode;
                existingUser.phoneVerificationExpires = newExpires;

                // Not: Şifreyi veya telefonu burada GÜNCELLEMİYORUZ. 
                // Kullanıcıyı sadece doğrulamaya yönlendiriyoruz.
                await existingUser.save();
                await sendWhatsAppCode(existingUser.phone, newCode);

                return res.status(200).json({
                    success: true,
                    message: 'Bu hesap zaten mevcut ancak doğrulanmamış. Size yeni bir doğrulama kodu gönderdik.'
                });
            } catch (innerError) {
                console.error('Yeniden kod gönderme hatası:', innerError);
                return res.status(500).json({ success: false, message: 'Sunucu hatası (kod yeniden gönderilemedi).' });
            }
        }

        console.error('Kayıt sırasında genel hata:', error);
        let errorMessage = 'Sunucu tarafında bir hata oluştu.';
        if (error.message.includes('WhatsApp')) {
            errorMessage = 'Doğrulama mesajı gönderilemedi. Lütfen tekrar deneyin.';
        }
        res.status(500).json({ success: false, message: errorMessage });
    }
});

// === TELEFON DOĞRULAMA ===
// (Bu akışta değişiklik yok, hem kayıt hem de giriş için çalışacak)
app.post('/api/verify-phone', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const isCodeExpired = new Date() > user.phoneVerificationExpires;
        if (isCodeExpired) {
            return res.status(400).json({ success: false, message: 'Doğrulama kodunun süresi dolmuş.' });
        }

        const dbCode = user.phoneVerificationCode;
        const formCode = code;
        console.log('--- KOD KARŞILAŞTIRMA ---');
        console.log(`Veritabanındaki Kod: '${dbCode}' (Tipi: ${typeof dbCode})`);
        console.log(`Formdan Gelen Kod  : '${formCode}' (Tipi: ${typeof formCode})`);

        const isCodeValid = dbCode === formCode;
        if (!isCodeValid) {
            console.log('Sonuç: Kodlar EŞLEŞMEDİ.');
            console.log('--------------------------');
            return res.status(400).json({ success: false, message: 'Geçersiz doğrulama kodu.' });
        }

        console.log('Sonuç: Kodlar EŞLEŞTİ. Kullanıcı doğrulanıyor...');
        console.log('--------------------------');

        // Kullanıcıyı doğrulanmış yap (eğer zaten değilse)
        user.isPhoneVerified = true;
        user.phoneVerificationCode = null;
        user.phoneVerificationExpires = null;
        await user.save();

        // Token oluştur ve gönder
        const payload = { id: user.id, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            success: true,
            message: 'Telefon başarıyla doğrulandı!',
            token: token
        });
    } catch (error) {
        console.error('Doğrulama sırasında hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});


// === KULLANICI GİRİŞ (HER GİRİŞTE KOD İSTEYECEK ŞEKİLDE GÜNCELLENDİ) ===
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email: email } });

        // 1. Kullanıcı var mı?
        if (!user) {
            return res.status(401).json({ success: false, message: 'Geçersiz e-posta veya şifre.' });
        }

        // 2. Şifre doğru mu?
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Geçersiz e-posta veya şifre.' });
        }

        // 3. Şifre doğruysa, YENİ KOD OLUŞTUR ve GÖNDER (Token GÖNDERME)
        console.log(`Giriş adımı 1 başarılı: ${email}. 2. adım için kod gönderiliyor...`);
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.phoneVerificationCode = newCode;
        user.phoneVerificationExpires = newExpires;
        await user.save(); // Yeni kodu veritabanına kaydet

        await sendWhatsAppCode(user.phone, newCode); // Kodu WhatsApp ile gönder

        // 4. Tarayıcıya "doğrulamaya git" mesajı gönder (Token YOK)
        res.status(200).json({
            success: true,
            message: 'Giriş başarılı! Lütfen 2. adım doğrulama kodunu girin.'
        });

    } catch (error) {
        console.error('Giriş sırasında hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});


// 7. Korumalı Rotalar ve Middleware
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token == null) return res.status(401).json({ success: false, message: 'Token bulunamadı.' });
        jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
            if (err) return res.status(403).json({ success: false, message: 'Geçersiz token.' });
            req.user = userPayload;
            next();
        });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token doğrulamada beklenmedik hata.' });
    }
};

app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        // 1. İstek body'sinden güncellenecek verileri al
        const { firstName, lastName, nationalId } = req.body;

        // 2. Middleware sayesinde token'dan gelen kullanıcıyı bul
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Güncellenecek kullanıcı bulunamadı.' });
        }

        // 3. Kullanıcının alanlarını yeni verilerle güncelle
        user.firstName = firstName;
        user.lastName = lastName;
        user.nationalId = nationalId;

        // 4. Değişiklikleri veritabanına kaydet
        await user.save();

        // 5. Başarılı olduğuna dair bir mesaj gönder
        res.status(200).json({
            success: true,
            message: 'Profil bilgileriniz başarıyla güncellendi.'
        });

    } catch (error) {
        console.error('Profil güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası nedeniyle profil güncellenemedi.' });
    }
});


// 8. Sunucuyu Başlatma
sequelize.sync({ alter: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
        console.log('Veritabanı senkronize edildi (alter: true).');
    });
}).catch(err => {
    console.error('Veritabanı senkronizasyon hatası:', err);
});

