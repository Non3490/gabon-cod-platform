import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

// GET /api/expense-types - List all expense types
export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const expenseTypes = await db.expenseType.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ expenseTypes })
  } catch (error) {
    console.error('Get expense types error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/expense-types - Create new expense type
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { name, category, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!category || !['CALL_CENTER', 'SOURCING', 'AD_SPEND', 'OTHER'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const expenseType = await db.expenseType.create({
      data: {
        name: name.trim(),
        category,
        description: description?.trim() || null,
        isActive: true
      }
    })

    await logActivity(user.id, user.role, 'EXPENSE_TYPE_CREATED', `Expense type "${name}" created in ${category}`)

    return NextResponse.json({ expenseType }, { status: 201 })
  } catch (error) {
    console.error('Create expense type error:', error)
    return NextResponse.json({ error: 'Failed to create expense type' }, { status: 500 })
  }
}

// PUT /api/expense-types - Update expense type
export async function PUT(request: Request) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, category, description } = body

    if (!id) {
      return NextResponse.json({ error: 'Expense type ID is required' }, { status: 400 })
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const expenseType = await db.expenseType.update({
      where: { id },
      data: {
        name: name.trim(),
        category,
        description: description?.trim() || null
      }
    })

    await logActivity(user.id, user.role, 'EXPENSE_TYPE_UPDATED', `Expense type "${name}" updated`)

    return NextResponse.json({ expenseType })
  } catch (error) {
    console.error('Update expense type error:', error)
    return NextResponse.json({ error: 'Failed to update expense type' }, { status: 500 })
  }
}
