import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100')
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
    const userId = request.nextUrl.searchParams.get('userId')
    const action = request.nextUrl.searchParams.get('action')

    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId
    if (action) where.action = { contains: action }

    const exportCsv = request.nextUrl.searchParams.get('export') === 'csv'

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: exportCsv ? 10000 : limit,
        skip: exportCsv ? 0 : (page - 1) * limit
      }),
      db.activityLog.count({ where })
    ])

    if (exportCsv) {
      const header = 'Timestamp,User,Email,Role,Action,Details\n'
      const rows = logs.map(l => {
        const ts = new Date(l.createdAt).toISOString()
        const name = `"${(l.user?.name ?? 'Unknown').replace(/"/g, '""')}"`
        const email = `"${(l.user?.email ?? '').replace(/"/g, '""')}"`
        const role = l.user?.role ?? l.role ?? ''
        const action = `"${l.action.replace(/"/g, '""')}"`
        const details = `"${(l.details ?? '').replace(/"/g, '""')}"`
        return `${ts},${name},${email},${role},${action},${details}`
      }).join('\n')
      const csv = header + rows
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="activity-logs-${Date.now()}.csv"`
        }
      })
    }

    return NextResponse.json({ logs, total, page, limit })
  } catch (error) {
    console.error('Activity logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
