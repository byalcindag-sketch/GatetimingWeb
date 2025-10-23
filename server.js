// 1. Gerekli Paketleri Yükle
require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize');

// 2. Uygulama ve Port Ayarları
const app = express();
const PORT = 3000;

// 3. Middleware (Ara Yazılımlar)
app.use(express.json());
app.use(express.static('public'));

// === VERİTABANI BAĞLANTISI ===
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'gatetiming.sqlite'),
    logging: false
});

// === KULLANICI MODELİ (Genişletilmiş Hali) ===
const User = sequelize.define('User', {
    firstName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nationalId: {
        type: DataTypes.STRING,
        allowNull: true
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
    isEmailVerified: {
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
}, {});


// === API ROTALARI (Authentication, vb.) ===

// ... (app.post('/api/register'), app.post('/api/verify-phone'), app.post('/api/login') rotaları burada olmalı) ...
// Bu rotalarda bir değişiklik yapmadık, olduğu gibi kalabilirler.


// === KORUMALI ROTALAR VE MİDDLEWARE ===
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
        const user = await User.findByPk(req.user.id, {
            attributes: [
                'id', 'email', 'phone', 'isPhoneVerified', 'isEmailVerified',
                'firstName', 'lastName', 'nationalId'
            ]
        });
        if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        res.status(200).json({ success: true, user: user });
    } catch (error) {
        console.error('Profil bilgisi alınırken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// === YENİ VE ÖNEMLİ: KULLANICI PROFİLİNİ GÜNCELLEME ROTASI ===
// Bu bloğun tam olarak burada, get profil rotasının altında olduğundan emin ol.
app.put('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, nationalId } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Güncellenecek kullanıcı bulunamadı.' });
        }
        user.firstName = firstName;
        user.lastName = lastName;
        user.nationalId = nationalId;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Profil bilgileriniz başarıyla güncellendi.'
        });
    } catch (error) {
        console.error('Profil güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası nedeniyle profil güncellenemedi.' });
    }
});

// === SUNUCUYU BAŞLATMA ===
sequelize.sync({ alter: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
        console.log('Veritabanı senkronize edildi (alter: true).');
    });
}).catch(err => {
    console.error('Veritabanı senkronizasyon hatası:', err);
});