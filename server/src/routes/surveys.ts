import { Router, Request, Response } from 'express';
import { PrismaClient, QuestionType } from '@prisma/client';
import { authMiddleware } from './auth';
import { z } from 'zod';

const prisma = new PrismaClient();
export const router = Router();

const optionSchema = z.object({ text: z.string(), code: z.string().optional(), value: z.number().optional(), isExclusive: z.boolean().optional(), order: z.number().int() });
const openItemSchema = z.object({ label: z.string(), code: z.string().optional(), order: z.number().int() });
const surveyCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(z.object({
    text: z.string().min(1),
    type: z.nativeEnum(QuestionType),
    order: z.number().int().nonnegative(),
    isRequired: z.boolean().optional(),
    config: z.any().optional(),
    options: z.array(optionSchema).optional().default([]),
    openItems: z.array(openItemSchema).optional().default([])
  })).min(1)
});

router.post('/', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  const parsed = surveyCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { title, description, questions } = parsed.data;
  try {
    const survey = await prisma.survey.create({
      data: {
        title, description,
        questions: {
          create: questions.map((q: any) => {
            const options = Array.isArray(q.options) && q.options.length > 0
              ? { create: q.options.map((o: any) => ({ text: o.text, code: o.code, value: o.value, isExclusive: o.isExclusive ?? false, order: o.order })) }
              : undefined;
            const openItems = Array.isArray(q.openItems) && q.openItems.length > 0
              ? { create: q.openItems.map((oi: any) => ({ label: oi.label, code: oi.code, order: oi.order })) }
              : undefined;
            return {
              text: q.text,
              type: q.type,
              order: q.order,
              isRequired: q.isRequired ?? false,
              config: q.config,
              options,
              openItems
            };
          })
        }
      },
      include: { questions: { include: { options: true, openItems: true } } }
    });
    res.status(201).json(survey);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  const surveys = await prisma.survey.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(surveys);
});

router.get('/:id', async (req: Request, res: Response) => {
  const survey = await prisma.survey.findUnique({ where: { id: req.params.id }, include: { questions: { include: { options: true, openItems: true } } } });
  if (!survey) return res.status(404).json({ error: 'Not found' });
  res.json(survey);
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  const status = req.body.status as string;
  if (!['DRAFT','ACTIVE','CLOSED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const updated = await prisma.survey.update({ where: { id: req.params.id }, data: { status } });
    res.json(updated);
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

// Delete survey (ADMIN) - cascades manually
router.delete('/:id', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    // Delete answers/responses first due to relations
  const questionIds = (await prisma.question.findMany({ where: { surveyId: id }, select: { id: true } })).map((q: { id: string }) => q.id);
  const responseIds = (await prisma.response.findMany({ where: { surveyId: id }, select: { id: true } })).map((r: { id: string }) => r.id);
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.response.deleteMany({ where: { id: { in: responseIds } } }),
      prisma.option.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.openItem.deleteMany({ where: { questionId: { in: questionIds } } }),
      prisma.question.deleteMany({ where: { surveyId: id } }),
      prisma.survey.delete({ where: { id } })
    ]);
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(404).json({ error: 'Not found or failed delete' });
  }
});

// Clone survey (ADMIN)
router.post('/:id/clone', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const original = await prisma.survey.findUnique({ where: { id }, include: { questions: { include: { options: true, openItems: true } } } });
  if (!original) return res.status(404).json({ error: 'Not found' });
  const cloned = await prisma.survey.create({
    data: {
      title: original.title + ' (Copy)',
      description: original.description,
      status: 'DRAFT',
      questions: {
  create: original.questions.map((q: any) => ({
          text: q.text,
          type: q.type,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config,
      options: q.options.length ? { create: q.options.map((o: any) => ({ text: o.text, code: o.code, value: o.value, isExclusive: o.isExclusive, order: o.order })) } : undefined,
      openItems: q.openItems.length ? { create: q.openItems.map((oi: any) => ({ label: oi.label, code: oi.code, order: oi.order })) } : undefined
        }))
      }
    },
    include: { questions: { include: { options: true, openItems: true } } }
  });
  res.status(201).json(cloned);
});

