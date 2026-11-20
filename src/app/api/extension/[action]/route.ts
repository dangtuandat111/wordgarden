import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser, HttpError } from '@/lib/user';
import { entrySchema, normalizeTerm, safeUrl } from '@/lib/model';
import { createCaptureToken, extensionIdSchema, verifyCaptureToken } from '@/lib/capture-token';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string }> };
async function handle(req: Request, context: Context) {
  try {
    if (process.env.LOCAL_MODE !== 'true') throw new HttpError(403, 'Lưu nhanh đang hỗ trợ bản local. Dùng Mở form để lưu vào tài khoản Google.');
    const extensionId = extensionIdSchema.parse(req.headers.get('x-wordgarden-extension'));
    const origin = req.headers.get('origin');
    if (origin && origin !== `chrome-extension://${extensionId}`) throw new HttpError(403, 'Chỉ extension đã kết nối được dùng chức năng này.');
    const secret = process.env.AUTH_SECRET || '';
    const { action } = await context.params;
    if (action === 'connect' && req.method === 'POST') {
      if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Yêu cầu phải dùng JSON.');
      const user = await currentUser();
      return NextResponse.json({ ...createCaptureToken(user.id, extensionId, secret), folders: await db.folder.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    let userId: string;
    try {
      const raw = req.headers.get('authorization') || '';
      if (!raw.startsWith('Bearer ')) throw new Error('Missing token');
      userId = verifyCaptureToken(raw.slice(7), extensionId, secret).userId;
    } catch { throw new HttpError(401, 'Kết nối đã hết hạn. Mở extension và bấm Kết nối lại.'); }
    if (!await db.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new HttpError(401, 'Dữ liệu đã được reset. Mở extension và bấm Kết nối lại.');
    if (action === 'folders' && req.method === 'GET') return NextResponse.json(await db.folder.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }), { headers: { 'Cache-Control': 'no-store' } });
    if (action !== 'save' || req.method !== 'POST') throw new HttpError(404, 'Không tìm thấy chức năng.');
    if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Yêu cầu phải dùng JSON.');
    const body = await req.text();
    if (body.length > 30000) throw new HttpError(413, 'Nội dung quá dài.');
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { throw new HttpError(400, 'JSON không hợp lệ.'); }
    const input = entrySchema.parse(parsed);
    input.content.sourceUrl = safeUrl(input.content.sourceUrl); input.content.dictionaryUrl = safeUrl(input.content.dictionaryUrl);
    const normalizedTerm = normalizeTerm(input.term);
    const existing = await db.entry.findFirst({ where: { userId, normalizedTerm, ...(input.definition ? { definition: input.definition } : {}) } });
    if (existing) return NextResponse.json({ id: existing.id, duplicate: true, message: 'Từ này đã có trong thư viện.' });
    const folder = input.folderId ? await db.folder.findFirst({ where: { id: input.folderId, userId } }) : null;
    const folderReset = !!input.folderId && !folder;
    try {
      const entry = await db.entry.create({ data: { ...input, folderId: folder?.id || null, content: input.content as Prisma.InputJsonValue, normalizedTerm, userId } });
      return NextResponse.json({ id: entry.id, duplicate: false, folderReset, message: folderReset ? 'Đã lưu vào Chưa phân loại (thư mục cũ đã bị xóa).' : 'Đã lưu từ và câu gốc.' }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ duplicate: true, message: 'Từ này đã có trong thư viện.' });
      throw error;
    }
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Thông tin lưu từ hoặc kết nối chưa hợp lệ.' }, { status: 400 });
    console.error('Capture failure', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'Không lưu được từ. Hãy kiểm tra Docker rồi thử lại.' }, { status: 500 });
  }
}
export { handle as GET, handle as POST };
