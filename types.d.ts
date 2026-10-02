// src/types.d.ts
declare module 'multer';
declare module 'streamifier';


// // src/types.d.ts

// declare module 'multer' {
//   export function diskStorage(options: any): any;
//   export function memoryStorage(): any;
//   export const multer: any;
//   export default multer;
// }

// declare module 'streamifier' {
//   export function createReadStream(buffer: Buffer): any;
//   export const streamifier: any;
//   export default streamifier;
// }

// // Global Express.Multer namespace fallback if missing
// declare namespace Express {
//   namespace Multer {
//     interface File {
//       fieldname: string;
//       originalname: string;
//       encoding: string;
//       mimetype: string;
//       size: number;
//       destination: string;
//       filename: string;
//       path: string;
//       buffer: Buffer;
//     }
//   }
// }