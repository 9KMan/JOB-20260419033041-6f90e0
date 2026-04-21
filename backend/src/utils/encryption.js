const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!';

function encryptData(data) {
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

function decryptData(encryptedData) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

  try {
    return JSON.parse(decryptedString);
  } catch {
    return decryptedString;
  }
}

function hashData(data) {
  return CryptoJS.SHA256(data).toString();
}

function encryptObject(obj, fieldsToEncrypt = []) {
  const encrypted = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (encrypted[field]) {
      encrypted[field] = encryptData(encrypted[field]);
    }
  }

  return encrypted;
}

function decryptObject(obj, fieldsToDecrypt = []) {
  const decrypted = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (decrypted[field]) {
      decrypted[field] = decryptData(decrypted[field]);
    }
  }

  return decrypted;
}

module.exports = {
  encryptData,
  decryptData,
  hashData,
  encryptObject,
  decryptObject
};