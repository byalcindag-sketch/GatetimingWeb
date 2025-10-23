const { Sequelize } = require('sequelize');
const path = require('path');

// Veritabanı bağlantısını oluşturuyoruz.
// 'storage' parametresi, veritabanı dosyasının nerede oluşturulacağını belirtir.
// Projemizin ana dizininde 'gatetiming.sqlite' adında bir dosya oluşturacak.
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'gatetiming.sqlite')
});

// Bağlantıyı test etmek için bir fonksiyon (isteğe bağlı ama faydalı)
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('SQLite veritabanına başarıyla bağlanıldı!');
    } catch (error) {
        console.error('SQLite bağlantı hatası:', error);
    }
}

testConnection();

// sequelize objesini başka dosyalarda kullanabilmek için export ediyoruz.
module.exports = sequelize;