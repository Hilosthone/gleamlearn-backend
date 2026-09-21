// import * as admin from 'firebase-admin';
// import { Injectable } from '@nestjs/common';

// @Injectable()
// public class FirebaseService {
//   private firebaseApp: admin.app.App;

//   constructor() {
//     if (!admin.apps.length) {
//       this.firebaseApp = admin.initializeApp({
//         credential: admin.credential.cert({
//           projectId: process.env.FIREBASE_PROJECT_ID,
//           clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//           privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//         }),
//       });
//     } else {
//       this.firebaseApp = admin.app();
//     }
//   }

//   async sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>) {
//     const message = {
//       token,
//       notification: { title, body },
//       data: data || {},
//     };

//     try {
//       await admin.messaging().send(message);
//       return { success: true };
//     } catch (error) {
//       console.error('Error sending Firebase push notification:', error);
//       return { success: false, error };
//     }
//   }
// }