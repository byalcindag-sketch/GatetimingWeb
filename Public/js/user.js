const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const User = sequelize.define('User', {
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

    // BU SÜTUNLARIN OLMASI ZORUNLUDUR
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
    // ---

}, {
    // Diğer model seçenekleri
});

module.exports = User;