// Export JSON (aggregate + survey meta)
router.get('/:id/export.json', async (req: Request, res: Response) => {
  const id = req.params.id;
  const survey = await prisma.survey.findUnique({ where: { id }, include: { questions: { include: { options: true, openItems: true } }, responses: { include: { answers: true, user: true } } } });
  if (!survey) return res.status(404).json({ error: 'Not found' });
  // Basic aggregate similar to responses route
  const result: Record<string, any> = {};
  for (const q of survey.questions) {
    const ans = survey.responses.flatMap((r: any) => r.answers.filter((a: any) => a.questionId === q.id));
    if (q.type === 'SINGLE_CHOICE') {
      const counts: Record<string, number> = {};
  ans.forEach((a: any) => { const idOpt = (a.payload as any).optionId; counts[idOpt] = (counts[idOpt] || 0) + 1; });
      result[q.id] = { counts };
    } else if (q.type === 'MULTI_CHOICE') {
      const counts: Record<string, number> = {};
  ans.forEach((a: any) => { ((a.payload as any).optionIds || []).forEach((oid: string) => { counts[oid] = (counts[oid] || 0) + 1; }); });
      result[q.id] = { counts };
    } else if (q.type === 'OPEN_END_TEXT') {
  result[q.id] = { texts: ans.map((a: any) => (a.payload as any).text) };
    } else if (q.type === 'OPEN_END_NUMERIC') {
  const values = ans.map((a: any) => (a.payload as any).value).filter((v: any) => typeof v === 'number');
      result[q.id] = { count: values.length, avg: values.reduce((s: number, v: number) => s + v, 0) / (values.length || 1) };
    } else if (q.type === 'MULTI_OPEN_END') {
      const items: Record<string, string[]> = {};
  ans.forEach((a: any) => { ((a.payload as any).items || []).forEach((it: any) => { if (!items[it.openItemId]) items[it.openItemId] = []; items[it.openItemId].push(it.text); }); });
      result[q.id] = { items };
    } else if (q.type === 'RANKING') {
      const tallies: Record<string, Record<number, number>> = {};
  ans.forEach((a: any) => { ((a.payload as any).rankings || []).forEach((r: any) => { if (!tallies[r.optionId]) tallies[r.optionId] = {}; tallies[r.optionId][r.rank] = (tallies[r.optionId][r.rank] || 0) + 1; }); });
      result[q.id] = { rankings: tallies };
    }
  }
  res.json({ survey: { id: survey.id, title: survey.title, description: survey.description }, aggregate: result });
});

// Export CSV of flattened answers
router.get('/:id/export.csv', async (req: Request, res: Response) => {
  const id = req.params.id;
  const survey = await prisma.survey.findUnique({ where: { id }, include: { questions: true, responses: { include: { answers: true } } } });
  if (!survey) return res.status(404).json({ error: 'Not found' });
  const headers = ['responseId','userId','questionId','questionText','type','value'];
  const rows: string[] = [headers.join(',')];
  const questionMap = new Map(survey.questions.map((q: any) => [q.id, q]));
  for (const response of survey.responses) {
    for (const ans of response.answers) {
      const q = questionMap.get(ans.questionId)!;
      let value: string;
      const payload: any = ans.payload;
      switch (q.type) {
        case 'SINGLE_CHOICE': value = payload.optionId; break;
        case 'MULTI_CHOICE': value = (payload.optionIds || []).join('|'); break;
        case 'OPEN_END_TEXT': value = JSON.stringify(payload.text || ''); break;
        case 'OPEN_END_NUMERIC': value = String(payload.value ?? ''); break;
        case 'MULTI_OPEN_END': value = JSON.stringify(payload.items || []); break;
        case 'RANKING': value = JSON.stringify(payload.rankings || []); break;
        default: value = '';
      }
      const row = [response.id, response.userId || '', q.id, JSON.stringify(q.text), q.type, JSON.stringify(value)].map(v => String(v).replace(/\n/g,' '));
      rows.push(row.join(','));
    }
  }
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=survey-${id}.csv`);
  res.send(rows.join('\n'));
});
