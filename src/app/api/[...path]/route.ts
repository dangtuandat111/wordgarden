import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { checkOrigin, currentUser, HttpError } from '@/lib/user';
import { entrySchema, normalizeTerm, scheduleReview, csvCell } from '@/lib/model';
import { lookupCambridge } from '@/lib/cambridge';
import { dailyPractice, submitPractice } from '@/lib/practice-service';
import { relatedWords } from '@/lib/related';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
async function json(req: Request) {
  if (Number(req.headers.get('content-length') || 0) > 2_000_000) throw new HttpError(413, 'Tệp quá lớn (tối đa 2 MB).');
  const text = await req.text();
  if (text.length > 2_000_000) throw new HttpError(413, 'Tệp quá lớn (tối đa 2 MB).');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'JSON không hợp lệ.'); }
}
async function handle(req: Request, ctx: Context) {
  try {
    const { path } = await ctx.params;
    const [resource, id, action] = path;
    if (resource === 'health' && req.method === 'GET') {
      await db.$queryRaw`SELECT 1`;
      return NextResponse.json({ ok: true });
    }
    checkOrigin(req);
    const user = await currentUser();
    const userId = user.id;
    if (resource === 'practice' && path.length === 1 && req.method === 'POST') {
      const data = z.object({ timezone: z.string().max(100).refine(value => {
        try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
      }) }).strict().parse(await json(req));
      return NextResponse.json(await dailyPractice(userId, data.timezone), { headers: { 'Cache-Control': 'no-store' } });
    }
    if (resource === 'practice' && id && action === 'answer' && path.length === 3 && req.method === 'POST') {
      const data = z.object({ answer: z.string().trim().min(1).max(200) }).strict().parse(await json(req));
      return NextResponse.json(await submitPractice(userId, id, data.answer));
    }
    if (resource === 'entries' && id && action === 'related' && path.length === 3 && req.method === 'GET') {
      const entry = await db.entry.findFirst({ where: { id, userId } });
      if (!entry) throw new HttpError(404, 'Không tìm thấy từ.');
      return NextResponse.json(await relatedWords(userId, entry.term), { headers: { 'Cache-Control': 'no-store' } });
    }
    if (resource === 'reset' && path.length === 1 && req.method === 'POST') {
      if (req.headers.get('origin') !== new URL(process.env.AUTH_URL || 'http://localhost:3080').origin) throw new HttpError(403, 'Nguồn yêu cầu không hợp lệ.');
      z.object({ confirmation: z.literal('RESET WORDGARDEN') }).strict().parse(await json(req));
      // Cascades remove entries, folders and review history atomically. A new user ID
      // on the next visit also invalidates capture tokens issued before this reset.
      await db.user.deleteMany({ where: { id: userId } });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (resource === 'me' && req.method === 'GET') return NextResponse.json({ name: user.name, email: user.email, localMode: process.env.LOCAL_MODE === 'true', cambridgeSync: false });
    if (resource === 'folders') {
      if (req.method === 'GET') return NextResponse.json(await db.folder.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }));
      if (req.method === 'POST') {
        const data = z.object({ name: z.string().trim().min(1).max(80), color: z.enum(['sage', 'peach', 'lavender', 'blue']).default('sage') }).parse(await json(req));
        return NextResponse.json(await db.folder.create({ data: { ...data, userId } }), { status: 201 });
      }
      if (req.method === 'DELETE' && id) {
        await db.folder.deleteMany({ where: { id, userId } });
        return NextResponse.json({ ok: true });
      }
    }
    if (resource === 'lookup' && req.method === 'POST') {
      const data = z.object({ term: z.string().trim().min(1).max(200), vietnamese: z.boolean().default(false) }).parse(await json(req));
      return NextResponse.json(await lookupCambridge(data.term, data.vietnamese));
    }
    if (resource === 'entries') {
      if (req.method === 'GET') return NextResponse.json(await db.entry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }));
      if (req.method === 'DELETE' && id) {
        await db.entry.deleteMany({ where: { id, userId } });
        return NextResponse.json({ ok: true });
      }
      if (req.method === 'POST' && !id) {
        const data = entrySchema.parse(await json(req));
        if (data.folderId && !await db.folder.findFirst({ where: { id: data.folderId, userId } })) throw new HttpError(400, 'Thư mục không tồn tại.');
        const normalizedTerm = normalizeTerm(data.term);
        const existing = await db.entry.findUnique({ where: { userId_normalizedTerm_definition: { userId, normalizedTerm, definition: data.definition } } });
        if (existing) return NextResponse.json({ error: 'Từ với nghĩa này đã được lưu.', entry: existing }, { status: 409 });
        return NextResponse.json(await db.entry.create({ data: { ...data, content: data.content as Prisma.InputJsonValue, normalizedTerm, userId } }), { status: 201 });
      }
      if (req.method === 'PATCH' && id) {
        const body = await json(req);
        const version = z.number().int().positive().parse(body.version);
        const existing = await db.entry.findFirst({ where: { id, userId } });
        if (!existing) throw new HttpError(404, 'Không tìm thấy từ.');
        if (action === 'review') {
          const remembered = z.boolean().parse(body.remembered);
          const result = await db.entry.updateMany({ where: { id, userId, version }, data: { ...scheduleReview(existing.reviewStage, remembered), version: { increment: 1 } } });
          if (!result.count) throw new HttpError(409, 'Mục từ đã thay đổi trên thiết bị khác. Hãy tải lại.');
        } else {
          const data = entrySchema.parse(body);
          if (data.folderId && !await db.folder.findFirst({ where: { id: data.folderId, userId } })) throw new HttpError(400, 'Thư mục không tồn tại.');
          const result = await db.entry.updateMany({ where: { id, userId, version }, data: { ...data, content: data.content as Prisma.InputJsonValue, normalizedTerm: normalizeTerm(data.term), version: { increment: 1 } } });
          if (!result.count) throw new HttpError(409, 'Mục từ đã thay đổi trên thiết bị khác. Hãy tải lại.');
        }
        return NextResponse.json(await db.entry.findUnique({ where: { id } }));
      }
    }
    if (resource === 'export' && req.method === 'GET') {
      const url = new URL(req.url);
      const ids = url.searchParams.get('ids')?.split(',').filter(Boolean);
      const entries = await db.entry.findMany({ where: { userId, ...(ids ? { id: { in: ids } } : {}) }, include: { folder: true }, orderBy: { createdAt: 'desc' } });
      if (url.searchParams.get('format') === 'csv') {
        const rows = [['Từ', 'Từ loại', 'Nghĩa Anh-Anh', 'Nghĩa tiếng Việt', 'Câu gốc', 'Dịch câu', 'Ví dụ 1', 'Dịch ví dụ 1', 'Ví dụ 2', 'Dịch ví dụ 2', 'Thư mục', 'Ghi chú', 'Nguồn nghĩa', 'Link bài đọc', 'Link từ điển', 'Ngày lưu']];
        for (const e of entries) { const c = e.content as Record<string, any>; rows.push([e.term, c.partOfSpeech, e.definition, c.meaningVi, c.sentence, c.sentenceVi, c.examples?.[0]?.en, c.examples?.[0]?.vi, c.examples?.[1]?.en, c.examples?.[1]?.vi, e.folder?.name, c.notes, c.definitionSource, c.sourceUrl, c.dictionaryUrl, e.createdAt.toISOString()].map(x => String(x || ''))); }
        return new Response('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="wordgarden.csv"', 'Cache-Control': 'no-store' } });
      }
      return new Response(JSON.stringify({ format: 'wordgarden', version: 1, exportedAt: new Date(), entries }, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="wordgarden.json"', 'Cache-Control': 'no-store' } });
    }
    if (resource === 'import' && req.method === 'POST') {
      const backup = z.object({ format: z.literal('wordgarden'), version: z.literal(1), entries: z.array(entrySchema.extend({ folder: z.object({ name: z.string().max(80), color: z.string().max(30) }).nullable().optional() })).max(2000) }).parse(await json(req));
      let created = 0, skipped = 0;
      await db.$transaction(async tx => {
        for (const item of backup.entries) {
          let folderId: string | null = null;
          if (item.folder?.name) folderId = (await tx.folder.upsert({ where: { userId_name: { userId, name: item.folder.name } }, create: { userId, name: item.folder.name, color: item.folder.color }, update: {} })).id;
          const data = { term: item.term, definition: item.definition, content: item.content as Prisma.InputJsonValue, folderId, userId, normalizedTerm: normalizeTerm(item.term) };
          const exists = await tx.entry.findUnique({ where: { userId_normalizedTerm_definition: { userId, normalizedTerm: data.normalizedTerm, definition: data.definition } } });
          if (exists) skipped++; else { await tx.entry.create({ data }); created++; }
        }
      }, { timeout: 30000 });
      return NextResponse.json({ created, skipped });
    }
    throw new HttpError(404, 'Không tìm thấy chức năng.');
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Thông tin chưa hợp lệ.', fields: error.flatten() }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Từ/nghĩa hoặc tên thư mục đã tồn tại.' }, { status: 409 });
    console.error('API failure', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'Không xử lý được yêu cầu. Vui lòng thử lại.' }, { status: 500 });
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
