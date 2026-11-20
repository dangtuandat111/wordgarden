import { auth } from '@/auth';
import { db } from './db';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function currentUser() {
  let email: string, name: string;
  if (process.env.LOCAL_MODE === 'true') { email = 'local@wordgarden.local'; name = 'Bạn'; }
  else {
    const session = await auth();
    if (!session?.user?.email) throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.');
    email = session.user.email.toLowerCase(); name = session.user.name || email;
  }
  return db.user.upsert({ where: { email }, update: { name }, create: { email, name, folders: { create: [{ name: 'Everyday English', color: 'sage' }, { name: 'Work & ideas', color: 'peach' }, { name: 'Reading notes', color: 'lavender' }] } } });
}
export function checkOrigin(req: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const origin = req.headers.get('origin');
  const configured = new URL(process.env.AUTH_URL || 'http://localhost:3080').origin;
  if (origin && origin !== configured) throw new HttpError(403, 'Nguồn yêu cầu không hợp lệ.');
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Yêu cầu phải dùng JSON.');
}
