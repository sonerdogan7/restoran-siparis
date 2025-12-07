const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Kullanici olusturma (admin tarafindan)
exports.createUser = functions.https.onCall(async (data, context) => {
  // Yetki kontrolu - sadece authenticated kullanicilar
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Giris yapmaniz gerekiyor');
  }

  const { email, password, name, roles, businessId, isActive } = data;

  // Gerekli alanlari kontrol et
  if (!email || !password || !name || !roles || !businessId) {
    throw new functions.https.HttpsError('invalid-argument', 'Eksik bilgi');
  }

  // Cagiran kullanicinin yetkisini kontrol et
  const callerUid = context.auth.uid;

  // SuperAdmin mi?
  const systemUserDoc = await admin.firestore().doc(`systemUsers/${callerUid}`).get();
  const isSuperAdmin = systemUserDoc.exists && systemUserDoc.data().roles.includes('superadmin');

  // Business Admin mi?
  const businessUserDoc = await admin.firestore().doc(`businesses/${businessId}/users/${callerUid}`).get();
  const isBusinessAdmin = businessUserDoc.exists && businessUserDoc.data().roles.includes('admin');

  if (!isSuperAdmin && !isBusinessAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Bu islemi yapmaya yetkiniz yok');
  }

  try {
    // Firebase Auth'da kullanici olustur
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name
    });

    // Firestore'a kullanici bilgilerini kaydet
    await admin.firestore().doc(`businesses/${businessId}/users/${userRecord.uid}`).set({
      email,
      name,
      roles,
      businessId,
      isActive: isActive !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: callerUid
    });

    return {
      success: true,
      uid: userRecord.uid,
      message: 'Kullanici olusturuldu'
    };
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Bu e-posta adresi zaten kullaniliyor');
    }
    throw new functions.https.HttpsError('internal', 'Kullanici olusturulamadi');
  }
});

// Kullanici silme
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Giris yapmaniz gerekiyor');
  }

  const { userId, businessId } = data;

  if (!userId || !businessId) {
    throw new functions.https.HttpsError('invalid-argument', 'Eksik bilgi');
  }

  // Yetki kontrolu
  const callerUid = context.auth.uid;

  const systemUserDoc = await admin.firestore().doc(`systemUsers/${callerUid}`).get();
  const isSuperAdmin = systemUserDoc.exists && systemUserDoc.data().roles.includes('superadmin');

  const businessUserDoc = await admin.firestore().doc(`businesses/${businessId}/users/${callerUid}`).get();
  const isBusinessAdmin = businessUserDoc.exists && businessUserDoc.data().roles.includes('admin');

  if (!isSuperAdmin && !isBusinessAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Bu islemi yapmaya yetkiniz yok');
  }

  // Kendini silemez
  if (userId === callerUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Kendinizi silemezsiniz');
  }

  try {
    // Firebase Auth'dan sil
    await admin.auth().deleteUser(userId);

    // Firestore'dan sil
    await admin.firestore().doc(`businesses/${businessId}/users/${userId}`).delete();

    return { success: true, message: 'Kullanici silindi' };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError('internal', 'Kullanici silinemedi');
  }
});

// Kullanici sifresini guncelle
exports.updateUserPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Giris yapmaniz gerekiyor');
  }

  const { userId, businessId, newPassword } = data;

  if (!userId || !businessId || !newPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'Eksik bilgi');
  }

  // Yetki kontrolu
  const callerUid = context.auth.uid;

  const systemUserDoc = await admin.firestore().doc(`systemUsers/${callerUid}`).get();
  const isSuperAdmin = systemUserDoc.exists && systemUserDoc.data().roles.includes('superadmin');

  const businessUserDoc = await admin.firestore().doc(`businesses/${businessId}/users/${callerUid}`).get();
  const isBusinessAdmin = businessUserDoc.exists && businessUserDoc.data().roles.includes('admin');

  // Kendi sifresini degistirebilir
  const isSelf = userId === callerUid;

  if (!isSuperAdmin && !isBusinessAdmin && !isSelf) {
    throw new functions.https.HttpsError('permission-denied', 'Bu islemi yapmaya yetkiniz yok');
  }

  try {
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    return { success: true, message: 'Sifre guncellendi' };
  } catch (error) {
    console.error('Error updating password:', error);
    throw new functions.https.HttpsError('internal', 'Sifre guncellenemedi');
  }
});

// Isletme icin admin kullanici olustur (superadmin tarafindan)
exports.createBusinessWithAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Giris yapmaniz gerekiyor');
  }

  // Sadece superadmin
  const callerUid = context.auth.uid;
  const systemUserDoc = await admin.firestore().doc(`systemUsers/${callerUid}`).get();

  if (!systemUserDoc.exists || !systemUserDoc.data().roles.includes('superadmin')) {
    throw new functions.https.HttpsError('permission-denied', 'Bu islemi yapmaya yetkiniz yok');
  }

  const {
    businessName,
    businessSlug,
    businessAddress,
    businessPhone,
    tableCount,
    adminEmail,
    adminPassword,
    adminName
  } = data;

  if (!businessName || !businessSlug || !adminEmail || !adminPassword || !adminName) {
    throw new functions.https.HttpsError('invalid-argument', 'Eksik bilgi');
  }

  try {
    // Isletmeyi olustur
    const businessRef = await admin.firestore().collection('businesses').add({
      name: businessName,
      slug: businessSlug,
      address: businessAddress || '',
      phone: businessPhone || '',
      tableCount: tableCount || 20,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      subscription: {
        plan: 'free',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    // Admin kullaniciyi Firebase Auth'da olustur
    const userRecord = await admin.auth().createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName
    });

    // Admin kullaniciyi Firestore'a kaydet
    await admin.firestore().doc(`businesses/${businessRef.id}/users/${userRecord.uid}`).set({
      email: adminEmail,
      name: adminName,
      roles: ['admin'],
      businessId: businessRef.id,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: callerUid
    });

    // Masalari olustur
    const batch = admin.firestore().batch();
    for (let i = 1; i <= (tableCount || 20); i++) {
      const tableRef = admin.firestore().doc(`businesses/${businessRef.id}/tables/table-${i}`);
      batch.set(tableRef, {
        number: i,
        status: 'empty',
        guestCount: 0
      });
    }
    await batch.commit();

    return {
      success: true,
      businessId: businessRef.id,
      adminUid: userRecord.uid,
      message: 'Isletme ve admin olusturuldu'
    };
  } catch (error) {
    console.error('Error creating business:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Bu e-posta adresi zaten kullaniliyor');
    }
    throw new functions.https.HttpsError('internal', 'Isletme olusturulamadi');
  }
});
