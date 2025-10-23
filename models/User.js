const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection'); // Az önce oluşturduğumuz bağlantı dosyasını import ediyoruz.

// 'User' modelini (veritabanı tablosunu) tanımlıyoruz.
const User = sequelize.define('User', {
    // Model attributes are defined here
    email: {
        type: DataTypes.STRING,
        allowNull: false, // Bu alan boş bırakılamaz
        unique: true // Her email adresi benzersiz olmalı
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Her telefon numarası benzersiz olmalı
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    // Diğer model seçenekleri
    // timestamps: false // createdAt ve updatedAt sütunlarını istemiyorsanız
});

module.exports = User;