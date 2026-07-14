import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let lots = await prisma.materialLot.findMany({
      where: { userId },
      orderBy: { receivedDate: 'desc' }
    });

    // Smart auto-population from active dataset if empty
    if (lots.length === 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.datasetPreview) {
        try {
          const preview = JSON.parse(user.datasetPreview);
          const rows = Array.isArray(preview) ? preview : (preview.rows || []);
          
          const firstRow = rows[0] || {};
          const keys = Object.keys(firstRow).map(k => k.toLowerCase().replace(/[\s_-]+/g, '_'));
          
          const hasSupplier = keys.some(k => k.includes('supplier'));
          const hasLot = keys.some(k => k.includes('lot'));

          if (hasSupplier || hasLot) {
            // Deduplicate by lot code
            const uniqueLotsMap = new Map<string, any>();

            rows.forEach((row: any) => {
              const rKeys = Object.keys(row);
              
              const getStr = (patterns: string[]): string | null => {
                const foundKey = rKeys.find(k => {
                  const nk = k.toLowerCase().replace(/[\s_-]+/g, '_');
                  return patterns.some(p => nk.includes(p));
                });
                return foundKey ? String(row[foundKey]) : null;
              };

              const getNum = (patterns: string[], fallback = 0): number => {
                const foundKey = rKeys.find(k => {
                  const nk = k.toLowerCase().replace(/[\s_-]+/g, '_');
                  return patterns.some(p => nk.includes(p));
                });
                if (!foundKey) return fallback;
                const parsed = Number(row[foundKey]);
                return isNaN(parsed) ? fallback : parsed;
              };

              const rawLotCode = getStr(['material_lot', 'lot_id', 'lot']);
              const lotCode = rawLotCode || `RM-LOT-${Math.floor(Math.random() * 9000) + 1000}`;
              const supplierName = getStr(['supplier', 'vendor']) || 'Supplier A';
              const defectRate = getNum(['defect_rate', 'defects'], 0.02);
              const yieldVal = getNum(['yield'], 95.0);
              const batchId = getStr(['batch_id', 'batch']) || null;
              
              const rawDate = getStr(['date', 'received_date']);
              const dateStr = rawDate || new Date().toISOString().split('T')[0];

              if (!uniqueLotsMap.has(lotCode)) {
                uniqueLotsMap.set(lotCode, {
                  userId,
                  supplierName,
                  lotCode,
                  materialType: 'Base Component',
                  receivedDate: new Date(dateStr),
                  incomingStatus: defectRate > 0.05 ? 'REJECTED' : 'ACCEPTED',
                  defectRate,
                  linkedBatchId: batchId,
                  linkedYield: yieldVal,
                  notes: `Auto-populated from uploaded batch ${batchId || 'N/A'}`
                });
              }
            });

            const toInsert = Array.from(uniqueLotsMap.values()).slice(0, 100);
            if (toInsert.length > 0) {
              await prisma.materialLot.createMany({ data: toInsert });
              lots = await prisma.materialLot.findMany({
                where: { userId },
                orderBy: { receivedDate: 'desc' }
              });
            }
          }
        } catch (err) {
          console.error('Error auto-populating supply chain lots:', err);
        }
      }
    }

    return NextResponse.json({ success: true, lots });
  } catch (error) {
    console.error('Error fetching material lots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const lot = await prisma.materialLot.create({
      data: {
        userId,
        supplierName: body.supplierName || 'Supplier A',
        lotCode: body.lotCode,
        materialType: body.materialType || 'Raw Material',
        receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
        incomingStatus: body.incomingStatus || 'ACCEPTED',
        defectRate: body.defectRate !== undefined ? Number(body.defectRate) : 0.0,
        linkedBatchId: body.linkedBatchId || null,
        linkedYield: body.linkedYield !== undefined ? Number(body.linkedYield) : null,
        notes: body.notes || null,
      }
    });

    return NextResponse.json({ success: true, lot });
  } catch (error) {
    console.error('Error creating material lot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
