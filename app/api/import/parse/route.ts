import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  SourceType,
  DataCategory,
  SOURCE_CONFIGS,
  detectCategory,
  detectSource,
} from '@/lib/import/mappers'

interface ParsedRow {
  [key: string]: unknown
}

interface CategoryPreview {
  count: number
  data: ParsedRow[]
  columns: string[]
}

interface ParseResponse {
  preview: Record<DataCategory, CategoryPreview>
  source: SourceType
  warnings: string[]
}

async function detectFileEncoding(text: string): Promise<string> {
  try {
    JSON.stringify(text)
    return 'utf-8'
  } catch {
    return 'latin1'
  }
}

async function parseCSVFile(file: File, fileName: string): Promise<{ headers: string[]; rows: ParsedRow[] }> {
  let text = await file.text()

  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    encoding: 'UTF-8',
  })

  const rows = (result.data || []) as ParsedRow[]
  let headers = result.meta?.fields || Object.keys(rows[0] || {})

  if (!headers || headers.length === 0) {
    headers = Object.keys(rows[0] || {})
  }

  headers = headers.filter(h => h && h.trim() !== '')

  return { headers, rows }
}

async function parseExcelFile(file: File, fileName: string): Promise<{ sheet: string; headers: string[]; rows: ParsedRow[] }[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const sheets: { sheet: string; headers: string[]; rows: ParsedRow[] }[] = []

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

    if (data.length === 0) continue

    const headers = (data[0] as string[])
      .map(h => (h || '').toString().trim())
      .filter(h => h !== '')

    const rows: ParsedRow[] = data.slice(1).map(row => {
      const obj: ParsedRow = {}
      headers.forEach((header, index) => {
        const value = (row as unknown[])[index]
        obj[header] = value === '' || value === null || value === undefined ? '' : String(value).trim()
      })
      return obj
    })

    if (rows.length > 0) {
      sheets.push({ sheet: sheetName, headers, rows })
    }
  }

  return sheets
}

function applyColumnMapping(
  rows: ParsedRow[],
  headers: string[],
  categoryConfig: any,
  source: SourceType
): ParsedRow[] {
  return rows.map(row => {
    const mapped: ParsedRow = {}

    for (const mapping of categoryConfig.columnMappings) {
      const sourceColumns = mapping.sourceColumn.split('|').map((c: string) => c.trim())
      let value: unknown = null

      const matchedHeader = headers.find(h =>
        sourceColumns.some(sc => h.toLowerCase() === sc.toLowerCase() || h.toLowerCase().includes(sc.toLowerCase()))
      )

      if (matchedHeader && row[matchedHeader] !== undefined && row[matchedHeader] !== '') {
        value = row[matchedHeader]
        if (mapping.transform) {
          value = mapping.transform(String(value))
        }
      }

      if (value !== null && value !== undefined && value !== '') {
        mapped[mapping.targetField] = value
      }
    }

    return mapped
  })
}

function generateWarnings(preview: Record<DataCategory, CategoryPreview>): string[] {
  const warnings: string[] = []

  if (preview.clients && preview.clients.count > 0) {
    const missingEmail = preview.clients.data.filter(c => !c.email).length
    if (missingEmail > 0) {
      warnings.push(`${missingEmail} client${missingEmail > 1 ? 's' : ''} sans email`)
    }
  }

  if (preview.devis && preview.devis.count > 0) {
    const missingDate = preview.devis.data.filter(d => !d.date_emission).length
    if (missingDate > 0) {
      warnings.push(`${missingDate} devis sans date`)
    }
    const missingClient = preview.devis.data.filter(d => !d.client_name && !d.client_id).length
    if (missingClient > 0) {
      warnings.push(`${missingClient} devis sans client`)
    }
  }

  if (preview.factures && preview.factures.count > 0) {
    const missingDate = preview.factures.data.filter(f => !f.date_emission).length
    if (missingDate > 0) {
      warnings.push(`${missingDate} facture${missingDate > 1 ? 's' : ''} sans date`)
    }
    const missingClient = preview.factures.data.filter(f => !f.client_name && !f.client_id).length
    if (missingClient > 0) {
      warnings.push(`${missingClient} facture${missingClient > 1 ? 's' : ''} sans client`)
    }
  }

  if (preview.chantiers && preview.chantiers.count > 0) {
    const missingClient = preview.chantiers.data.filter(c => !c.client_name && !c.client_id).length
    if (missingClient > 0) {
      warnings.push(`${missingClient} chantier${missingClient > 1 ? 's' : ''} sans client`)
    }
  }

  return warnings
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await req.formData()
    const source = (formData.get('source') as string) || 'excel'
    const filesArray = formData.getAll('files') as File[]

    if (!filesArray || filesArray.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (!(['obat', 'tolteck', 'batappli', 'henrri', 'excel'].includes(source))) {
      return NextResponse.json({ error: 'Source invalide' }, { status: 400 })
    }

    const sourceConfig = SOURCE_CONFIGS[source as SourceType]
    const preview: Record<DataCategory, CategoryPreview> = {} as Record<DataCategory, CategoryPreview>

    for (const category of Object.keys(sourceConfig.categories) as DataCategory[]) {
      preview[category] = { count: 0, data: [], columns: [] }
    }

    let detectedSource = source as SourceType

    for (const file of filesArray) {
      const fileName = file.name.toLowerCase()

      let parsedSheets: { sheet: string; headers: string[]; rows: ParsedRow[] }[] = []

      if (fileName.endsWith('.csv')) {
        const { headers, rows } = await parseCSVFile(file, fileName)
        detectedSource = detectSource(headers)
        parsedSheets = [{ sheet: file.name, headers, rows }]
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        parsedSheets = await parseExcelFile(file, fileName)
        if (parsedSheets.length > 0) {
          detectedSource = detectSource(parsedSheets[0].headers)
        }
      } else {
        continue
      }

      const config = SOURCE_CONFIGS[detectedSource]

      for (const sheet of parsedSheets) {
        const category = detectCategory(sheet.headers, detectedSource)

        if (!category) {
          continue
        }

        const categoryConfig = config.categories[category]
        if (!categoryConfig) {
          continue
        }

        const mappedRows = applyColumnMapping(sheet.rows, sheet.headers, categoryConfig, detectedSource)

        if (!preview[category].columns || preview[category].columns.length === 0) {
          preview[category].columns = sheet.headers
        }

        preview[category].count += mappedRows.length
        preview[category].data.push(...mappedRows.slice(0, 5 - preview[category].data.length))
      }
    }

    const warnings = generateWarnings(preview)

    return NextResponse.json({
      preview,
      source: detectedSource,
      warnings,
    } as ParseResponse)
  } catch (error) {
    console.error('Parse import error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erreur lors du parsing' },
      { status: 500 }
    )
  }
}
